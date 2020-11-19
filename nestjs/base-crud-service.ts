import {Injectable} from '@nestjs/common'
import {Model, Document, DocumentQuery} from 'mongoose'
import {ObjectId} from 'mongoose-typescript'
import {DEFAULT_LIMIT} from '../index'
import {findAndCount, IdType, toObjectId} from '../mongodb'
import {Paged} from '../nestjs'

interface IBaseDocument extends Document {
  _id: ObjectId
}

@Injectable()
export abstract class BaseCrudService<T extends IBaseDocument> {
  protected constructor(
    private readonly model: Model<T>
  ) {}

  public async getById(id: IdType): Promise<T> {
    return this.model.findById(id)
  }

  public async listByIds(ids: IdType[]): Promise<T[]> {
    return this.model.find({_id: {$in: ids.map(toObjectId)}} as any)
  }

  public async create(data: any): Promise<T> {
    return this.model.create(data)
  }

  public async search(query: Record<string, unknown>, skip = 0, limit = DEFAULT_LIMIT,
    queryHelper?: (query: ReturnType<Model<T>['find']>) => void): Promise<Paged<T>> {
    return findAndCount(this.model, query, skip, limit, queryHelper)
  }

  public async update(id: IdType, data: Partial<T>): Promise<void> {
    await this.model.updateOne({_id: toObjectId(id)} as any, {
      $set: data,
    } as any)
  }

  public async delete(id: IdType): Promise<void> {
    await this.model.deleteOne({_id: toObjectId(id)} as any)
  }
}
