import {applyDecorators, Controller, ControllerOptions, UseFilters, UseInterceptors, UsePipes} from '@nestjs/common'
import {GrpcExceptionFilter} from './grpc-exception.filter'
import {GrpcInterceptor} from './grpc.interceptor'
import {RpcValidationPipe} from './rpc-validation.pipe'

export function GrpcController(options?: ControllerOptions): ClassDecorator {
  const decorators: ClassDecorator[] = []
  if (options) {
    decorators.push(Controller(options))
  } else {
    decorators.push(Controller())
  }
  decorators.push(
    UsePipes(RpcValidationPipe),
    UseInterceptors(GrpcInterceptor),
    UseFilters(GrpcExceptionFilter),
  )
  return applyDecorators(
    ...decorators,
  )
}
