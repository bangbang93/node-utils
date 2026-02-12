import {ArgumentMetadata, BadRequestException, Injectable, PipeTransform} from '@nestjs/common'
import {ObjectId} from 'mongoose-typescript'
import {toObjectId} from '../mongodb'

@Injectable()
export class ParseMongoidPipe implements PipeTransform<string> {
  public transform(value: string, metadata: ArgumentMetadata): ObjectId {
    try {
      return toObjectId(value)
    } catch {
      throw new BadRequestException(`${metadata.data ?? 'param'} must be mongoid`)
    }
  }
}
