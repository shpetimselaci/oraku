import 'dotenv/config'
import express from 'express'
import { initSchema } from '@oraku/brain'
import { initStore } from './store'
import ingestRouter from './scopes/ingest'
import notificationsRouter from './scopes/notifications'
import detectorsRouter from './scopes/detectors'
import projectRouter from './routes/project'
import adminRouter from './routes/admin'

initSchema()
initStore()

const app = express()
app.set('trust proxy', 1)
app.use(express.json({ limit: '10mb' }))

app.use('/ingest', ingestRouter)
app.use('/notifications', notificationsRouter)
app.use('/detectors', detectorsRouter)
app.use(projectRouter)
app.use(adminRouter)

export { app }

if (require.main === module) {
  app.listen(3000, () => console.log('Oraku API running on http://localhost:3000'))
}
