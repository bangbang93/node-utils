export interface IParseSortOptions {
  allowFields?: string[]
  defaults?: Record<string, Direction>
  flavor?: 'mongo' | 'mysql'
}

interface IFlavor {
  asc: Direction
  desc: Direction
}

type Direction = 1 | -1 | 'ASC' | 'DESC'

const FLAVOR_MAP: Record<string, IFlavor> = {
  mongo: {
    asc: 1,
    desc: -1,
  },
  mysql: {
    asc: 'ASC',
    desc: 'DESC',
  },
}

export function parseSortMongo(sort: string | undefined | null,
  options?: Omit<IParseSortOptions, 'flavor'>): Record<string, 1 | -1> {
  if (!sort) {
    return options?.defaults as Record<string, 1 | -1> ?? {}
  }
  return parseSort(sort, {...options, flavor: 'mongo'}) as Record<string, 1 | -1>
}

export function parseSortMysql(sort: string | undefined | null,
  options?: Omit<IParseSortOptions, 'flavor'>): Record<string, 'ASC' | 'DESC'> {
  if (!sort) {
    return options?.defaults as Record<string, 'ASC'| 'DESC'> ?? {}
  }
  return parseSort(sort, {...options, flavor: 'mysql'}) as Record<string, 'ASC' | 'DESC'>
}

export function parseSort(sort: string  | undefined, options?: IParseSortOptions): Record<string, Direction> {
  if (!sort) {
    return options?.defaults ?? {}
  }
  const fields = sort.split(',')
  const flavor = options?.flavor ?? 'mongo'
  const {asc, desc} = FLAVOR_MAP[flavor] || FLAVOR_MAP.mongo
  const result = {} as Record<string, Direction>
  for (const field of fields) {
    if (!field.trim()) continue
    let key: string
    let direction: Direction
    if (field.startsWith('-')) {
      key = field.slice(1)
        .trim()
      direction = desc
    } else if (field.startsWith('+')) {
      key = field.slice(1)
        .trim()
      direction = asc
    } else {
      key = field.trim()
      direction = asc
    }
    if (!key) continue // Skip if field name is empty after removing prefix
    if (!options?.allowFields || options.allowFields.includes(key)) {
      result[key] = direction
    }
  }
  return result
}
