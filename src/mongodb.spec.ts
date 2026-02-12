import {createMock} from '@golevelup/ts-jest'
import {ClientSession, Connection, Types} from 'mongoose'
import {RichModelType} from 'mongoose-typescript'
import {
  findAndCount, isObjectIdEqual, makeMongoRegexp, mongoBetween, StringIdObject, toObjectId, withSession,
} from './mongodb'
import ObjectId = Types.ObjectId

describe('mongodb', () => {
  describe('toObjectId', () => {
    it('should throw error if id is empty', () => {
      expect(() => toObjectId('')).toThrow('id cannot be empty')
    })

    it('should return ObjectId if id is string', () => {
      expect(toObjectId('5a9f5f9e6d1d1e1f1c1b1a19')).toEqual(new Types.ObjectId('5a9f5f9e6d1d1e1f1c1b1a19'))
    })

    it('should return ObjectId if id is ObjectId', () => {
      const id = new Types.ObjectId('5a9f5f9e6d1d1e1f1c1b1a19')
      expect(toObjectId(id)).toEqual(id)
    })
  })

  describe('makeMongoRegexp', () => {
    it('should return RegExp with default options', () => {
      expect(makeMongoRegexp('abc')).toEqual({
        $regex: 'abc',
        $options: 'i',
      })
    })

    it('should return RegExp with custom options', () => {
      expect(makeMongoRegexp('abc', 'g')).toEqual({
        $regex: 'abc',
        $options: 'g',
      })
    })
  })

  describe('mongoBetween', () => {
    it('should return query with between', () => {
      expect(mongoBetween(['abc', 'def'])).toEqual({
        $gte: 'abc',
        $lte: 'def',
      })
    })
  })

  describe('isObjectIdEqual', () => {
    it('string vs string', () => {
      expect(isObjectIdEqual('5a9f5f9e6d1d1e1f1c1b1a19', '5a9f5f9e6d1d1e1f1c1b1a19')).toBe(true)
      expect(isObjectIdEqual('5a9f5f9e6d1d1e1f1c1b1a19', '5a9f5f9e6d1d1e1f1c1b1a18')).toBe(false)
    })

    it('string vs ObjectId', () => {
      expect(isObjectIdEqual('5a9f5f9e6d1d1e1f1c1b1a19', new Types.ObjectId('5a9f5f9e6d1d1e1f1c1b1a19'))).toBe(true)
      expect(isObjectIdEqual('5a9f5f9e6d1d1e1f1c1b1a19', new Types.ObjectId('5a9f5f9e6d1d1e1f1c1b1a18'))).toBe(false)
    })

    it('ObjectId vs string', () => {
      expect(isObjectIdEqual(new Types.ObjectId('5a9f5f9e6d1d1e1f1c1b1a19'), '5a9f5f9e6d1d1e1f1c1b1a19')).toBe(true)
      expect(isObjectIdEqual(new Types.ObjectId('5a9f5f9e6d1d1e1f1c1b1a19'), '5a9f5f9e6d1d1e1f1c1b1a18')).toBe(false)
    })

    it('ObjectId vs ObjectId', () => {
      expect(isObjectIdEqual(new Types.ObjectId('5a9f5f9e6d1d1e1f1c1b1a19'),
        new Types.ObjectId('5a9f5f9e6d1d1e1f1c1b1a19'))).toBe(true)
      expect(isObjectIdEqual(new Types.ObjectId('5a9f5f9e6d1d1e1f1c1b1a19'),
        new Types.ObjectId('5a9f5f9e6d1d1e1f1c1b1a18'))).toBe(false)
    })

    it('null vs null', () => {
      expect(isObjectIdEqual(null, null)).toBe(true)
    })

    it('null vs undefined', () => {
      expect(isObjectIdEqual(null, undefined)).toBe(false)
    })
  })

  describe('withSession', () => {
    it('should call callback with session', async () => {
      const session: ClientSession = createMock<ClientSession>({
        withTransaction: jest.fn().mockImplementation((fn) => fn(session)),
      })
      const connection = createMock<Connection>({
        startSession: jest.fn().mockResolvedValue(session),
      })
      const callback = jest.fn()
      await withSession(callback, connection)
      expect(callback).toHaveBeenCalledWith(session)
    })

    it('should call connection.startSession', async () => {
      const session: ClientSession = createMock<ClientSession>({
        withTransaction: jest.fn().mockImplementation((fn) => fn(session)),
      })
      const connection = createMock<Connection>({
        startSession: jest.fn().mockResolvedValue(session),
      })
      const callback = jest.fn()
      await withSession(callback, connection)
      expect(connection.startSession).toHaveBeenCalled()
    })

    it('should call session.withTransaction', async () => {
      const session: ClientSession = createMock<ClientSession>({
        withTransaction: jest.fn().mockImplementation((fn) => fn(session)),
      })
      const connection = createMock<Connection>({
        startSession: jest.fn().mockResolvedValue(session),
      })
      const callback = jest.fn()
      await withSession(callback, connection)
      expect(session.withTransaction).toHaveBeenCalled()
    })
  })

  describe('StringIdObject', () => {
    it('should match type', () => {
      interface Test {
        userId: ObjectId
        aId?: ObjectId
        other: ObjectId
      }

      const target: StringIdObject<Test> = {
        userId: 'abc',
        aId: 'abc',
        // @ts-expect-error other should be ObjectId
        other: 'abc',
      }

      const target2: StringIdObject<Test, 'userId' | 'other'> = {
        userId: 'abc',
        // @ts-expect-error aId should be ObjectId
        aId: 'abc',
        other: 'abc',
      }

      const target3: StringIdObject<Test> = {
        userId: 'abc',
        other: new ObjectId(),
      }

      expect(target.userId).toBe('abc')
      expect(target2.userId).toBe('abc')
      expect(target3.userId).toBe('abc')
    })
  })

  describe('findAndCount', () => {
    it('应该返回正确的数据和计数当查询有效时', async () => {
      const model = {
        find: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{id: 1}, {id: 2}]),
        countDocuments: jest.fn().mockResolvedValue(2),
      } as RichModelType<any>
      const query = {name: 'test'}
      const result = await findAndCount(model, query, 0, 10)
      expect(result.data).toEqual([{id: 1}, {id: 2}])
      expect(result.count).toBe(2)
    })

    it('应该处理无效的查询对象', async () => {
      const model = {
        find: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Invalid query')),
        countDocuments: jest.fn().mockResolvedValue(0),
      } as RichModelType<any>
      const query = {invalidField: 'test'}
      await expect(findAndCount(model, query, 0, 10)).rejects.toThrow('Invalid query')
    })

    it('如果给了sort方法，应当可以sort', () => {
      // Mock data
      const mockModel = {
        find: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
        countDocuments: jest.fn().mockResolvedValue(0),
      } as RichModelType<any>

      const query = {}
      const skip = 0
      const limit = 10
      const sort = 'createdAt'

      return findAndCount(mockModel, query, skip, limit, sort).then(() => {
        expect(mockModel.find).toHaveBeenCalledWith(query)
        expect(mockModel.skip).toHaveBeenCalledWith(skip)
        expect(mockModel.limit).toHaveBeenCalledWith(limit)
        expect(mockModel.sort).toHaveBeenCalledWith(sort)
        expect(mockModel.exec).toHaveBeenCalled()
        expect(mockModel.countDocuments).toHaveBeenCalledWith(query)
      })
    })

    it('应当执行queryHelper', async () => {
      const model = {
        find: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
        countDocuments: jest.fn().mockResolvedValue(5),
      } as RichModelType<any>
      const query = {}
      const skip = 0
      const limit = 10
      const sort = 'createdAt'
      const queryHelper = jest.fn()

      await findAndCount(model, query, skip, limit, sort, queryHelper)

      expect(queryHelper).toHaveBeenCalled()
    })


    it('应当可以省略sort，直接给queryHelper（向后兼容）', async () => {
      const model = {
        find: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
        countDocuments: jest.fn().mockResolvedValue(5),
      } as RichModelType<any>
      const query = {}
      const skip = 0
      const limit = 10
      const queryHelper = jest.fn()

      await findAndCount(model, query, skip, limit, queryHelper)

      expect(queryHelper).toHaveBeenCalled()
    })
  })
})
