/** Nhãn cho chip link tham khảo, đoán theo tên miền. */
export function referenceLabel(url: string): string {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return 'Link'
  }
  if (host.includes('tiktok.')) return 'TikTok'
  if (host.includes('facebook.') || host === 'fb.com' || host.endsWith('.fb.com') || host.includes('fb.watch')) {
    return 'Facebook'
  }
  if (host.includes('instagram.')) return 'Instagram'
  if (host.includes('youtube.') || host === 'youtu.be') return 'YouTube'
  if (host.includes('google.') || host.includes('goo.gl')) return 'Google'
  return host.replace(/^www\./, '') || 'Link'
}
