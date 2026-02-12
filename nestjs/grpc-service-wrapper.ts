import {createError, ServiceError} from '@bangbang93/service-errors'
import {Metadata} from '@grpc/grpc-js'
import {RpcException} from '@nestjs/microservices'
import is from '@sindresorhus/is'
import {plainToInstance} from 'class-transformer'
import {hostname} from 'os'
import {catchError, Observable} from 'rxjs'
import {PromiseToObservable} from '../rxjs'

export function grpcServiceWrapper<T extends object>(rawService: T): PromiseToObservable<T> {
  return new Proxy(rawService, {
    get: (target, propKey) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      if (!is.string(propKey)) return rawService[propKey]
      if (!(propKey in rawService)) return undefined
      const prop: unknown = rawService[propKey]
      if (is.function_(prop)) {
        return (data: unknown, metadata?: Metadata, ...rest: unknown[]): Observable<unknown> => {
          metadata ??= new Metadata()
          metadata.set('x-req-node', hostname())
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const res$: Observable<unknown> = prop.call(rawService, data, metadata, ...rest)
          return res$.pipe(
            catchError((err: RpcException) => {
              let parsedError: ServiceError
              if (err['code'] === 2 && typeof err['details'] === 'string') {
                try {
                  const json = JSON.parse(err['details']) as object
                  if (json['$isServiceError']) {
                    parsedError = plainToInstance(ServiceError, json)
                  } else {
                    parsedError = createError.COMMON_UNKNOWN(json['message'] as string, {causedBy: err})
                  }
                } catch {
                  const details = err['details']
                  let detailObj: object | undefined  = undefined
                  try {
                    detailObj = JSON.parse(err['details']) as object
                    if (detailObj['$isServiceError']) {
                      detailObj = plainToInstance(ServiceError, detailObj)
                    }
                  } catch {/* ignore */}
                  if (detailObj instanceof ServiceError) {
                    throw detailObj
                  } else {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                    throw createError.COMMON_UNKNOWN(detailObj?.['message'] ?? details,
                      {causedBy: details as unknown as Error})
                  }
                }
              } else {
                parsedError = createError.COMMON_UNKNOWN(err.message, {causedBy: err})
              }

              throw new ServiceError(parsedError.code, '', {
                causedBy: parsedError,
                httpCode: parsedError.httpCode,
                service: rawService.constructor.name,
                method: propKey,
                data,
                metadata,
              })
            }),
          )
        }
      }
      return prop
    },
  }) as PromiseToObservable<T>
}
