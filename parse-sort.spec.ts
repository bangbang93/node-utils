import {parseSort, parseSortMongo, parseSortMysql} from './parse-sort'

describe('parseSort', () => {
  describe('风格选项', () => {
    it('应该默认使用mongo风格', () => {
      expect(parseSort('foo')).toEqual({foo: 1})
      expect(parseSort('-foo')).toEqual({foo: -1})
    })

    it('应该在指定时使用mongo风格', () => {
      expect(parseSort('foo', {flavor: 'mongo'})).toEqual({foo: 1})
      expect(parseSort('-foo', {flavor: 'mongo'})).toEqual({foo: -1})
    })

    it('应该在指定时使用mysql风格', () => {
      expect(parseSort('foo', {flavor: 'mysql'})).toEqual({foo: 'ASC'})
      expect(parseSort('-foo', {flavor: 'mysql'})).toEqual({foo: 'DESC'})
    })

    it('应该使用mysql风格处理混合字段', () => {
      expect(parseSort('-foo,bar,+baz', {flavor: 'mysql'})).toEqual({
        foo: 'DESC',
        bar: 'ASC',
        baz: 'ASC',
      })
    })
  })

  describe('边界情况', () => {
    it('应该处理空字符串', () => {
      expect(parseSort('')).toEqual({})
    })

    it('应该处理只有逗号的字符串', () => {
      expect(parseSort(',,,,')).toEqual({})
    })

    it('应该处理只有空格的字符串', () => {
      expect(parseSort('   ')).toEqual({})
    })

    it('应该处理多个连续逗号', () => {
      expect(parseSort('foo,,,bar')).toEqual({foo: 1, bar: 1})
    })

    it('应该处理只有前缀符号的字段', () => {
      expect(parseSort('-,+')).toEqual({})
    })
  })

  describe('复杂场景下的allowFields', () => {
    it('应该过滤混合升序和降序字段', () => {
      expect(parseSort('-foo,bar,+baz', {allowFields: ['foo', 'baz']})).toEqual({
        foo: -1,
        baz: 1,
      })
    })

    it('应该支持空的allowFields数组', () => {
      expect(parseSort('foo,bar', {allowFields: []})).toEqual({})
    })

    it('字段名应该区分大小写', () => {
      expect(parseSort('Foo,foo', {allowFields: ['foo']})).toEqual({foo: 1})
    })
  })

  describe('parseSortMongo', () => {
    it('应该返回mongo格式的值', () => {
      expect(parseSortMongo('foo,-bar')).toEqual({foo: 1, bar: -1})
    })

    it('应该支持allowFields选项', () => {
      expect(parseSortMongo('foo,bar', {allowFields: ['foo']})).toEqual({foo: 1})
    })
  })

  describe('parseSortMysql', () => {
    it('应该返回mysql格式的值', () => {
      expect(parseSortMysql('foo,-bar')).toEqual({foo: 'ASC', bar: 'DESC'})
    })

    it('应该支持allowFields选项', () => {
      expect(parseSortMysql('foo,bar', {allowFields: ['bar']})).toEqual({bar: 'ASC'})
    })
  })
})
