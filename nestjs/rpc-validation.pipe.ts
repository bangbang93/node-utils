import {
  flatten, Inject, Injectable, Optional, ValidationError, ValidationPipe, ValidationPipeOptions,
} from '@nestjs/common'
import {RpcException} from '@nestjs/microservices'

export const ValidationOptions = Symbol('validation-options')

const defaultOptions: ValidationPipeOptions = {
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  whitelist: true,
}

@Injectable()
export class RpcValidationPipe extends ValidationPipe {
  constructor(
    @Optional() @Inject(ValidationOptions) options: ValidationPipeOptions = defaultOptions,
  ) {
    if (!options) options = defaultOptions
    super({
      exceptionFactory: createExceptionFactory(),
      ...options,
    })
  }
}

function createExceptionFactory() {
  return (validationErrors: ValidationError[] = []) => {
    const errors = flattenValidationErrors(validationErrors)
    return new RpcException(errors.join())
  }
}

function flattenValidationErrors(
  validationErrors: ValidationError[],
): string[] {
  return flatten(
    flatten(validationErrors
      .map((error) => mapChildrenToValidationErrors(error)))
      .filter((item) => !!item.constraints)
      .map((item) => item.constraints ? Object.values(item.constraints) : [])
  )
}

function mapChildrenToValidationErrors(
  error: ValidationError,
): ValidationError[] {
  if (!error.children?.length) {
    return [error]
  }
  const validationErrors: ValidationError[] = []
  for (const item of error.children) {
    if (item.children?.length) {
      validationErrors.push(...mapChildrenToValidationErrors(item))
    }
    validationErrors.push(prependConstraintsWithParentProp(error, item))
  }
  return validationErrors
}

function prependConstraintsWithParentProp(
  parentError: ValidationError,
  error: ValidationError,
): ValidationError {
  const constraints: Record<string, string> = {}
  for (const key in error.constraints) {
    constraints[key] = `${parentError.property}.${error.constraints[key]}`
  }
  return {
    ...error,
    constraints,
  }
}
