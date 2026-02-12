import {Model} from 'mongoose'
import {DocumentType, RichModelType} from 'mongoose-typescript'
import {Constructor} from 'type-fest'
import {DEFAULT_LIMIT, Paged} from '../index'
import {findAndCount, IdType, toObjectId} from '../mongodb'

export abstract class BaseCrudService<T extends object, Doc = DocumentType<T>> {
  protected constructor(
    private readonly model: RichModelType<Constructor<T>>,
  ) {}

  public async getById(id: IdType): Promise<Doc | null> {
    return await this.model.findById(id)
  }

  public async listByIds(ids: IdType[]): Promise<Doc[]> {
    return await this.model.find({_id: {$in: ids.map(toObjectId)}})
  }

  public async create(data: object): Promise<Doc> {
    return await this.model.create(data) as Doc
  }

  public async search(query: Record<string, unknown>, skip = 0, limit = DEFAULT_LIMIT,
    queryHelper?: (query: ReturnType<Model<T>['find']>) => void): Promise<Paged<T>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await findAndCount(this.model as any, query, skip, limit, queryHelper)
  }

  public async update(id: IdType, data: Partial<T>): Promise<void> {
    await this.model.updateOne({_id: toObjectId(id)}, {
      $set: data,
    })
  }

  public async delete(id: IdType): Promise<void> {
    await this.model.deleteOne({_id: toObjectId(id)})
  }
}
