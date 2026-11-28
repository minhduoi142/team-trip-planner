import type { SunResponse } from '@/types/weather'

/** Nới khung giờ vàng sớm hơn 15 phút: hoạt động bắt đầu lúc đó vẫn kịp ra chỗ chụp. */
export const GOLDEN_LEAD_MINUTES = 15

export type GoldenSlot = 'morning' | 'evening'

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "HH:mm" làm tròn xuống bội số 5 phút, để gợi ý giờ hẹn dễ nhớ (16:52 → 16:50). */
export function roundDown5(hhmm: string): string {
  const total = Math.floor(toMinutes(hhmm) / 5) * 5
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

/** Giờ bắt đầu của hoạt động rơi vào khung giờ vàng nào (đã nới {@link GOLDEN_LEAD_MINUTES}); null nếu không. */
export function goldenSlot(sun: SunResponse | null | undefined, startTime: string | null): GoldenSlot | null {
  if (!sun || !startTime) return null
  const t = toMinutes(startTime)
  const within = (from: string, to: string) => t >= toMinutes(from) - GOLDEN_LEAD_MINUTES && t <= toMinutes(to)
  if (within(sun.morningGoldenStart, sun.morningGoldenEnd)) return 'morning'
  if (within(sun.eveningGoldenStart, sun.eveningGoldenEnd)) return 'evening'
  return null
}

function utcOffset(timeZone: string, at: Date): string | null {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')
    return part?.value ?? null
  } catch {
    return null
  }
}

/**
 * Múi giờ điểm đến có cùng giờ với Việt Nam không (vd Hà Nội có thể trả "Asia/Bangkok", vẫn là UTC+7).
 * Khác thì FE ghi thêm "giờ địa phương".
 */
export function sameClockAsVietnam(timeZone: string, date: string | null): boolean {
  const at = date ? new Date(`${date}T12:00:00Z`) : new Date()
  const here = utcOffset('Asia/Ho_Chi_Minh', at)
  const there = utcOffset(timeZone, at)
  return there === null || here === there
}
