import cron from 'node-cron'
import { runPipeline } from './pipeline'
import type { Event, PipelineOptions, CronHandle } from '../types'

export const DEFAULT_CRON = '0 6 * * *' // 6am daily

export function schedulePipeline(
  cronExpression: string = DEFAULT_CRON,
  getEvents: () => Event[],
  options: PipelineOptions = {}
): CronHandle {
  if (!cron.validate(cronExpression)) {
    throw new Error(`Invalid cron expression: "${cronExpression}"`)
  }

  const task = cron.schedule(cronExpression, async () => {
    const events = getEvents()
    if (!events.length) {
      console.log(`[cron] No events stored — skipping run`)
      return
    }
    console.log(`[cron] Running scheduled pipeline (${events.length} events)`)
    try {
      await runPipeline(events, options)
    } catch (err) {
      console.error(`[cron] Pipeline error:`, (err as Error).message)
    }
  })

  return { stop: () => task.stop() }
}
