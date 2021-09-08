import {applyDecorators, Controller, ControllerOptions, UseInterceptors, UsePipes} from '@nestjs/common'
import {GrpcInterceptor} from './grpc.interceptor'
import {RpcValidationPipe} from './rpc-validation.pipe'

export function Grpc(options?: ControllerOptions): ClassDecorator {
  return applyDecorators(
    Controller(options),
    UsePipes(RpcValidationPipe),
    UseInterceptors(GrpcInterceptor),
  )
}
