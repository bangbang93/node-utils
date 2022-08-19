import {applyDecorators, Controller, ControllerOptions, UseInterceptors, UsePipes} from '@nestjs/common'
import {GrpcInterceptor} from './grpc.interceptor'
import {RpcValidationPipe} from './rpc-validation.pipe'

export function GrpcController(options?: ControllerOptions): ClassDecorator {
  if (options) {
    return applyDecorators(
      Controller(options),
      UsePipes(RpcValidationPipe),
      UseInterceptors(GrpcInterceptor),
    )
  } else {
    return applyDecorators(
      Controller(),
      UsePipes(RpcValidationPipe),
      UseInterceptors(GrpcInterceptor),
    )
  }
}
