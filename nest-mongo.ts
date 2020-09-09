import {getModelToken, InjectModel} from '@nestjs/mongoose'
import {getModelName} from 'mongoose-typescript'
import {IMongooseClass} from 'mongoose-typescript/lib/meta'

export function InjectModel2(model: IMongooseClass): ParameterDecorator & PropertyDecorator {
  return InjectModel(getModelToken(getModelName(model)))
}
