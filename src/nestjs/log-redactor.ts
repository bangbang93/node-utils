import {createRedactor, ValueTypeName} from '@hackylabs/deep-redact'

const SENSITIVE_KEY = /password|secret|token/i
const FILTERED = '[filtered]'
const QUERY_PARAM = /[?&][^=&#]+=[^&#]*/g
const ALL_VALUE_TYPES: readonly ValueTypeName[] = [
  'string', 'number', 'bigint', 'boolean', 'object', 'function', 'symbol', 'undefined',
]

function scrubQueryParam(value: string): string {
  return value.replace(QUERY_PARAM, (match) => {
    const separator = match.indexOf('=')
    return SENSITIVE_KEY.test(match.slice(1, separator))
      ? match.slice(0, separator + 1) + FILTERED
      : match
  })
}

const redactor = createRedactor({
  keys: [SENSITIVE_KEY],
  censor: FILTERED,
  types: ALL_VALUE_TYPES,
  // 预算耗尽时截断剩余部分，不抛错
  onBudgetExceeded: 'truncate',
  stringTests: [{pattern: QUERY_PARAM, replacer: scrubQueryParam}],
})

/**
 * 返回可用于日志的副本：任意深度的敏感键、URL 查询参数中的敏感值替换为 [filtered]，入参不变；类实例会变成普通对象。
 */
export function redactForLog(value: unknown): unknown {
  return redactor(value)
}
