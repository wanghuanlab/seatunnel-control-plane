import cron from 'node-cron'
import { listEnabledSchedules, markScheduleTriggered } from './schedules.mjs'
import { runTask } from './tasks.mjs'

const jobs = new Map()
let reloading = false

export async function reloadScheduler() {
  if (reloading) return
  reloading = true
  try {
    for (const job of jobs.values()) job.stop()
    jobs.clear()

    const schedules = await listEnabledSchedules()
    for (const schedule of schedules) {
      if (!cron.validate(schedule.cron_expr)) {
        console.warn(`Skip invalid cron for task ${schedule.task_id}: ${schedule.cron_expr}`)
        continue
      }

      const taskId = Number(schedule.task_id)
      const job = cron.schedule(
        schedule.cron_expr,
        async () => {
          try {
            await runTask(taskId)
            await markScheduleTriggered(taskId, { status: 'SUCCESS' })
            console.log(`[scheduler] task ${taskId} triggered`)
          } catch (error) {
            await markScheduleTriggered(taskId, { status: 'FAILED', error: String(error.message || error) })
            console.error(`[scheduler] task ${taskId} failed:`, error.message)
          }
        },
        { timezone: schedule.timezone || 'Asia/Shanghai' },
      )
      jobs.set(taskId, job)
    }
    console.log(`[scheduler] loaded ${jobs.size} schedule(s)`)
  } finally {
    reloading = false
  }
}

export function stopScheduler() {
  for (const job of jobs.values()) job.stop()
  jobs.clear()
}
