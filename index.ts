import ms = require('ms')
import { max, min } from 'lodash'
import type { ClientSession } from 'mongoose'

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

export async function withSession(
  fn: (session: ClientSession) => Promise<void>,
  session: ClientSession | null,
  startSession: (...args: unknown[]) => Promise<ClientSession>
  ): Promise<void> {
  const useExists = !!session
  if (useExists) {
    return fn(session)
  }
  session = await startSession()
  await session.withTransaction(fn)
}
