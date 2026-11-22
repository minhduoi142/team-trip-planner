import { formatShortDate, weekdayShort } from '@/lib/date'
import type { ItineraryDayResponse } from '@/types/itinerary'

/** "Ngày 2 · T7 05/01", "Ngày 4 · chưa xếp" */
export function dayLabel(day: Pick<ItineraryDayResponse, 'dayIndex' | 'date' | 'overflow'>): string {
  if (day.overflow) return `Ngày ${day.dayIndex} · chưa xếp`
  if (!day.date) return `Ngày ${day.dayIndex}`
  return `Ngày ${day.dayIndex} · ${weekdayShort(day.date)} ${formatShortDate(day.date)}`
}
