import {
  clearBit, clearBitEnum,
  isBitEnumNotSet, isBitEnumSet, isBitNotSet, isBitSet, setBit, setBitEnum, toggleBit, toggleEnumBit,
} from './bitwise'

describe('Bitwise', () => {
  describe('isBitSet', () => {
    it('should return true when the bit at the specified position is set in the given number', () => {
      expect(isBitSet(5, 0)).toBe(true)
      expect(isBitSet(10, 1)).toBe(true)
      expect(isBitSet(15, 2)).toBe(true)
    })

    it('should return false when the bit at the specified position is not set in the given number', () => {
      expect(isBitSet(5, 1)).toBe(false)
      expect(isBitSet(10, 2)).toBe(false)
      expect(isBitSet(16, 3)).toBe(false)
    })
  })

  describe('isBitEnumSet', () => {
    it('should return true when the bit at the specified position is set in the given number', () => {
      expect(isBitEnumSet(5, 2 ** 0)).toBe(true)
      expect(isBitEnumSet(10, 2 ** 1)).toBe(true)
      expect(isBitEnumSet(15, 2 ** 2)).toBe(true)
    })

    it('should return false when the bit at the specified position is not set in the given number', () => {
      expect(isBitEnumSet(5, 2 ** 1)).toBe(false)
      expect(isBitEnumSet(10, 2 ** 2)).toBe(false)
      expect(isBitEnumSet(16, 2 ** 3)).toBe(false)
    })
  })

  describe('isBitNotSet', () => {
    it('should return true when the bit at the specified position is not set in the given number', () => {
      expect(isBitNotSet(5, 1)).toBe(true)
      expect(isBitNotSet(10, 2)).toBe(true)
      expect(isBitNotSet(16, 3)).toBe(true)
    })

    it('should return false when the bit at the specified position is set in the given number', () => {
      expect(isBitNotSet(5, 0)).toBe(false)
      expect(isBitNotSet(10, 1)).toBe(false)
      expect(isBitNotSet(15, 2)).toBe(false)
    })
  })

  describe('isBitEnumNotSet', () => {
    it('should return true when the bit at the specified position is not set in the given number', () => {
      expect(isBitEnumNotSet(5, 2 ** 1)).toBe(true)
      expect(isBitEnumNotSet(10, 2 ** 2)).toBe(true)
      expect(isBitEnumNotSet(16, 2 ** 3)).toBe(true)
    })

    it('should return false when the bit at the specified position is set in the given number', () => {
      expect(isBitEnumNotSet(5, 2 ** 0)).toBe(false)
      expect(isBitEnumNotSet(10, 2 ** 1)).toBe(false)
      expect(isBitEnumNotSet(15, 2 ** 2)).toBe(false)
    })
  })

  describe('setBit', () => {
    it('should set the bit at the specified position in the given number', () => {
      expect(setBit(5, 1)).toBe(7)
      expect(setBit(10, 2)).toBe(14)
      expect(setBit(15, 3)).toBe(15)
    })
  })

  describe('setEnumBit', () => {
    it('should set the bit at the specified position in the given number', () => {
      expect(setBitEnum(5, 2 ** 1)).toBe(7)
      expect(setBitEnum(10, 2 ** 2)).toBe(14)
      expect(setBitEnum(15, 2 ** 3)).toBe(15)
    })
  })

  describe('clearBit', () => {
    it('should clear the bit at the specified position in the given number', () => {
      expect(clearBit(5, 0)).toBe(4)
      expect(clearBit(10, 1)).toBe(8)
      expect(clearBit(15, 2)).toBe(11)
    })
  })

  describe('clearEnumBit', () => {
    it('should clear the bit at the specified position in the given number', () => {
      expect(clearBitEnum(5, 2 ** 0)).toBe(4)
      expect(clearBitEnum(10, 2 ** 1)).toBe(8)
      expect(clearBitEnum(15, 2 ** 2)).toBe(11)
    })
  })

  describe('toggleBit', () => {
    it('should toggle the bit at the specified position in the given number', () => {
      expect(toggleBit(5, 0)).toBe(4)
      expect(toggleBit(10, 1)).toBe(8)
      expect(toggleBit(15, 2)).toBe(11)
    })
  })

  describe('toggleEnumBit', () => {
    it('should toggle the bit at the specified position in the given number', () => {
      expect(toggleEnumBit(5, 2 ** 0)).toBe(4)
      expect(toggleEnumBit(10, 2 ** 1)).toBe(8)
      expect(toggleEnumBit(15, 2 ** 2)).toBe(11)
    })
  })
})
