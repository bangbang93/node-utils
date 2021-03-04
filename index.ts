import ms = require('ms')
import is from '@sindresorhus/is'
import {deprecate} from 'util'

export function second(str: string): number {
  return ms(str) / 1000
}

export const DEFAULT_SKIP = 0
export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 10

export type Fn = (...args: unknown[]) => unknown
export interface Constructor<T = unknown> {
  prototype: Prototype
  new(...args: unknown[]): T
}
export type Prototype = object

export function Deprecated(message: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    if (descriptor.get) {
      descriptor.get = deprecate(descriptor.get, message)
    } else if (is.function_(descriptor.value)) {
      descriptor.value = deprecate(descriptor.value, message)
    }
  }
}

export interface Paged<T> {
  count: number
  data: T[]
}

export type ValueOf<T> = T[keyof T]
