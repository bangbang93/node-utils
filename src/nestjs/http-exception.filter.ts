import {createError, ServiceError} from '@bangbang93/service-errors'
import {ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Inject, Logger} from '@nestjs/common'
import {ConfigService} from '@nestjs/config'
import {plainToInstance} from 'class-transformer'
import {Request, Response} from 'express'
import stringify from 'json-stringify-safe'
import {redactForLog} from './log-redactor'

const STATUS_ERROR_CODE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'COMMON_INVALID_PARAMETER',
  [HttpStatus.UNAUTHORIZED]: 'COMMON_NEED_LOGIN',
  [HttpStatus.FORBIDDEN]: 'COMMON_PERMISSION_DENIED',
  [HttpStatus.NOT_FOUND]: 'COMMON_NO_SUCH_OBJECT',
  [HttpStatus.CONFLICT]: 'COMMON_ALREADY_EXISTS',
}


@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)
  private readonly isProduction: boolean

  constructor(
    @Inject(ConfigService) configServiceOrEnv?: ConfigService | string,
  ) {
    const env = typeof configServiceOrEnv === 'string'
      ? configServiceOrEnv
      : configServiceOrEnv?.get<string>('NODE_ENV', 'development')
    this.isProduction = env?.toLowerCase() === 'production'
  }

  public catch(err: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest<Request>()
    const res = ctx.getResponse<Response>()

    const serviceError = this.toServiceError(err)
    const status = serviceError.httpCode ?? HttpStatus.INTERNAL_SERVER_ERROR

    const log = {
      err: serviceError,
      reqId: req.id,
      req: redactForLog({
        method: req.method,
        url: req.originalUrl || req.url,
        remoteAddress: req.socket.remoteAddress,
        remotePort: req.socket.remotePort,
        body: req.body as unknown,
      }),
    }
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR.valueOf()) {
      this.logger.error(log)
    } else {
      this.logger.warn(log)
    }

    if (res.headersSent) return

    res.status(status)
      .type('json')
      .end(stringify(this.getResponseBody(serviceError)))
  }

  private toServiceError(err: Error): ServiceError {
    if (ServiceError.isServiceError(err)) return err
    if (err instanceof HttpException) {
      const status = err.getStatus()
      return new ServiceError(STATUS_ERROR_CODE[status] ?? 'COMMON_UNKNOWN', getPublicMessage(err), {
        httpCode: status,
      })
    }
    if (err['code'] === 2 && typeof err['details'] === 'string') {
      // gRPC 客户端抛出的错误：details 是上游序列化的 ServiceError 或一段描述文本
      try {
        const json = JSON.parse(err['details']) as object
        if (json['$isServiceError']) {
          return plainToInstance(ServiceError, json)
        }
        return createError.COMMON_UNKNOWN(json['message'] as string, {causedBy: err})
      } catch {
        return createError.COMMON_UNKNOWN(err['details'], {causedBy: err})
      }
    }
    return ServiceError.fromError(err)
  }

  private getResponseBody(err: ServiceError): Record<string, unknown> {
    const body = err.toJSON()
    if (!this.isProduction) return body
    delete body.stack
    delete body.cause
    // ServiceError 的 message 是「自身消息: cause 消息」的拼接，带 cause 即含内部细节
    if (err.cause !== undefined && err.cause !== null) body.message = '未知错误'
    return body
  }
}

function getPublicMessage(err: HttpException): string {
  const response = err.getResponse()
  if (typeof response === 'string') return response
  const message = (response as {message?: unknown}).message
  if (typeof message === 'string') return message
  if (Array.isArray(message)) return message.join('；')
  return err.message
}

declare module 'http' {
  interface IncomingMessage {
    id: string
  }
}
