import {ArgumentMetadata, BadRequestException, Injectable, PipeTransform} from '@nestjs/common'
import {toObjectId} from '../mongodb'

@Injectable()
export class ParseMongoidPipe implements PipeTransform<string> {
  public transform(value: string, metadata: ArgumentMetadata): any {
    try {
      return toObjectId(value)
    } catch (e) {
      throw new BadRequestException(`${metadata.data ?? 'param'} must be mongoid`)
    }
  }
}
