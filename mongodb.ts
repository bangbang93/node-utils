import is from '@sindresorhus/is'
import * as Bluebird from 'bluebird'
import * as escapeStringRegexp from 'escape-string-regexp'
import {isNil, max, min} from 'lodash'
import {ClientSession, Connection, Document, Model, Types} from 'mongoose'
import {ObjectId} from 'mongoose-typescript'
import {Paged} from './index'

export type IdType = string | ObjectId
type BuildQueryField<T> = keyof T | [keyof T, string] | {s: keyof T, m: string}
interface IBuildQueryArguments<T extends object> {
  equalFields?: BuildQueryField<T>[],
  matchFields?: BuildQueryField<T>[],
  idFields?: BuildQueryField<T>[],
  betweenFields?: BuildQueryField<T>[],
  inFields?: BuildQueryField<T>[],
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

export function buildQuery<T extends object>(search: T, args: IBuildQueryArguments<T>): Record<string, unknown> {
  if (!search) return {}
  if (!is.object(search)) throw new TypeError('search must be an object')
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
    for (const field of args.inFields) {
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
export async function withSession<T>(
  fn: (session: ClientSession) => Promise<T>,
  connection: Connection,
  session?: ClientSession | null | false,
): Promise<T> {
  if (session === false) return fn(null)
  if (!!session) {
    return fn(session)
  }
  session = await connection.startSession()
  let ret: T = undefined
  await session.withTransaction(async (session) => {
    ret = await fn(session)
  })
  return ret
}

export async function saveDocs(docs: Document[], connection: Connection, session?: ClientSession): Promise<void> {
  await withSession(async (session) => {
    for (const doc of docs) {
      await doc.save({session})
    }
  }, connection, session)
}

export async function findAndCount<T extends Document>(model: Model<T>, query: object, skip: number, limit: number,
  queryHelper?: (query: ReturnType<Model<T>['find']>) => void): Promise<Paged<T>> {
  const q = model.find(query).skip(skip).limit(limit)
  if (queryHelper) {
    queryHelper(q)
  }
  return Bluebird.props({
    data: q.exec(),
    count: model.countDocuments(query),
  })
}
