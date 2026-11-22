import { ImageUp, Loader2 } from 'lucide-react'
import { useRef, type ComponentProps } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useUploadImage } from '@/hooks/useUploadImage'
import { getErrorMessage } from '@/lib/api'
import { ImageDecodeError } from '@/lib/imageCompress'
import type { MediaPurpose } from '@/types/media'

interface ImageUploadButtonProps {
  purpose: MediaPurpose
  onUploaded: (url: string) => void
  label?: string
  variant?: ComponentProps<typeof Button>['variant']
  size?: ComponentProps<typeof Button>['size']
  className?: string
}

/** Nút "Tải ảnh từ máy": chọn ảnh → nén ở client → upload lên MinIO → trả URL. */
export function ImageUploadButton({
  purpose,
  onUploaded,
  label = 'Tải ảnh từ máy',
  variant = 'outline',
  size = 'default',
  className,
}: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadImage(purpose)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    upload.mutate(file, {
      onSuccess: (media) => {
        onUploaded(media.url)
        toast.success('Đã tải ảnh lên')
      },
      onError: (error) =>
        toast.error(
          error instanceof ImageDecodeError
            ? 'Không đọc được ảnh này, thử ảnh JPG/PNG khác nhé'
            : getErrorMessage(error),
        ),
    })
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = '' // chọn lại cùng 1 ảnh vẫn kích hoạt
        }}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
      >
        {upload.isPending ? <Loader2 className="animate-spin" /> : <ImageUp />}
        {upload.isPending ? `Đang tải ${upload.progress ?? 0}%` : label}
      </Button>
    </>
  )
}
