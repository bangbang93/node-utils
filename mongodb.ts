import is from '@sindresorhus/is'
import {escapeRegExp, isNil, max, min, toString, uniqBy} from 'lodash'
import {ClientSession, QueryFilter, SessionStarter, SortOrder, Types} from 'mongoose'
import {DocumentType, RichModelType} from 'mongoose-typescript'
import pProps from 'p-props'
import {RequireExactlyOne} from 'type-fest'
import {Constructor, Paged} from './index'

export type IdType = string | Types.ObjectId
export type NotDocument<T>  = T & {toObject?: never}

export function toObjectId(id: IdType): Types.ObjectId {
  if (!id) throw new TypeError('id cannot be empty')
  if (typeof id === 'string') return new Types.ObjectId(id)
  return id
}

type BuildQueryField<T extends object> =
  Extract<keyof T, string>
  | [Extract<keyof T, string>, string]
  | {s: Extract<keyof T, string>; m: string}
interface IBuildQueryArguments<T extends object, M = object> {
  equalFields?: BuildQueryField<T>[]
  matchFields?: BuildQueryField<T>[]
  idFields?: BuildQueryField<T>[]
  betweenFields?: BuildQueryField<T>[]
  inFields?: BuildQueryField<T>[]
  inIdFields?: BuildQueryField<T>[]
  query?: QueryFilter<M>
}

type IdName = `${string}Id`

export type StringIdObject<T, Keys = IdName> = {
  [K in keyof T]: K extends Keys
    ? T[K] extends Types.ObjectId | undefined | null
      ? T[K] extends undefined | null
        ? IdType | T[K] : IdType
      : T[K]
    : T[K]
}

export function buildQuery<TSearch extends object, M = object>(
  searchInput: TSearch,
  args: IBuildQueryArguments<TSearch, M>,
): QueryFilter<M> {
  const search = searchInput as Record<string, unknown>
  if (!search) return {}
  if (!is.object(search)) throw new TypeError('search must be an object')
  const query = {...args.query} as Record<string, unknown>
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
        query[m] = makeMongoRegexp(toString(search[s]))
      }
    }
  }
  if (args.idFields) {
    for (const field of args.idFields) {
      const {s, m} = getFields(field)
      if (s in search && search[s] !== undefined) {
        query[m] = toObjectId(toString(search[s]))
      }
    }
  }
  if (args.betweenFields) {
    for (const field of args.betweenFields) {
      const {s, m} = getFields(field)
      if (s in search && search[s] !== undefined) {
        const d = search[s]
        if (!Array.isArray(d)) throw new TypeError(`${s} is not array, got ${JSON.stringify(search[s])}`)
        query[m] = mongoBetween(d)
      }
    }
  }
  if (args.inFields) {
    for (const field of args.inFields) {
      const {s, m} = getFields(field)
      if (s in search && search[s] !== undefined) {
        const d = search[s]
        if (!Array.isArray(d)) throw new TypeError(`${s} is not array, got ${JSON.stringify(search[s])}`)
        query[m] = {$in: d}
      }
    }
  }
  if (args.inIdFields) {
    for (const field of args.inIdFields) {
      const {s, m} = getFields(field)
      if (s in search && search[s] !== undefined) {
        const d = search[s]
        if (!Array.isArray(d)) throw new TypeError(`${s} is not array, got ${JSON.stringify(search[s])}`)
        query[m] = {$in: d.map(toObjectId)}
      }
    }
  }
  return query
}

function getFields(field: string | string[] | {s: string; m: string}): {s: string; m: string} {
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

export function makeMongoRegexp(str: string, options = 'i'): {$regex: string; $options: string} {
  if (isNil(str)) return str
  return {
    $regex: escapeRegExp(str), $options: options,
  }
}

export function mongoBetween<T>(data: T[]): { $lte?: T; $gte?: T } {
  return {
    $lte: max(data),
    $gte: min(data),
  }
}

export function isObjectIdEqual(a: IdType | null | undefined, b: IdType | null | undefined): boolean {
  if (a === b) return true
  if (isNil(a) || isNil(b)) return false
  if (!is.string(a)) {
    return a.equals(b)
  }
  if (!is.string(b)) {
    return b.equals(a)
  }
  return a.toString() === b.toString()
}

export async function withSession<T>(
  fn: (session: ClientSession) => Promise<T>,
  sessionStarter: SessionStarter,
  session?: ClientSession | null,
): Promise<T> {
  if (session) {
    return fn(session)
  }
  session = await sessionStarter.startSession()
  let ret: unknown = undefined
  await session.withTransaction(async (session) => {
    ret = await fn(session)
  })
  return ret as T
}

type QueryHelper<TModel extends RichModelType<Constructor>> = (query: ReturnType<TModel['find']>) => void
type Sortable = string | { [key: string]: SortOrder | { $meta: 'textScore' } } | [string, SortOrder][]

export async function findAndCount<
  TModel extends RichModelType<Constructor>,
  TDocument = DocumentType<InstanceType<TModel>>,
>(model: TModel, query: object, skip: number, limit: number, sort?: Sortable | QueryHelper<TModel>,
  queryHelper?: (query: ReturnType<TModel['find']>) => void | Promise<void>): Promise<Paged<TDocument>> {
  const q = model.find(query).skip(skip).limit(limit)
  if (typeof sort === 'object' || typeof sort === 'string') {
    void q.sort(sort)
  } else {
    queryHelper = sort
  }
  if (queryHelper) {
    const r = queryHelper(q as ReturnType<TModel['find']>)
    if (r !== undefined) await r
  }
  return pProps({
    data: q.exec() as Promise<TDocument[]>,
    count: model.countDocuments(query),
  }) as unknown as Paged<TDocument>
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
  const match = regex.exec(query)
  if (!match) throw new TypeError(`Invalid number query: ${query}`)
  const {op, num} = match.groups as {op: keyof typeof opMap; num: string}
  return {[opMap[op]]: Number(num)} as unknown as NumberOperator
}


export function uniqMongoId<T extends IdType[]>(ids: T): T {
  return uniqBy(ids, (e) => e.toString()) as T
}
