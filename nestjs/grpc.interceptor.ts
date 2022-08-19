import {Metadata, ServerUnaryCall} from '@grpc/grpc-js'
import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common'
import * as Logger from 'bunyan'
import {first} from 'lodash'
import {InjectLogger} from 'nestjs-bunyan'
import {hostname} from 'os'
import {noop, Observable} from 'rxjs'
import {share, toArray} from 'rxjs/operators'

@Injectable()
export class GrpcInterceptor implements NestInterceptor {
  @InjectLogger() private readonly logger!: Logger

  public intercept(context: ExecutionContext, next: CallHandler): Observable<any> | Promise<Observable<any>> {
    if (context.getType() !== 'rpc') {
      return next.handle()
    }
    const [data, reqMetadata, call] = context.getArgs() as [unknown, Metadata, ServerUnaryCall<unknown, unknown>]
    const start = new Date()
    const metadata = new Metadata()
    metadata.set('x-req-node', hostname())
    const reqId = first(reqMetadata.get('x-request-id'))
    const reqNode = first(reqMetadata.get('x-req-node'))
    reqId && metadata.set('x-request-id', reqId)
    call.sendMetadata(metadata)
    const handler = `${context.getClass().name}.${context.getHandler().name}`
    const res$ = next.handle()
    if (this.logger.trace()) {
      const clone$ = res$.pipe(share())
      clone$.pipe(
        toArray(),
      )
        .subscribe({
          next: (res) => {
            const end = new Date()
            const duration = end.valueOf() - start.valueOf()
            this.logger.trace({start, end, duration, data, metadata: {req: reqMetadata, res: metadata}, res, handler})
            this.logger.info({handler, duration, reqNode})
          },
          error: noop
        })
    } else {
      res$.subscribe({
        complete: () => {
          const end = new Date()
          const duration = end.valueOf() - start.valueOf()
          this.logger.info({handler, duration, reqNode})
        },
        error: noop
      })
    }
    return res$
  }
}
