import is from '@sindresorhus/is'
import {Document, Model} from 'mongoose'
import {IdType, toObjectId} from './mongodb'
import DataLoader = require('dataloader')

type TCastId = (id: IdType) => any

function equals(a: IdType, b: IdType): boolean {
  if (is.primitive(a)) {
    if (is.primitive(b)) {
      return a === b
    } else {
      a = b.toString()
    }
  } else if ('equals' in a && is.function_(a.equals)) {
    return a.equals(b)
  }
  return a.toString() === b.toString()
}

export function getBaseIdLoader<T extends Document, TId extends IdType = IdType>(model: Model<T>, castId: TCastId = toObjectId): DataLoader<TId, T | undefined> {
  return new DataLoader<TId, T | undefined>(async (ids) => {
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
