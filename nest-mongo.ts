import {Param} from '@nestjs/common'
import {InjectModel as InjectM} from '@nestjs/mongoose'
import {getModelName} from 'mongoose-typescript'
import {IMongooseClass} from 'mongoose-typescript/lib/meta'
import {ParseMongoidPipe} from './nestjs/parse-mongoid.pipe'

export function InjectModel(model: IMongooseClass): ParameterDecorator & PropertyDecorator {
  return InjectM(getModelName(model))
}

export * from './nestjs/base-crud-service'

export function MongoIdParam(name: string): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    Param(name, ParseMongoidPipe)(target, propertyKey, parameterIndex)
  }
}
