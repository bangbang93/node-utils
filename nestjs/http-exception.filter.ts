import {ArgumentsHost, Catch, ExceptionFilter, Inject, OnModuleInit} from '@nestjs/common'
import {ConfigService} from '@nestjs/config'
import {stdSerializers} from 'bunyan'
import {Request, Response} from 'express'
import {omit, pick} from 'lodash'
import {InjectLogger} from 'nestjs-bunyan'
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

    if (this.env?.toLowerCase() !== 'production') {
      res.status(status)
        .json({
          ...pick(err, 'message', 'name', 'stack'),
          ...err,
        })
    } else {
      res.status(status)
        .json({
          ...pick(err, 'message', 'name'),
          ...omit(err, 'stack'),
        })
    }
  }
}
