import {Transform} from 'class-transformer'
import {toBoolean} from './index'
import {toObjectId} from './mongodb'

export const ToMongoId: () => PropertyDecorator = () => Transform(({value}) => toObjectId(value))

export const ToBoolean: () => PropertyDecorator = () => Transform(({value}) => toBoolean(value))
