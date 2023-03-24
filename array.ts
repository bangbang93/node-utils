import is from '@sindresorhus/is'
import {get, isNil, mapValues} from 'lodash'

type Order = '+' | '-'
type Type = 'string' | 'number' | 'boolean' | 'date'
type OrderBy<T> = `${Order}${Type}` | ((a: T, b: T) => number)
interface ISortKey<T> {
  [key: string]: OrderBy<T>
}

export function arraySort<T = unknown>(arr: T[], orderKey: ISortKey<T>): T[] {
  return arr.sort(generateSortFunction(orderKey))
}

export function generateSortFunction<T = unknown>(orderKey: ISortKey<T>): (a: T, b: T) => number {
  const keys = Object.keys(orderKey)
  const orders = mapValues(orderKey, (v) => {
    if (typeof v === 'string') {
      return {
        order: v[0] as Order,
        type: v.substr(1),
      }
    } else {
      return v
    }
  })
  return (a, b) => {
    for (const key of keys) {
      const orderBy = orders[key]
      if (is.function_(orderBy)) {
        return orderBy(a, b)
      } else {
        const {order, type} = orderBy
        const valueA: unknown = get(a, key)
        const valueB: unknown = get(b, key)
        if (isNil(a) || isNil(b)) {
          return 0
        }
        if (valueA !== valueB) {
          switch (type) {
            case 'string':
              return (valueA as string).localeCompare(valueB as string) * (order === '+' ? 1 : -1)
            case 'number':
              return ((valueA as number) - (valueB as number)) * (order === '+' ? 1 : -1)
            case 'boolean':
              return ((valueA as boolean ? 1 : 0) - (valueB as boolean ? 1 : 0)) * (order === '+' ? 1 : -1)
            case 'date':
              return ((valueA as Date).getTime() - (valueB as Date).getTime()) * (order === '+' ? 1 : -1)
            default:
              return 0
          }
        }
      }
    }
    return 0
  }
}
