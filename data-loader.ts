import DataLoader from 'dataloader'
import {compact} from 'lodash'

export async function loadMany<Id, R>(ids: Iterable<Id>, loader: DataLoader<Id, R>): Promise<R[]> {
  return compact(await Promise.all([...ids].map((id) => loader.load(id))))
}
