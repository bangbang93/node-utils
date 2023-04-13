import is from '@sindresorhus/is'
import Bluebird from 'bluebird'
import escapeStringRegexp from 'escape-string-regexp'
import {isNil, max, min} from 'lodash'
import {ClientSession, Connection, Document, FilterQuery, Types} from 'mongoose'
import {DocumentType, RichModelType} from 'mongoose-typescript'
import {RequireExactlyOne} from 'type-fest'
import {Constructor, Paged} from './index'

export type IdType = string | Types.ObjectId
type BuildQueryField<T> = keyof T | [keyof T, string] | {s: keyof T; m: string}
interface IBuildQueryArguments<T extends object, M = object> {
  equalFields?: BuildQueryField<T>[]
  matchFields?: BuildQueryField<T>[]
  idFields?: BuildQueryField<T>[]
  betweenFields?: BuildQueryField<T>[]
  inFields?: BuildQueryField<T>[]
  query?: FilterQuery<M>
}

export function makeMongoRegexp(str: string, options = 'i'): {$regex: string; $options: string} {
  if (isNil(str)) return str
  return {
    $regex: escapeStringRegexp(str), $options: options,
  }
}

export function toObjectId(id: IdType): Types.ObjectId {
  if (!id) throw new TypeError('id cannot be empty')
  if (typeof id === 'string') return new Types.ObjectId(id)
  return id
}

export function mongoBetween<T>(data: T[]): { $lte?: T; $gte?: T } {
  return {
    $lte: max(data),
    $gte: min(data),
  }
}

type NumberOperator = RequireExactlyOne<{
  $eq: number
  $gt: number
  $gte: number
  $lt: number
  $lte: number
  $ne: number
}>
export function parseNumberQuery(query: string): NumberOperator {
  const regex = /^(?<op>[<>=!]=?)(?<num>-?\d+.?\d*?)$/
  const opMap = {
    '=': '$eq',
    '==': '$eq',
    '>': '$gt',
    '>=': '$gte',
    '<': '$lt',
    '<=': '$lte',
    '!=': '$ne',
    '!': '$ne',
  }
  const match = query.match(regex)
  if (!match) throw new TypeError(`Invalid number query: ${query}`)
  const {op, num} = match.groups as {op: string; num: string}
  return {[opMap[op]]: Number(num)} as NumberOperator
}

export function buildQuery<T extends object, M = object>(search: T, args: IBuildQueryArguments<T, M>): FilterQuery<M> {
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

  function getFields(field): {s: string; m: string} {
    let s: string
    let m: string
    if (typeof field === 'string') {
      s = m = field
    } else if (Array.isArray(field)) {
      s = field[0]
      m = field[1]
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
  fn: (session?: ClientSession) => Promise<T>,
  connection: Connection,
  session?: ClientSession | null | false,
): Promise<T> {
  if (session === false) return fn(undefined)
  if (session) {
    return fn(session)
  }
  session = await connection.startSession()
  let ret: unknown = undefined
  await session.withTransaction(async (session) => {
    ret = await fn(session)
  })
  return ret as T
}

export async function saveDocs(docs: Document[], connection: Connection, session?: ClientSession): Promise<void> {
  await withSession(async (session) => {
    for (const doc of docs) {
      await doc.save({session})
    }
  }, connection, session)
}

export async function findAndCount<
  TModel extends RichModelType<Constructor<TDocument>>,
  TDocument = any
>(model: TModel, query: object, skip: number, limit: number,
  queryHelper?: (query: ReturnType<TModel['find']>) => void): Promise<Paged<DocumentType<InstanceType<TModel>>>> {
  const q = model.find(query).skip(skip).limit(limit)
  if (queryHelper) {
    queryHelper(q as ReturnType<TModel['find']>)
  }
  return Bluebird.props({
    data: q.exec() as Promise<DocumentType<InstanceType<TModel>>[]>,
    count: model.countDocuments(query),
  })
}
