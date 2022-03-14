import {Transform} from 'class-transformer'
import {trim} from 'lodash'
import {toBoolean} from './index'
import {toObjectId} from './mongodb'

export const ToMongoId: () => PropertyDecorator = () => Transform(({value}) => toObjectId(value))

export const ToBoolean: () => PropertyDecorator = () => Transform(({value}) => toBoolean(value))

export const Trim: () => PropertyDecorator = () => Transform(({value}) => trim(value))
