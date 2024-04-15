import {Param} from '@nestjs/common'
import {InjectModel as InjectM} from '@nestjs/mongoose'
import {getModelName} from 'mongoose-typescript'
import {Constructor} from 'type-fest'
import {ParseMongoidPipe} from './nestjs/parse-mongoid.pipe'

export function InjectModel(
  model: Constructor<object>,
  connectionName?: string | undefined,
): ParameterDecorator & PropertyDecorator {
  return InjectM(getModelName(model), connectionName)
}

export * from './nestjs/base-crud-service'

export function MongoIdParam(name: string): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    Param(name, ParseMongoidPipe)(target, propertyKey, parameterIndex)
  }
}
