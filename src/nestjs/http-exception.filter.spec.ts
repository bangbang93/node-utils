import 'reflect-metadata'
import {ServiceError} from '@bangbang93/service-errors'
import {
  ArgumentsHost, BadRequestException, ForbiddenException, HttpException, HttpStatus,
  InternalServerErrorException, Logger, NotFoundException, UnauthorizedException,
} from '@nestjs/common'
import {ConfigService} from '@nestjs/config'
import {VError} from 'verror'
import {HttpExceptionFilter} from './http-exception.filter'

const INTERNAL = 'connect ECONNREFUSED 10.0.0.5:27017'
const REMOTE_PORT = 51234
const GRPC_CODE_UNKNOWN = 2
const SERVER_ERROR = HttpStatus.INTERNAL_SERVER_ERROR
const dbError = (): Error => new Error(INTERNAL)
const grpcError = (details: string): Error => Object.assign(new Error('2 UNKNOWN'), {code: GRPC_CODE_UNKNOWN, details})

const GENERIC_RESPONSE = {
  $isServiceError: true,
  code: 'COMMON_UNKNOWN',
  message: '未知错误',
  name: 'ServiceError',
  data: {},
}

interface CapturedResponse {
  status?: number
  type?: string
  body?: string
}

interface RequestOptions {
  body?: unknown
  headersSent?: boolean
}

interface LoggedRequest {
  method: string
  url: string
  remoteAddress?: string
  remotePort?: number
  body: unknown
}

function catchWithError(filter: HttpExceptionFilter, err: Error, options: RequestOptions = {}): CapturedResponse {
  const captured: CapturedResponse = {}
  const req = {
    id: 'req-1',
    method: 'POST',
    originalUrl: '/api/admin/login?token=query-tk',
    socket: {remoteAddress: '10.9.8.7', remotePort: REMOTE_PORT},
    body: options.body,
  }
  const res = {
    headersSent: options.headersSent ?? false,
    status: (code: number) => {
      captured.status = code
      return res
    },
    type: (value: string) => {
      captured.type = value
      return res
    },
    end: (body?: string) => {
      captured.body = body
      return res
    },
  }
  const host = {switchToHttp: () => ({getRequest: () => req, getResponse: () => res})}
  filter.catch(err, host as unknown as ArgumentsHost)
  return captured
}

function parseBody(captured: CapturedResponse): Record<string, unknown> {
  return JSON.parse(captured.body ?? '') as Record<string, unknown>
}

const production = (): HttpExceptionFilter => new HttpExceptionFilter('production')
const development = (): HttpExceptionFilter => new HttpExceptionFilter('development')

const STATUS_CASES: [string, () => Error, HttpStatus, string, string][] = [
  ['NotFoundException', () => new NotFoundException('article not found'), HttpStatus.NOT_FOUND,
    'COMMON_NO_SUCH_OBJECT', 'article not found'],
  ['UnauthorizedException', () => new UnauthorizedException(), HttpStatus.UNAUTHORIZED,
    'COMMON_NEED_LOGIN', 'Unauthorized'],
  ['ForbiddenException', () => new ForbiddenException('用户名或密码错误'), HttpStatus.FORBIDDEN,
    'COMMON_PERMISSION_DENIED', '用户名或密码错误'],
]

describe('HttpExceptionFilter', () => {
  let warn: jest.SpyInstance
  let error: jest.SpyInstance

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation()
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation()
  })

  afterEach(() => {
    warn.mockRestore()
    error.mockRestore()
  })

  const loggedRequest = (spy: jest.SpyInstance): LoggedRequest => spy.mock.calls[0][0].req as LoggedRequest

  describe('response body', () => {
    it('should keep the public message of HttpException and map its status to an error code', () => {
      const captured = catchWithError(production(), new BadRequestException('id must be mongoid'))

      expect(captured.status).toBe(HttpStatus.BAD_REQUEST)
      expect(captured.type).toBe('json')
      expect(parseBody(captured)).toEqual({
        $isServiceError: true,
        code: 'COMMON_INVALID_PARAMETER',
        message: 'id must be mongoid',
        name: 'ServiceError',
        data: {},
        httpCode: HttpStatus.BAD_REQUEST,
      })
    })

    it('should join the array message of ValidationPipe with a Chinese semicolon', () => {
      const captured = catchWithError(production(), new BadRequestException({
        message: ['page must be a number', 'page must be >= 1'],
        error: 'Bad Request',
        statusCode: HttpStatus.BAD_REQUEST,
      }))

      expect(parseBody(captured)).toMatchObject({
        code: 'COMMON_INVALID_PARAMETER',
        message: 'page must be a number；page must be >= 1',
      })
    })

    it.each(STATUS_CASES)('should map %s to its status code', (_name, makeError, status, code, message) => {
      expect(parseBody(catchWithError(production(), makeError()))).toEqual({
        $isServiceError: true,
        code,
        message,
        name: 'ServiceError',
        data: {},
        httpCode: status,
      })
    })

    it('should keep COMMON_UNKNOWN and the message for statuses without a mapping', () => {
      const captured = catchWithError(production(), new HttpException('尝试过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS))

      expect(captured.status).toBe(HttpStatus.TOO_MANY_REQUESTS)
      expect(parseBody(captured)).toMatchObject({
        code: 'COMMON_UNKNOWN',
        message: '尝试过于频繁，请稍后再试',
        httpCode: HttpStatus.TOO_MANY_REQUESTS,
      })
    })

    it('should fall back to the HttpException own message when its response has no message', () => {
      const captured = catchWithError(production(), new HttpException({error: 'Nope'}, HttpStatus.BAD_REQUEST))

      expect(parseBody(captured)).toMatchObject({code: 'COMMON_INVALID_PARAMETER', message: 'Http Exception'})
    })

    it('should keep stack, cause and the full message outside production', () => {
      const badRequest = parseBody(catchWithError(development(), new BadRequestException('id must be mongoid')))
      expect(badRequest).toEqual({
        $isServiceError: true,
        code: 'COMMON_INVALID_PARAMETER',
        stack: expect.any(String),
        message: 'id must be mongoid',
        name: 'ServiceError',
        data: {},
        httpCode: HttpStatus.BAD_REQUEST,
      })

      const unknown = parseBody(catchWithError(development(), dbError()))
      expect(unknown.message).toBe(`未知错误: ${INTERNAL}`)
      expect(unknown.stack).toEqual(expect.stringContaining(INTERNAL))
      expect(unknown.cause).toBeDefined()
    })
  })

  describe('production response', () => {
    it('should return only the generic message for unknown errors', () => {
      const captured = catchWithError(production(), dbError())

      expect(captured.status).toBe(SERVER_ERROR)
      expect(parseBody(captured)).toEqual(GENERIC_RESPONSE)
    })

    it('should return the message of a ServiceError without cause', () => {
      const err = new ServiceError('ARTICLE_QUERY_FAILED', 'article not available', {httpCode: HttpStatus.BAD_REQUEST})

      expect(parseBody(catchWithError(production(), err))).toEqual({
        $isServiceError: true,
        code: 'ARTICLE_QUERY_FAILED',
        message: 'article not available',
        name: 'ServiceError',
        data: {},
        httpCode: HttpStatus.BAD_REQUEST,
      })
    })

    it('should replace the message of a ServiceError carrying a cause', () => {
      const err = new ServiceError('ARTICLE_QUERY_FAILED', 'query failed', {
        causedBy: dbError(),
        httpCode: SERVER_ERROR,
      })

      expect(parseBody(catchWithError(production(), err))).toEqual({
        ...GENERIC_RESPONSE,
        code: 'ARTICLE_QUERY_FAILED',
        httpCode: SERVER_ERROR,
      })
    })

    it('should expose only the public message of an HttpException carrying a cause', () => {
      const captured = catchWithError(production(), new InternalServerErrorException('boom', {cause: dbError()}))

      expect(parseBody(captured)).toEqual({
        ...GENERIC_RESPONSE,
        message: 'boom',
        httpCode: SERVER_ERROR,
      })
    })

    it('should return only the generic message for other error types such as VError', () => {
      expect(parseBody(catchWithError(production(), new VError(dbError(), 'lookup failed')))).toEqual(GENERIC_RESPONSE)
    })

    describe('errors forwarded over gRPC', () => {
      it('should hide an upstream error wrapped by fromError', () => {
        const captured = catchWithError(production(), grpcError(JSON.stringify(ServiceError.fromError(dbError()))))

        expect(captured.status).toBe(SERVER_ERROR)
        expect(parseBody(captured)).toEqual(GENERIC_RESPONSE)
      })

      it('should keep code, message and status of an upstream ServiceError without cause', () => {
        const upstream = new ServiceError('ARTICLE_NOT_FOUND', 'article not found', {httpCode: HttpStatus.NOT_FOUND})

        expect(parseBody(catchWithError(production(), grpcError(JSON.stringify(upstream))))).toEqual({
          $isServiceError: true,
          code: 'ARTICLE_NOT_FOUND',
          message: 'article not found',
          name: 'ServiceError',
          data: {},
          httpCode: HttpStatus.NOT_FOUND,
        })
      })

      it('should treat details that are not a ServiceError as internal', () => {
        const captured = catchWithError(production(), grpcError(JSON.stringify({message: INTERNAL})))

        expect(parseBody(captured)).toEqual({...GENERIC_RESPONSE, httpCode: SERVER_ERROR})
      })

      it('should treat details that are not JSON as internal', () => {
        const captured = catchWithError(production(), grpcError(`${INTERNAL} in details`))

        expect(parseBody(captured)).toEqual({...GENERIC_RESPONSE, httpCode: SERVER_ERROR})
      })

      it('should keep the upstream message outside production', () => {
        const upstream = ServiceError.fromError(dbError())

        const captured = catchWithError(development(), grpcError(JSON.stringify(upstream)))

        expect(parseBody(captured).message).toBe(upstream.message)
      })
    })
  })

  describe('logging', () => {
    it('should log 4xx with warn and 5xx with error', () => {
      catchWithError(production(), new BadRequestException('bad'))
      expect(warn).toHaveBeenCalledTimes(1)
      expect(error).not.toHaveBeenCalled()

      warn.mockClear()
      const unavailable = new ServiceError('SERVICE_UNAVAILABLE', 'down', {httpCode: HttpStatus.SERVICE_UNAVAILABLE})
      catchWithError(production(), unavailable)
      expect(warn).not.toHaveBeenCalled()
      expect(error).toHaveBeenCalledTimes(1)
    })

    it('should log the ServiceError with the request id', () => {
      catchWithError(production(), new BadRequestException('bad'))

      const log = warn.mock.calls[0][0] as {err: unknown; reqId: string}
      expect(log.reqId).toBe('req-1')
      expect(ServiceError.isServiceError(log.err)).toBe(true)
    })

    it('should redact the request body and URL before logging, leaving the request body untouched', () => {
      const body = {
        username: 'admin',
        password: 'S3cret!',
        profile: {apiKey: 'k1', password: 'nested-pw'},
      }

      catchWithError(production(), new ForbiddenException('用户名或密码错误'), {body})

      expect(loggedRequest(warn)).toEqual({
        method: 'POST',
        url: '/api/admin/login?token=[filtered]',
        remoteAddress: '10.9.8.7',
        remotePort: REMOTE_PORT,
        body: {username: 'admin', password: '[filtered]', profile: {apiKey: 'k1', password: '[filtered]'}},
      })
      expect(body.password).toBe('S3cret!')
      expect(body.profile.password).toBe('nested-pw')
    })
  })

  describe('environment', () => {
    it('should treat a missing configuration as non-production', () => {
      expect(parseBody(catchWithError(new HttpExceptionFilter(), dbError())).message).toBe(`未知错误: ${INTERNAL}`)
    })

    it('should read NODE_ENV from ConfigService', () => {
      const get = jest.fn().mockReturnValue('production')
      const filter = new HttpExceptionFilter({get} as unknown as ConfigService)

      expect(parseBody(catchWithError(filter, dbError())).message).toBe('未知错误')
      expect(get).toHaveBeenCalledWith('NODE_ENV', 'development')
    })

    it('should not write a response once headers are sent', () => {
      const captured = catchWithError(production(), new BadRequestException('bad'), {headersSent: true})

      expect(captured).toEqual({})
      expect(warn).toHaveBeenCalledTimes(1)
    })
  })
})
