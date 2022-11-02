import {from, Observable} from 'rxjs'

/** @deprecated just use from */
export function fromAsyncIter<T>(iter: AsyncIterable<T>): Observable<T> {
  return from(iter)
}

export declare type PromiseToObservable<T> = {
  [TKey in keyof T]: T[TKey] extends (...args: infer TArgs) => PromiseLike<infer TResult>
    ? (...args: TArgs) => Observable<TResult> : T[TKey];
}
