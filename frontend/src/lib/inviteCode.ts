/**
 * Lấy mã mời từ thứ người dùng gõ/dán: mã trơn ("xkte673h"), link mời /join/{mã} hoặc link chia sẻ /share/{mã}.
 * Trả về mã in hoa, chỉ gồm chữ và số (rỗng nếu không có gì hợp lệ).
 */
export function extractInviteCode(raw: string): string {
  const trimmed = raw.trim()
  const fromLink = trimmed.match(/\/(?:join|share)\/([A-Za-z0-9]+)/)
  return (fromLink ? fromLink[1] : trimmed).replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

/** returnTo dùng khi người được mời phải đăng ký/đăng nhập: quay lại trang tham gia và tự vào nhóm. */
export function joinReturnTo(code: string): string {
  return `/join/${encodeURIComponent(code)}?auto=1`
}

/** Mã mời trong returnTo (nếu người dùng đang trên đường tham gia một chuyến đi). */
export function inviteCodeFromReturnTo(returnTo: string | null): string | null {
  const match = returnTo?.match(/^\/join\/([A-Za-z0-9]+)/)
  return match ? match[1] : null
}
