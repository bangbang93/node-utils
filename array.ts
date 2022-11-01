import is from '@sindresorhus/is'
import {mapValues} from 'lodash'

type Order = '+' | '-'
type Type = 'string' | 'number' | 'boolean' | 'date'
type OrderBy = `${Order}${Type}` | ((a: unknown, b: unknown) => number)
interface ISortKey {
  [key: string]: OrderBy
}

export function arraySort<T extends any[] = unknown[]>(arr: T, orderKey: ISortKey): T {
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
  return arr.sort((a, b) => {
    for (const key of keys) {
      const orderBy = orders[key]
      if (is.function_(orderBy)) {
        return orderBy(a, b)
      } else {
        const {order, type} = orderBy
        const valueA = a[key]
        const valueB = b[key]
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
  })
}
