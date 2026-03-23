import cron from 'node-cron'
import { runPipeline } from './pipeline'
import type { PipelineOptions } from './pipeline'
import type { Event } from '../types'

export interface CronHandle {
  stop: () => void
}

export const DEFAULT_CRON = '0 6 * * *' // 6am daily

// schedules the pipeline to run on a cron expression, using a live getter for events
// so each run picks up whatever events are currently stored
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
