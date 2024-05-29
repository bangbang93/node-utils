import is from '@sindresorhus/is'
import stringify from 'json-stringify-safe'
import {isNil} from 'lodash'


export function caughtError(e: unknown): Error {
  if (is.error(e)) {
    return e
  }
  if (is.object(e)) {
    if ('message' in e && !isNil(e.message)) {
      return new Error(e['message'] as string)
    }
  }
  return new Error(stringify(e))
}
