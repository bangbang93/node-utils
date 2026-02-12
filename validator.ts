import {Transform} from 'class-transformer'
import {trim} from 'lodash'
import {toBoolean} from './index'

export const ToBoolean: () => PropertyDecorator = () => Transform(({value}: {value: string}) => toBoolean(value))

export const Trim: () => PropertyDecorator = () => Transform(({value}: {value: unknown}) => {
  return typeof value === 'string' ? trim(value) : value
})
