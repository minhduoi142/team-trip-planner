import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import type { IsoDate } from '@/types/api'
import type { TripStatus } from '@/types/trip'

dayjs.locale('vi')

export function formatDate(date: IsoDate | null): string {
  return date ? dayjs(date).format('DD/MM/YYYY') : ''
}

/** "10/03 – 12/03/2027", gọn hơn khi cùng năm. */
export function formatDateRange(start: IsoDate | null, end: IsoDate | null): string | null {
  if (!start || !end) return null
  const s = dayjs(start)
  const e = dayjs(end)
  if (s.isSame(e, 'day')) return e.format('DD/MM/YYYY')
  const left = s.isSame(e, 'year') ? s.format('DD/MM') : s.format('DD/MM/YYYY')
  return `${left} – ${e.format('DD/MM/YYYY')}`
}

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

/** "T6", "CN"… */
export function weekdayShort(date: IsoDate): string {
  return WEEKDAY_SHORT[dayjs(date).day()]
}

export function isWeekend(date: IsoDate): boolean {
  const d = dayjs(date).day()
  return d === 0 || d === 6
}

/** "04/01" */
export function formatShortDate(date: IsoDate): string {
  return dayjs(date).format('DD/MM')
}

/** "T6 04/01 – CN 06/01" */
export function formatRangeWithWeekday(start: IsoDate, end: IsoDate): string {
  const left = `${weekdayShort(start)} ${formatShortDate(start)}`
  return start === end ? left : `${left} – ${weekdayShort(end)} ${formatShortDate(end)}`
}

export function daysBetweenInclusive(start: IsoDate, end: IsoDate): number {
  return dayjs(end).diff(dayjs(start), 'day') + 1
}

export type CountdownTone = 'muted' | 'upcoming' | 'soon' | 'today' | 'ongoing' | 'done'

export interface Countdown {
  label: string
  tone: CountdownTone
}

export interface CountdownInput {
  status: TripStatus
  startDate: IsoDate | null
  endDate: IsoDate | null
  plannedStartDate: IsoDate | null
}

/**
 * Mốc là ngày chính thức; chưa chốt thì dùng ngày dự kiến kèm chữ "(dự kiến)".
 * {@code today} cho phép test với ngày cố định.
 */
export function getCountdown(trip: CountdownInput, today: dayjs.Dayjs = dayjs()): Countdown {
  const now = today.startOf('day')

  if (trip.status === 'COMPLETED') {
    return { label: 'Đã hoàn thành', tone: 'done' }
  }
  if (trip.status === 'ONGOING' && trip.startDate && trip.endDate) {
    const start = dayjs(trip.startDate)
    const total = dayjs(trip.endDate).diff(start, 'day') + 1
    const current = Math.min(Math.max(now.diff(start, 'day') + 1, 1), total)
    return { label: `Đang đi – Ngày ${current}/${total}`, tone: 'ongoing' }
  }

  const tentative = !trip.startDate
  const anchor = trip.startDate ?? trip.plannedStartDate
  if (!anchor) {
    return { label: 'Chưa có ngày', tone: 'muted' }
  }

  const days = dayjs(anchor).startOf('day').diff(now, 'day')
  const suffix = tentative ? ' (dự kiến)' : ''
  if (days < 0) {
    return { label: 'Chưa chốt ngày đi', tone: 'muted' }
  }
  if (days === 0) {
    return { label: `Hôm nay lên đường! 🎉${suffix}`, tone: 'today' }
  }
  if (days === 1) {
    return { label: `Ngày mai lên đường!${suffix}`, tone: 'soon' }
  }
  return { label: `Còn ${days} ngày${suffix}`, tone: days <= 7 ? 'soon' : 'upcoming' }
}
