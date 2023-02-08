import {common, Message, util, wrappers} from 'protobufjs'
import {Paged} from './index'
import ITimestamp = common.ITimestamp

export function applyWrappers(w = wrappers): void {
  w['.google.protobuf.Timestamp'] = {
    fromObject(date: unknown) {
      if (typeof date === 'string') {
        date = new Date(date)
      }
      if (date instanceof Date) {
        return this.create({
          seconds: new util.Long(Math.round(date.valueOf() / 1000)),
          nanos: date.valueOf() % 1000,
        })
      }
      throw new Error('Invalid date')
    },
    toObject(message: Message<ITimestamp> & ITimestamp) {
      const seconds = typeof message.seconds === 'number' ? message.seconds : message.seconds?.toNumber() ?? 0
      return new Date(seconds * 1000 + (message.nanos ?? 0))
    },
  }
  const _toObject = w['.google.protobuf.Any'].toObject
  w['.google.protobuf.Any'].toObject = function toObject(message, options) {
    const msg = _toObject?.call(this, message, options)
    if (msg) {
      delete msg['@type']
    }
    return msg ?? {}
  }

  util.Long.prototype.toJSON = function toJSON(): number | string {
    const number = this.toNumber()
    if (number >= Number.MIN_SAFE_INTEGER && number <= Number.MAX_SAFE_INTEGER) {
      return this.toNumber()
    } else {
      return this.toString()
    }
  }
}

export function unwrapPagedDto<T>(data: Partial<Paged<T>>): Paged<T> {
  return {
    count: data.count ?? 0,
    data: data.data ?? [],
  }
}


declare module 'protobufjs' {
  interface Long {
    toJSON(): number | string
    toNumber(): number
  }
}

declare module 'long' {
  interface Long {
    toJSON(): number | string
  }
}
