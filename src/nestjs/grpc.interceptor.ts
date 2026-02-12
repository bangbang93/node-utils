import {Metadata, ServerUnaryCall} from '@grpc/grpc-js'
import {CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor} from '@nestjs/common'
import {first} from 'lodash'
import {hostname} from 'os'
import {Observable} from 'rxjs'
import {share, toArray} from 'rxjs/operators'
import {inspect} from 'util'

@Injectable()
export class GrpcInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GrpcInterceptor.name)

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> | Promise<Observable<unknown>> {
    if (context.getType() !== 'rpc') {
      return next.handle()
    }
    const [data, reqMetadata, call] = context.getArgs<[unknown, Metadata, ServerUnaryCall<unknown, unknown>]>()
    const start = new Date()
    const metadata = new Metadata()
    metadata.set('x-req-node', hostname())
    const reqId = first(reqMetadata.get('x-request-id'))
    const reqNode = first(reqMetadata.get('x-req-node'))
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    reqId && metadata.set('x-request-id', reqId)
    const handler = `${context.getClass().name}.${context.getHandler().name}`
    const res$ = next.handle()
      .pipe(
        share(),
      )
    res$.pipe(
      toArray(),
    )
      .subscribe({
        next: (result) => {
          call.sendMetadata(metadata)
          const end = new Date()
          const duration = end.valueOf() - start.valueOf()
          if (Logger.isLevelEnabled('verbose')) {
            const r = inspect(result, {depth: Infinity})
            this.logger.verbose({start, end, duration, data, metadata: {req: reqMetadata, res: metadata}, result: r,
              handler, reqNode})
          } else {
            this.logger.log({handler, duration, reqNode})
          }
        },
        error: (err) => {
          call.sendMetadata(metadata)
          const end = new Date()
          const duration = end.valueOf() - start.valueOf()
          if (Logger.isLevelEnabled('verbose')) {
            this.logger.verbose(err, {start, end, duration, data, metadata: {req: reqMetadata, res: metadata}, handler,
              reqNode})
          } else {
            this.logger.log(err, {handler, duration, reqNode})
          }
        },
      })
    return res$
  }
}
