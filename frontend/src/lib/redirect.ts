/** Chỉ chấp nhận đường dẫn nội bộ để tránh open redirect. */
export function safeReturnTo(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/trips'
}

export function loginPath(returnTo: string): string {
  return `/login?returnTo=${encodeURIComponent(returnTo)}`
}
