import is from '@sindresorhus/is'
import {Document, Model} from 'mongoose'
import {Constructor} from './index'
import {IdType, toObjectId} from './mongodb'
import DataLoader = require('dataloader')

type TCastId = (id: IdType) => any

function equals(a: unknown, b: unknown): boolean {
  if (is.primitive(a)) {
    if (is.primitive(b)) {
      return a === b
    } else {
      if (is.object(b)) {
        return a === b.toString()
      } else {
        return a === b
      }
    }
  } else if (is.object(a)) {
    if (is.primitive(b)) {
      return a.toString() === b
    } else {
      if (is.object(b)) {
        return a.toString() === b.toString()
      } else {
        return a.toString() === b
      }
    }
  }
  return false
}

export function getBaseIdLoader<T, TId extends IdType = IdType>(model: Model<T>, castId: TCastId = toObjectId): DataLoader<TId, T | undefined> {
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
