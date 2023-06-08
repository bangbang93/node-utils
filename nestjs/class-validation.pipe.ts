import {createError} from '@bangbang93/service-errors'
import {Injectable, ValidationPipe as NestValidationPipe} from '@nestjs/common'
import {ValidationPipeOptions} from '@nestjs/common/pipes/validation.pipe'
import {ValidationError} from 'class-validator'

/**
 * 比起 NestJS 默认的 ValidationPipe，这个 ValidationPipe 会将错误信息转换为 ServiceErrors
 */
@Injectable()
export class ClassValidationPipe extends NestValidationPipe {
  constructor(options?: ValidationPipeOptions) {
    super({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors: ValidationError[]) => {
        const msgs = this.flattenValidationErrors(errors)
        return createError.COMMON_INVALID_PARAMETER(msgs.join())
      },
      ...options,
    })
  }
}
