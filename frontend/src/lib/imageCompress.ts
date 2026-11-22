/** Trình duyệt không giải mã được ảnh (vd HEIC trên Chrome/Android). */
export class ImageDecodeError extends Error {
  constructor() {
    super('Không đọc được ảnh này')
  }
}

const PASSTHROUGH_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const SMALL_ENOUGH_BYTES = 300_000

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Nén ảnh ở client trước khi upload: thu về cạnh dài tối đa {@code maxSize}px, xuất WebP (hoặc JPEG nếu
 * trình duyệt không mã hóa được WebP, vd Safari). Ảnh vốn đã nhỏ thì gửi nguyên.
 * EXIF orientation được áp dụng nhờ createImageBitmap(imageOrientation: 'from-image').
 */
export async function compressImage(file: File, maxSize = 1920, quality = 0.85): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new ImageDecodeError()
  }

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size <= SMALL_ENOUGH_BYTES && PASSTHROUGH_TYPES.includes(file.type)) {
    bitmap.close()
    return file
  }

  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new ImageDecodeError()
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const webp = await toBlob(canvas, 'image/webp', quality)
  if (webp && webp.type === 'image/webp') return webp

  // JPEG không có kênh trong suốt → lót nền trắng
  const flat = document.createElement('canvas')
  flat.width = width
  flat.height = height
  const flatCtx = flat.getContext('2d')
  if (!flatCtx) throw new ImageDecodeError()
  flatCtx.fillStyle = '#ffffff'
  flatCtx.fillRect(0, 0, width, height)
  flatCtx.drawImage(canvas, 0, 0)
  const jpeg = await toBlob(flat, 'image/jpeg', quality)
  if (!jpeg) throw new ImageDecodeError()
  return jpeg
}
