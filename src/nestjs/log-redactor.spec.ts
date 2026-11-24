import {redactForLog} from './log-redactor'

class LoginDto {
  username!: string
  password!: string
}

describe('redactForLog', () => {
  it('should redact sensitive keys at any depth, case-insensitively and by substring', () => {
    expect(redactForLog({
      username: 'admin',
      password: 'top-level',
      profile: {apiKey: 'k1', PASSWORD: 'nested', tokens: ['t1']},
      items: [{name: 'a', clientSecret: 'in-array'}],
    })).toEqual({
      username: 'admin',
      password: '[filtered]',
      profile: {apiKey: 'k1', PASSWORD: '[filtered]', tokens: '[filtered]'},
      items: [{name: 'a', clientSecret: '[filtered]'}],
    })
  })

  it('should redact non-string values under sensitive keys as a whole', () => {
    expect(redactForLog({password: 123456, secret: {raw: 'x'}, remember: true})).toEqual({
      password: '[filtered]',
      secret: '[filtered]',
      remember: true,
    })
  })

  it('should walk DTO instances and return a plain object', () => {
    const dto = Object.assign(new LoginDto(), {username: 'admin', password: 'dto-pw'})

    const result = redactForLog(dto) as object

    expect(result).toEqual({username: 'admin', password: '[filtered]'})
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
  })

  it('should leave the input untouched', () => {
    const input = {password: 'p', nested: {token: 't'}}

    redactForLog(input)

    expect(input).toEqual({password: 'p', nested: {token: 't'}})
  })

  it('should redact sensitive query params and keep the rest of the URL', () => {
    expect(redactForLog({url: '/api/reset?token=t0ken&email=a@b.c&password=pw#frag'})).toEqual({
      url: '/api/reset?token=[filtered]&email=a@b.c&password=[filtered]#frag',
    })
  })

  it('should keep non-sensitive values as they are', () => {
    const file = Buffer.from('abc')
    const when = new Date(0)

    const result = redactForLog({file, when, count: 5, note: 'hello world', nothing: null}) as Record<string, unknown>

    expect(result).toEqual({file, when, count: 5, note: 'hello world', nothing: null})
    expect(Buffer.isBuffer(result.file)).toBe(true)
  })

  it('should not throw on circular references or when the traversal budget is exceeded', () => {
    const cyclic: {password: string; self?: unknown} = {password: 'c-pw'}
    cyclic.self = cyclic
    expect(() => redactForLog(cyclic)).not.toThrow()

    const nodesBeyondBudget = 60000
    const large = {password: 'l-pw', list: Array.from({length: nodesBeyondBudget}, (_, i) => ({i}))}
    const result = redactForLog(large) as {password: string; list: unknown[]}
    expect(result.password).toBe('[filtered]')
    expect(result.list.length).toBeLessThan(nodesBeyondBudget)
    expect(JSON.stringify(result)).toContain('[TRUNCATED]')
  })
})
