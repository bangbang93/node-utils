import * as escapeStringRegexp from 'escape-string-regexp'
import {isNil, max, min} from 'lodash'
import {ClientSession, Connection, Types} from 'mongoose'
import ObjectId = Types.ObjectId

export type IdType = string | ObjectId
type BuildQueryField = string | [string, string] | {s: string, m: string}
interface IBuildQueryArguments {
  equalFields?: BuildQueryField[],
  matchFields?: BuildQueryField[],
  idFields?: BuildQueryField[],
  betweenFields?: BuildQueryField[],
  inFields?: BuildQueryField[],
  query?: object
}

export function makeMongoRegexp(str: string, options = 'i'): {$regex: string, $options: string} {
  if (isNil(str)) return str
  return {
    $regex: escapeStringRegexp(str), $options: options,
  }
}

export function toObjectId(id: IdType): ObjectId {
  if (!id) throw new TypeError('id cannot be empty')
  if (typeof id === 'string') return new Types.ObjectId(id)
  return id
}

export function mongoBetween<T>(data: T[]): { $lte: T; $gte: T } {
  return {
    $lte: max(data),
    $gte: min(data),
  }
}

export function buildQuery(search: object, args: IBuildQueryArguments): Record<string, unknown> {
  const query: Record<string, unknown> = (args.query ?? {}) as Record<string, unknown>
  if (args.equalFields) {
    for (const field of args.equalFields) {
      const {s, m} = getFields(field)
      if (s in search && search[s] !== undefined) {
        query[m] = search[s]
      }
    }
  }
  if (args.matchFields) {
    for (const field of args.matchFields) {
      const {s, m} = getFields(field)
      if (s in search && search[s] !== undefined) {
        query[m] = makeMongoRegexp(search[s].toString())
      }
    }
  }
  if (args.idFields) {
    for (const field of args.idFields) {
      const {s, m} = getFields(field)
      if (s in search && search[s] !== undefined) {
        query[m] = toObjectId(search[s])
      }
    }
  }
  if (args.betweenFields) {
    for (const field of args.betweenFields) {
      const {s, m} = getFields(field)
      if (s in search && search[s] !== undefined) {
        const d = search[s]
        if (!Array.isArray(d)) throw new TypeError(`${s} is not array, got ${search[s]}`)
        query[m] = mongoBetween(d)
      }
    }
  }
  if (args.inFields) {
    for (const field of args.betweenFields) {
      const {s, m} = getFields(field)
      if (s in search && search[s] !== undefined) {
        const d = search[s]
        if (!Array.isArray(d)) throw new TypeError(`${s} is not array, got ${search[s]}`)
        query[m] = {$in: d}
      }
    }
  }
  return query

  function getFields(field) {
    let s: string
    let m: string
    if (typeof field === 'string') {
      if (field in search && search[field] !== undefined) {
        s = m = field
      }
    } else if (Array.isArray(field)) {
      if (field[0] in search && search[field[0]] !== undefined) {
        s = field[0]
        m = field[1]
      }
    } else {
      s = field.s
      m = field.m
    }
    return {s, m}
  }
}

/**
 *
 * @param fn
 * @param connection
 * @param session set false to skip session
 */
export async function withSession(
  fn: (session: ClientSession) => Promise<void>,
  connection: Connection,
  session?: ClientSession | null | false,
): Promise<void> {
  if (session === false) return
  const useExists = !!session
  if (useExists) {
    return fn(session)
  }
  session = await connection.startSession()
  await session.withTransaction(fn)
}
