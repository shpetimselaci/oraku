import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import type { Event } from '../../types'

dayjs.extend(isoWeek)

export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = dayjs(value)
  return d.isValid() ? d.toDate() : null
}

export function isToday(dateValue: string | Date): boolean {
  return dayjs(dateValue).isSame(dayjs(), 'day')
}

export function filterByDate(
  events: Event[],
  targetDate: string | Date,
  unit: 'day' | 'month' | 'year' = 'day'
): Event[] {
  const target = dayjs(targetDate)
  if (!target.isValid()) return []
  const fmt = unit === 'day' ? 'YYYY-MM-DD' : unit === 'month' ? 'YYYY-MM' : 'YYYY'
  const matchStr = target.format(fmt)
  return events.filter(ev => {
    const d = dayjs(ev.createdAt)
    return d.isValid() && d.format(fmt) === matchStr
  })
}

export function filterByDateWindow(
  events: Event[],
  filter: { unit: 'day' | 'week' | 'month' | 'year'; value: number }
): Event[] {
  const now = dayjs()
  if (filter.unit === 'week') {
    const thisMonday = now.startOf('isoWeek')
    const thisFriday = thisMonday.add(4, 'day').endOf('day')
    const rangeStart = thisMonday.subtract((Math.max(1, filter.value) - 1) * 7, 'day')
    return events.filter(ev => {
      const d = dayjs(ev.createdAt)
      return d.isValid() && !d.isBefore(rangeStart) && !d.isAfter(thisFriday)
    })
  }
  const fmt = filter.unit === 'day' ? 'YYYY-MM-DD' : filter.unit === 'month' ? 'YYYY-MM' : 'YYYY'
  const target = now.add(filter.value, filter.unit as dayjs.ManipulateType)
  const matchStr = target.format(fmt)
  return events.filter(ev => {
    const d = dayjs(ev.createdAt)
    return d.isValid() && d.format(fmt) === matchStr
  })
}

export function getTimestamp(e: Event): number | null {
  const d = dayjs(e.createdAt)
  return d.isValid() ? d.valueOf() : null
}

export function todayString(): string {
  return dayjs().format('YYYY-MM-DD')
}

export function isEndOfPeriod(unit: 'day' | 'week' | 'month' | 'year'): boolean {
  const now = dayjs()
  if (unit === 'week') return now.isoWeekday() === 5
  if (unit === 'month') return now.date() === now.daysInMonth()
  if (unit === 'year') return now.month() === 11 && now.date() === 31
  return true
}

export function advancePastWeekend(date: Date): Date {
  const d = dayjs(date)
  if (d.isoWeekday() <= 5) return d.toDate()
  return d.add(1, 'week').startOf('isoWeek').toDate()
}

export function isWeekend(date: Date): boolean {
  return dayjs(date).isoWeekday() > 5
}
