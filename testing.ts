import is, {Class} from '@sindresorhus/is'
import {MockMetadata, ModuleMocker} from 'jest-mock'

type MockFactory = (token: unknown) => unknown

interface IMocker {
  mock: MockFactory
  moduleMocker: ModuleMocker
  reset(): void
}

export function createMocker(fallback?: MockFactory): IMocker {
  const moduleMocker = new ModuleMocker(globalThis)
  return {
    moduleMocker,
    mock: (token: unknown) => {
      if (is.class_(token)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const metadata = moduleMocker.getMetadata(token) as MockMetadata<any, any>
        return new (moduleMocker.generateFromMetadata<Class>(metadata))()
      }
      return fallback?.(token)
    },
    reset: () => {
      moduleMocker.resetAllMocks()
    },
  }
}
