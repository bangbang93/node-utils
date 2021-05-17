import {Observable} from 'rxjs'

export function fromAsyncIter<T>(iter: AsyncIterable<T>): Observable<T> {
  return new Observable(subscriber => {
    Promise.resolve().then(async () => {
      for await (const data of iter) {
        subscriber.next(data)
      }
      subscriber.complete()
    })
      .catch((err) => subscriber.error(err))
  })
}

export declare type PromiseToObservable<T> = {
  [TKey in keyof T]: T[TKey] extends (...args: infer TArgs) => PromiseLike<infer TResult> ? (...args: TArgs) => Observable<TResult> : T[TKey];
};
