import {createError, ServiceError} from '@bangbang93/service-errors'
import {ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Inject, OnModuleInit} from '@nestjs/common'
import {ConfigService} from '@nestjs/config'
import {stdSerializers} from 'bunyan'
import {plainToInstance} from 'class-transformer'
import {Request, Response} from 'express'
import stringify from 'json-stringify-safe'
import {omit, pick} from 'lodash'
import {InjectLogger} from 'nestjs-bunyan'
import {VError} from 'verror'
import Logger = require('bunyan')

@Catch()
export class HttpExceptionFilter implements ExceptionFilter, OnModuleInit {
  @InjectLogger() private readonly logger!: Logger
  private readonly env: string | undefined
  constructor(
  @Inject(ConfigService) configServiceOrEnv?: ConfigService | string
  ) {
    if (configServiceOrEnv) {
      if (typeof configServiceOrEnv === 'string') {
        this.env = configServiceOrEnv
      } else {
        this.env = configServiceOrEnv.get<string>('NODE_ENV', 'development')
      }
    }
  }

  public onModuleInit(): void {
    this.logger.addSerializers(stdSerializers)
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

    if (err['code'] === 2 && err['details']) {
      try {
        const json = JSON.parse(err['details'])
        if (json.$isServiceError) {
          err = plainToInstance(ServiceError, json as object)
        } else {
          err = createError.COMMON_UNKNOWN(json.message, {causedBy: err})
        }
      } catch (e) {
        return this.catch(createError.COMMON_UNKNOWN(err['details'], {causedBy: err}), host)
      }
      return this.catch(err, host)
    }

    if (!(err instanceof ServiceError)) {
      const childError = ServiceError.fromError(err)
      return this.catch(childError, host)
    }

    const resp = this.getResponse(err)
    const status = this.getHttpCode(err)
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error({
        err,
        reqId: req['id'],
        req: {
          method: req.method,
          url: req.originalUrl || req.url,
          remoteAddress: req.socket.remoteAddress,
          remotePort: req.socket.remotePort,
          body: req.body,
        },
      })
    } else {
      this.logger.debug({
        err,
        reqId: req['id'],
        req: {
          method: req.method,
          url: req.originalUrl || req.url,
          remoteAddress: req.socket.remoteAddress,
          remotePort: req.socket.remotePort,
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
      return err['httpCode'] ?? err['status'] ?? err['statusCode'] ?? HttpStatus.INTERNAL_SERVER_ERROR
    }
  }
}

function omitStack(key: string, value: unknown): unknown {
  if (key === 'stack') return undefined
  return value
}
