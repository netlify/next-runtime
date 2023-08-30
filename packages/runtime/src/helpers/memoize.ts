// TODO: put in utils
type MemoizeCache = {
  [key: string]: unknown
}

export const memoize = <T extends (...args: unknown[]) => unknown>(fn: T): T => {
  const cache: MemoizeCache = {}

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args)

    if (cache[key] === undefined) {
      const result = fn(...args)
      cache[key] = result
    }

    return cache[key] as ReturnType<T>
  }) as T
}
