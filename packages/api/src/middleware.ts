import type { Request, Response, NextFunction } from 'express'
import { validateApiKey, logAudit } from './api-keys'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-api-key'] as string
  if (!key) {
    res.status(401).json({ error: 'Missing x-api-key header' })
    return
  }
  const result = validateApiKey(key)
  if (!result) {
    res.status(401).json({ error: 'Invalid or revoked API key' })
    return
  }
  res.locals.projectId = result.projectId
  res.locals.scopes = result.scopes
  res.on('finish', () => {
    logAudit({
      api_key: result.keyHash,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ip: req.ip ?? ''
    })
  })
  next()
}

export function requireScope(scope: string) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const scopes: string[] = res.locals.scopes ?? []
    if (!scopes.includes(scope)) {
      res.status(403).json({ error: `Missing required scope: ${scope}` })
      return
    }
    next()
  }
}
