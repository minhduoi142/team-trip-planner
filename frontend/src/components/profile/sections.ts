/**
 * Các mục của dialog Hồ sơ (docs/ui-slop-audit.md P3-PF-01). `?profile=<mục>` trên bất kỳ trang nào của app
 * mở thẳng dialog ở mục đó (vd link "Vào Hồ sơ → Thông báo" của trang xác minh email).
 */
export const PROFILE_SECTIONS = ['account', 'bank', 'notifications', 'security'] as const

export type ProfileSection = (typeof PROFILE_SECTIONS)[number]

export const PROFILE_SECTION_LABELS: Record<ProfileSection, string> = {
  account: 'Hồ sơ',
  bank: 'Nhận tiền',
  notifications: 'Thông báo',
  security: 'Bảo mật',
}

export function parseProfileSection(value: string | null): ProfileSection {
  return PROFILE_SECTIONS.find((s) => s === value) ?? 'account'
}
