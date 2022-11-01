import {Connection, QueryRunner} from 'typeorm'
import {ReplicationMode} from 'typeorm/driver/types/ReplicationMode'

/**
 * withTransaction for typeorm
 * @param fn
 * @param connection
 * @param qr
 * @param mode
 */
export async function withTransaction<T>(
  fn: (qr: QueryRunner) => Promise<T>,
  connection: Connection,
  qr?: QueryRunner,
  mode?: ReplicationMode,
): Promise<T> {
  if (qr) {
    return fn(qr)
  }
  qr = connection.createQueryRunner(mode)
  await qr.connect()
  await qr.startTransaction()
  try {
    const ret = await fn(qr)
    await qr.commitTransaction()
    return ret
  } catch (e) {
    await qr.rollbackTransaction()
    throw e
  } finally {
    await qr.release()
  }
}
