import {createError, ServiceError} from '@bangbang93/service-errors'
import {Metadata} from '@grpc/grpc-js'
import {Inject, OnModuleInit} from '@nestjs/common'
import {ModuleRef} from '@nestjs/core'
import {ClientGrpc, RpcException} from '@nestjs/microservices'
import is from '@sindresorhus/is'
import {plainToInstance} from 'class-transformer'
import {hostname} from 'os'
import {map, Observable} from 'rxjs'
import {catchError} from 'rxjs/operators'
import {Paged} from '../index'
import {PromiseToObservable} from '../rxjs'

/**
 * GrpcService的基类, 用于封装grpc调用.
 * 1. 通过`@Inject('SERVICE_NAME')`注入grpc client
 * 2. 将protobufjs生成的Promise based api转换为RxJS based api
 * 3. 为请求的metadata添加`x-req-node`字段
 */
export abstract class BaseRpcService<T> implements OnModuleInit {
  @Inject() private readonly moduleRef!: ModuleRef
  protected _service!: PromiseToObservable<T>

  protected constructor(
    protected readonly serviceName: string,
  ) {}

  public get service() {
    return this._service
  }

  public onModuleInit(): any {
    const rawService = this.moduleRef.get<ClientGrpc>(`GRPC-${this.serviceName}`).getService(this.serviceName)
    this._service = new Proxy(rawService, {
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
                    if (json.isChipcooError) {
                      parsedError = plainToInstance(ServiceError, json as object)
                    } else {
                      parsedError = createError.COMMON_RPC_ERROR(json.message, {causedBy: err})
                    }
                  } catch (e) {
                    let detail = err['details']
                    try {
                      detail = JSON.parse(err['details'])
                      if (detail.isChipcooError) {
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
                  service: this.serviceName,
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
    }) as any
  }

  protected requiredPaged(data: Observable<Partial<Paged<T>>>): Observable<Paged<T>> {
    return data.pipe(
      map((e) => ({
        count: e.count ?? 0,
        data: e.data ?? [],
      }))
    )
  }
}
