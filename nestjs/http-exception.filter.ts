import {ArgumentsHost, Catch, ExceptionFilter, HttpException, Inject, OnModuleInit} from '@nestjs/common'
import {ConfigService} from '@nestjs/config'
import {stdSerializers} from 'bunyan'
import {Request, Response} from 'express'
import * as stringify from 'json-stringify-safe'
import {omit, pick} from 'lodash'
import {InjectLogger} from 'nestjs-bunyan'
import {VError} from 'verror'
import Logger = require('bunyan')

@Catch()
export class HttpExceptionFilter implements ExceptionFilter, OnModuleInit {
  @InjectLogger() private readonly logger: Logger
  private readonly env: string
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

    const status = err['status'] ?? 500
    if (status === 500) {
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

    let resp: string
    if (err instanceof HttpException) {
      const r = err.getResponse()
      if (typeof r === 'string') {
        resp = r
      } else if (r instanceof Error) {
        resp = this.getResponse(r)
      } else {
        resp = stringify({
          ...pick(err, 'message', 'name', 'stack'),
          ...r,
        })
      }
    } else {
      resp = this.getResponse(err)
    }

    res.status(status)
      .type('json')
      .end(resp)
  }

  private getResponse(err: Error): string {
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
        })
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
        })
      }
    }
  }
}
