import is from '@sindresorhus/is'
import {Document, Model} from 'mongoose'
import {IdType, toObjectId} from './mongodb'
import DataLoader = require('dataloader')

type TCastId = (id: unknown) => any

function equals(a: Record<string, unknown>, b: unknown): boolean {
  if ('equals' in a && is.function_(a.equals)) {
    return a.equals(b)
  }
  if (is.primitive(a) && is.primitive(b)) {
    return a === b
  }
  return a.toString() === b.toString()
}

export function getBaseIdLoader<T extends Document, TId = IdType>(model: Model<T>, castId: TCastId = toObjectId): DataLoader<TId, T> {
  return new DataLoader<TId, T>(async (ids) => {
    const docs = await model.find({_id: {$in: ids.map(castId)}})
    return ids.map((id) => docs.find((doc) => equals(doc._id, id)))
  }, {
    cacheKeyFn(e): any {
      if (is.primitive(e)) {
        return e
      } else {
        return e.toString()
      }
    }
  })
}
