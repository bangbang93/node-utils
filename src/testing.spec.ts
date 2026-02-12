import {createMocker} from './testing'

describe('testing', () => {
  it('should return an object with moduleMocker property and mock function', () => {
    const mocker = createMocker()
    expect(mocker).toHaveProperty('moduleMocker')
    expect(mocker).toHaveProperty('mock')
    expect(typeof mocker.moduleMocker).toBe('object')
    expect(typeof mocker.mock).toBe('function')
  })

  it('should call fallback function if token is not class', () => {
    const fallback = jest.fn()
    const mocker = createMocker(fallback)
    const token = 'token'
    const mock = mocker.mock(token)
    expect(fallback).toHaveBeenCalledTimes(1)
    expect(fallback).toHaveBeenCalledWith(token)
    expect(mock).toBeUndefined()
  })

  it('should call fallback function if token is class', () => {
    const fallback = jest.fn()
    const mocker = createMocker(fallback)
    const token = class {}
    const mock = mocker.mock(token)
    expect(fallback).toHaveBeenCalledTimes(0)
    expect(mock).toEqual(new token())
  })
})
