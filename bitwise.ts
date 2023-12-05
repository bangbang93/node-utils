/**
 * 比特位是否设置
 * @param num
 * @param bit **位数**
 */
export function isBitSet(num: number, bit: number): boolean {
  return (num >> bit) % 2 !== 0
}

/**
 * 比特位是否设置
 * @param num
 * @param bit **值**
 */
export function isBitEnumSet(num: number, bit: number): boolean {
  return (num & bit) !== 0
}

/**
 * 比特位是否未设置
 * @param num
 * @param bit **位数**
 */
export function isBitNotSet(num: number, bit: number): boolean {
  return (num >> bit) % 2 === 0
}

/**
 * 比特位是否未设置
 * @param num
 * @param bit **值**
 */
export function isBitEnumNotSet(num: number, bit: number): boolean {
  return (num & bit) === 0
}

/**
 * 设置比特位
 * @param num
 * @param bit **位数**
 */
export function setBit(num: number, bit: number): number {
  return num | 1 << bit
}

/**
 * 设置比特位
 * @param num
 * @param bit **值**
 */
export function setBitEnum(num: number, bit: number): number {
  return num | bit
}

/**
 * 清除比特位
 * @param num
 * @param bit **位数**
 */
export function clearBit(num: number, bit: number): number {
  return num & ~(1 << bit)
}

/**
 * 清除比特位
 * @param num
 * @param bit **值**
 */
export function clearBitEnum(num: number, bit: number): number {
  return num & ~bit
}

/**
 * 反转比特位
 * @param num
 * @param bit **位数**
 */
export function toggleBit(num: number, bit: number): number {
  return num ^ 1 << bit
}

/**
 * 反转比特位
 * @param num
 * @param bit **值**
 */
export function toggleEnumBit(num: number, bit: number): number {
  return num ^ bit
}
