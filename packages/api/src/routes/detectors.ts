import { Router } from 'express'
import { SDKDetectorSchemaZod } from '../schemas'
import { requireAuth } from '../middleware'
import { store, saveDetectors } from '../store'

const router = Router()

router.post('/', requireAuth, (req, res) => {
  const apiKey: string = res.locals.apiKey

  const parsed = SDKDetectorSchemaZod.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid detector config', issues: parsed.error.issues }); return }

  const updated = (store.detectors.get(apiKey) ?? []).filter(d => d.name !== parsed.data.name)
  updated.push(parsed.data)
  saveDetectors(apiKey, updated)
  res.json({ ok: true, registered: updated.length })
})

router.delete('/:name', requireAuth, (req, res) => {
  const apiKey: string = res.locals.apiKey
  saveDetectors(apiKey, (store.detectors.get(apiKey) ?? []).filter(d => d.name !== req.params.name))
  res.json({ ok: true })
})

export default router
