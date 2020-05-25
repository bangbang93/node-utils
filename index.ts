import ms = require('ms')

export function second(str: string): number {
  return ms(str) / 1000
}

export const DEFAULT_SKIP = 0
export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 10
