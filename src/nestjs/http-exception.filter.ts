import {createError, ServiceError} from '@bangbang93/service-errors'
import {ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Inject, Logger} from '@nestjs/common'
import {ConfigService} from '@nestjs/config'
import {plainToInstance} from 'class-transformer'
import {Request, Response} from 'express'
import stringify from 'json-stringify-safe'
import {omit, pick} from 'lodash'
import {VError} from 'verror'


@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)
  private readonly env: string | undefined
  constructor(
  @Inject(ConfigService) configServiceOrEnv?: ConfigService | string,
  ) {
    if (configServiceOrEnv) {
      if (typeof configServiceOrEnv === 'string') {
        this.env = configServiceOrEnv
      } else {
        this.env = configServiceOrEnv.get<string>('NODE_ENV', 'development')
      }
    }
  }

  public catch(err: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest<Request>()
    const res = ctx.getResponse<Response>()

    if (err instanceof HttpException) {
      const data = err.getResponse()
      const childError = new ServiceError('COMMON_UNKNOWN', '未知错误', {
        httpCode: err.getStatus(),
        causedBy: err,
        ...typeof data === 'string' ? {} : data,
      })
      return this.catch(childError, host)
    }

    if (err['code'] === 2 && typeof err['details'] === 'string') {
      try {
        const json = JSON.parse(err['details']) as object
        if (json['$isServiceError']) {
          err = plainToInstance(ServiceError, json)
        } else {
          err = createError.COMMON_UNKNOWN(json['message'] as string, {causedBy: err})
        }
      } catch {
        return this.catch(createError.COMMON_UNKNOWN(err['details'] as string, {causedBy: err}), host)
      }
      return this.catch(err, host)
    }

    if (!(err instanceof ServiceError)) {
      const childError = ServiceError.fromError(err)
      return this.catch(childError, host)
    }

    const resp = this.getResponse(err)
    const status = this.getHttpCode(err)
    if (status === HttpStatus.INTERNAL_SERVER_ERROR.valueOf()) {
      this.logger.error({
        err,
        reqId: req.id,
        req: {
          method: req.method,
          url: req.originalUrl || req.url,
          remoteAddress: req.socket.remoteAddress,
          remotePort: req.socket.remotePort,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          body: req.body,
        },
      })
    } else {
      this.logger.debug({
        err,
        reqId: req.id,
        req: {
          method: req.method,
          url: req.originalUrl || req.url,
          remoteAddress: req.socket.remoteAddress,
          remotePort: req.socket.remotePort,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          body: req.body,
        },
      })
    }

    if (res.headersSent) return

    res.status(status)
      .type('json')
      .end(resp)
  }

  private getResponse(err: Error): string {
    if (err instanceof ServiceError) {
      const data = err.toJSON()
      if (this.env?.toLowerCase() !== 'production') {
        return stringify(data)
      } else {
        return stringify(data, omitStack)
      }
    }
    if (err instanceof VError) {
      const info = VError.info(err)
      if (this.env?.toLowerCase() !== 'production') {
        return stringify({
          ...pick(err, 'message', 'name', 'stack'),
          ...info,
        })
      } else {
        return stringify({
          ...pick(err, 'message', 'name'),
          ...info,
        }, omitStack)
      }
    } else {
      if (this.env?.toLowerCase() !== 'production') {
        return stringify({
          ...pick(err, 'message', 'name', 'stack'),
          ...err,
        })
      } else {
        return stringify({
          ...pick(err, 'message', 'name'),
          ...omit(err, 'stack'),
        }, omitStack)
      }
    }
  }

  private getHttpCode(err: Error): number {
    if (err instanceof ServiceError) {
      return err.httpCode ?? HttpStatus.INTERNAL_SERVER_ERROR
    } else if (err instanceof HttpException) {
      return err.getStatus()
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return err['httpCode'] ?? err['status'] ?? err['statusCode'] ?? HttpStatus.INTERNAL_SERVER_ERROR
    }
  }
}

function omitStack(key: string, value: unknown): unknown {
  if (key === 'stack') return undefined
  return value
}
declare module 'http' {
  interface IncomingMessage {
    id: string;
  }
}
