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
      if (!is.string(propKey)) return rawService[propKey]
      if (!(propKey in rawService)) return undefined
      const prop: unknown = rawService[propKey]
      if (is.function_(prop)) {
        return (data: unknown, metadata?: Metadata): Observable<unknown> => {
          metadata ??= new Metadata()
          metadata.set('x-req-node', hostname())
          const res$: Observable<unknown> = prop.call(rawService, data, metadata)
          return res$.pipe(
            catchError((err: RpcException) => {
              let parsedError: Error = err
              if (err['code'] === 2 && err['details']) {
                try {
                  const json = JSON.parse(err['details'])
                  if (json.$isServiceError) {
                    parsedError = plainToInstance(ServiceError, json as object)
                  } else {
                    parsedError = createError.COMMON_RPC_ERROR(json.message, {causedBy: err})
                  }
                } catch (e) {
                  let detail = err['details']
                  try {
                    detail = JSON.parse(err['details'])
                    if (detail.$isServiceError) {
                      detail = plainToInstance(ServiceError, detail)
                    }
                  } catch (e) {/* ignore */}
                  if (detail instanceof ServiceError) {
                    throw detail
                  } else {
                    throw createError.COMMON_RPC_ERROR(detail.message, {causedBy: detail})
                  }
                }
              }

              throw createError.COMMON_RPC_ERROR(parsedError.message, {
                service: rawService.constructor.name,
                method: propKey,
                data,
                metadata,
                causedBy: parsedError,
              })
            })
          )
        }
      }
      return prop
    },
  }) as PromiseToObservable<T>
}
