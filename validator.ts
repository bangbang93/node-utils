import {Transform} from 'class-transformer'
import {toObjectId} from './mongodb'

export const ToMongoId: () => PropertyDecorator = () => Transform(toObjectId)
