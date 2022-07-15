import {util, wrappers} from 'protobufjs'

export function applyWrappers() {
  wrappers['.google.protobuf.Timestamp'] = {
    fromObject(date: Date) {
      if (typeof date === 'string') {
        date = new Date(date)
      }
      return this.create({
        seconds: new util.Long(Math.round(date.valueOf() / 1000)),
        nanos: date.valueOf() % 1000,
      })
    },
    toObject(message) {
      return new Date(message['seconds'].mul(1000).add(message['nanos']).toNumber())
    },
  }
  const _toObject = wrappers['.google.protobuf.Any'].toObject
  wrappers['.google.protobuf.Any'].toObject = function toObject(message, options) {
    message = _toObject.call(this, message, options)
    delete message['@type']
    return message
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


declare module "protobufjs" {
  interface Long {
    toJSON(): number | string
  }
}
