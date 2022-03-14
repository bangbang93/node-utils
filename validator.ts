import {Transform} from 'class-transformer'
import {trim} from 'lodash'
import {toBoolean} from './index'
import {ToMongoId} from './mongodb-validator'

export {
  /** @deprecated **/
  ToMongoId,
}

export const ToBoolean: () => PropertyDecorator = () => Transform(({value}) => toBoolean(value))

export const Trim: () => PropertyDecorator = () => Transform(({value}) => trim(value))
