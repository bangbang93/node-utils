import {InjectModel as InjectM} from '@nestjs/mongoose'
import {getModelName} from 'mongoose-typescript'
import {IMongooseClass} from 'mongoose-typescript/lib/meta'

export function InjectModel(model: IMongooseClass): ParameterDecorator & PropertyDecorator {
  return InjectM(getModelName(model))
}
