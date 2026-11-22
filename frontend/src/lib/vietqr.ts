/**
 * Tạo payload VietQR (chuẩn EMVCo / NAPAS "Chuyển nhanh 24/7 đến tài khoản") NGAY TRÊN TRÌNH DUYỆT.
 * Số tài khoản không đi qua dịch vụ ngoài. Mọi app ngân hàng VN quét được.
 *
 * Cấu trúc (ID + độ dài 2 chữ số + giá trị):
 *   00=01 · 01=12 (QR động, có số tiền) · 38={00=A000000727, 01={00=BIN, 01=STK}, 02=QRIBFTTA}
 *   · 53=704 (VND) · 54=số tiền · 58=VN · 62={08=nội dung} · 63=CRC16
 */

function tlv(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, '0')}${value}`
}

/** CRC-16/CCITT-FALSE: đa thức 0x1021, khởi tạo 0xFFFF (chuẩn EMVCo). "123456789" → "29B1". */
export function crc16(input: string): string {
  let crc = 0xffff
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** "Đà Lạt – Ngọc!" → "DA LAT NGOC" (bỏ dấu, chỉ A-Z 0-9 và khoảng trắng, tối đa 25 ký tự). */
export function toTransferContent(text: string, maxLength = 25): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .trim()
}

export interface VietQrInput {
  bin: string
  accountNo: string
  /** VND, số nguyên dương */
  amount: number
  /** Nội dung chuyển khoản (sẽ được chuẩn hóa) */
  content: string
}

export function buildVietQrPayload({ bin, accountNo, amount, content }: VietQrInput): string {
  const merchant = tlv('00', 'A000000727') + tlv('01', tlv('00', bin) + tlv('01', accountNo)) + tlv('02', 'QRIBFTTA')
  const purpose = toTransferContent(content)
  const body =
    tlv('00', '01') +
    tlv('01', '12') +
    tlv('38', merchant) +
    tlv('53', '704') +
    tlv('54', String(Math.round(amount))) +
    tlv('58', 'VN') +
    (purpose ? tlv('62', tlv('08', purpose)) : '') +
    '6304'
  return body + crc16(body)
}
