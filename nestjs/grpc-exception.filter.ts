import {createError, ServiceError} from '@bangbang93/service-errors'
import {Metadata, ServerUnaryCall} from '@grpc/grpc-js'
import {ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger} from '@nestjs/common'
import {RpcException} from '@nestjs/microservices'
import {plainToInstance} from 'class-transformer'
import {hostname} from 'os'
import {Observable, throwError} from 'rxjs'

/**
 * GRPC异常过滤器
 */
@Catch()
export class GrpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GrpcExceptionFilter.name)

  public catch(err: Error, host: ArgumentsHost): Observable<Error> {
    const [data, reqMetadata, call] = host.getArgs() as [unknown, Metadata, ServerUnaryCall<unknown, unknown>]
    try {
      const metadata = new Metadata()
      metadata.set('x-req-node', hostname())

      if (err instanceof ServiceError) {
        this.logger.error({
          err,
          message: err.message,
          stack: err.stack,
          data,
          client: call?.getPeer(),
          metadata: reqMetadata,
        })
        return throwError(() => ({
          message: JSON.stringify(err),
          metadata,
        }))
      } else if (err instanceof RpcException) {
        const error = err.getError() as string | Error
        if (typeof error === 'string') {
          return this.catch(createError.COMMON_UNKNOWN(error), host)
        } else {
          return this.catch(error, host)
        }
      } else if (err['code'] === 2 && err['details']) {
        // is nested rpc error
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
      } else {
        let serviceError: ServiceError
        if (err instanceof HttpException) {
          serviceError = new ServiceError('COMMON_UNKNOWN',
            err.message,
            {
              causedBy: err,
              httpCode: err.getStatus(),
            })
        } else {
          serviceError = ServiceError.fromError(err)
        }
        return this.catch(serviceError, host)
      }
    } catch (err) {
      const serviceError = ServiceError.fromError(err as Error)
      return this.catch(serviceError, host)
    }
  }
}
