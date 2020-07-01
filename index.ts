import ms = require('ms')
import { max, min } from 'lodash'

export function second(str: string): number {
  return ms(str) / 1000
}

export const DEFAULT_SKIP = 0
export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 10

export function mongoBetween<T>(data: T[]): {$lte: T; $gte: T} {
  return {
    $lte: max(data),
    $gte: min(data),
  }
}
