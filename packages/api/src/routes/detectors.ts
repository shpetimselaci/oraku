import { Router } from 'express'
import type { SDKDetectorSchema } from '@oraku/brain'
import { requireAuth } from '../middleware'
import { store, saveDetectors } from '../store'

const router = Router()

router.post('/', requireAuth, (req, res) => {
  const apiKey: string = res.locals.apiKey
  const config: SDKDetectorSchema = req.body
  if (!config.name || !config.type) { res.status(400).json({ error: 'name and type are required' }); return }

  const updated = (store.detectors.get(apiKey) ?? []).filter(d => d.name !== config.name)
  updated.push(config)
  saveDetectors(apiKey, updated)
  res.json({ ok: true, registered: updated.length })
})

router.delete('/:name', requireAuth, (req, res) => {
  const apiKey: string = res.locals.apiKey
  saveDetectors(apiKey, (store.detectors.get(apiKey) ?? []).filter(d => d.name !== req.params.name))
  res.json({ ok: true })
})

export default router
