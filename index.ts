import is from '@sindresorhus/is'
import {isNil, mapValues} from 'lodash'
import ms from 'ms'
import {deprecate} from 'util'

export function second(str: string): number {
  return ~~(ms(str) / 1000)
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
    } else if (typeof descriptor.value === 'function') {
      descriptor.value = deprecate(descriptor.value, message)
    }
  }
}

export interface Paged<T> {
  count: number
  data: T[]
}

export type ValueOf<T> = T[keyof T]

export function toBoolean(value: string | number | boolean): boolean
export function toBoolean(value: null | undefined): null | undefined
export function toBoolean(value: string | number | boolean | null | undefined): boolean | null | undefined {
  if (is.nullOrUndefined(value)) return value
  return [true, 'true', '1', 'yes', 1].includes(value)
}

export function trimDeep<T extends object>(obj: T): T {
  return mapValues(obj, (v) => {
    if (is.string(v)) {
      return v.trim()
    } if (is.plainObject(v)) {
      return trimDeep(v)
    } return v
  }) as T
}

export * from './types'
