import express from 'express'
import { initSchema } from '@oraku/brain/src/db/schema'
import ingestRouter from './routes/ingest'
import notificationsRouter from './routes/notifications'
import detectorsRouter from './routes/detectors'
import projectRouter from './routes/project'

initSchema()

const app = express()
app.set('trust proxy', 1)
app.use(express.json({ limit: '10mb' }))

app.use('/ingest', ingestRouter)
app.use('/notifications', notificationsRouter)
app.use('/detectors', detectorsRouter)
app.use(projectRouter)

export { app }

if (require.main === module) {
  app.listen(3000, () => console.log('Oraku API running on http://localhost:3000'))
}
