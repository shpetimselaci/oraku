import type { Request, Response, NextFunction } from 'express'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-api-key'] as string
  if (!key) {
    console.warn(`[auth] Missing API key — ${req.method} ${req.path} from ${req.ip}`)
    res.status(401).json({ error: 'Missing x-api-key header' })
    return
  }
  res.locals.apiKey = key
  next()
}
