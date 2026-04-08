import * as fs from 'fs'
import * as path from 'path'
import type { ExpectedItem, ApiMatcherConfig } from '../../types'

export async function fetchWithTimeout(url: string, timeout = 5000): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

export function buildApiItemMatcher(apiConfig: ApiMatcherConfig) {
  const {
    url,
    transform,
    match,
    maxItems = 5,
    timeout = 3000,
    cacheKey,
    cachePath = path.resolve(process.cwd(), 'output', 'api_cache.json')
  } = apiConfig

  let cache: Record<string, unknown> | null = null

  function loadCache(): Record<string, unknown> {
    if (cache !== null) return cache
    try {
      cache = JSON.parse(fs.readFileSync(cachePath, 'utf8') || '{}')
    } catch {
      cache = {}
    }
    return cache!
  }

  function saveCacheToDisk(): void {
    if (cache === null) return
    try {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true })
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2))
    } catch {
      // ignore persist errors
    }
  }

  return async (
    items: string[],
    expectedItems: ExpectedItem[]
  ): Promise<{ covered: Set<string>; missing: string[] }> => {
    const c = loadCache()
    const covered = new Set<string>()
    const uniqueItems = [...new Set(items)].slice(0, maxItems)

    let cacheUpdated = false
    const results = await Promise.all(
      uniqueItems.map(async (item) => {
        const key = cacheKey ? cacheKey(item) : item
        if (c[key]) return c[key]
        if (process.env.FAST_MODE) return null

        const abortController = new AbortController()
        const timer = setTimeout(() => abortController.abort(), timeout)
        try {
          const response = await fetch(url(item), { signal: abortController.signal })
          if (!response.ok) return null
          const data = await response.json()
          const result = transform ? transform(data) : data
          if (result) { c[key] = result; cacheUpdated = true }
          return result
        } catch {
          return null
        } finally {
          clearTimeout(timer)
        }
      })
    )
    if (cacheUpdated) saveCacheToDisk()

    results.filter(Boolean).forEach((result) => {
      expectedItems.forEach((expected) => {
        if (match(result, expected)) covered.add(expected.key)
      })
    })

    return {
      covered,
      missing: expectedItems.map((item) => item.key).filter((key) => !covered.has(key))
    }
  }
}
