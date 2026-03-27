export async function AIRetryOnFail<T>(
  fn: () => Promise<T>,
  retries: number,
  shouldAbort?: (err: unknown) => boolean
): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (shouldAbort?.(err) || i === retries) throw err
      await new Promise(res => setTimeout(res, Math.pow(2, i) * 500))
    }
  }
  throw new Error('AIRetryOnFail: unreachable')
}
