import is from '@sindresorhus/is'
import DataLoader from 'dataloader'
import {Document} from 'mongoose'
import {RichModelType} from 'mongoose-typescript'
import {Constructor} from './index'
import {IdType, toObjectId} from './mongodb'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TCastId = (id: IdType) => any

/* eslint-disable @typescript-eslint/no-base-to-string */
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
/* eslint-enable @typescript-eslint/no-base-to-string */

export function getBaseIdLoader<
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  TModel extends RichModelType<Constructor<any>>,
  TDocument extends Document,
  TId extends IdType = IdType,
>(
  model: TModel,
  castId: TCastId | false = toObjectId,
): DataLoader<TId, TDocument | undefined> {
  return new DataLoader<TId, TDocument | undefined>(async (ids) => {
    let castedIds: unknown[]
    if (castId) {
      castedIds = ids.map(castId)
    } else {
      castedIds = [...ids]
    }
    const docs: TDocument[] = await model.find({_id: {$in: castedIds}})
    return ids.map((id) => docs.find((doc) => equals(doc._id, id)))
  }, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cacheKeyFn(e): any {
      if (is.primitive(e)) {
        return e
      } else {
        return e.toString()
      }
    },
  })
}
