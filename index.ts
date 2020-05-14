import ms = require('ms')

export function second(str: string): number {
  return ms(str) / 1000
}
