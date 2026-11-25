import { useEffect, useRef } from 'react'

const VIDEO_SRC = '/trip-bg.mp4'
const POSTER_SRC = '/trip-bg-poster.webp'

/** Người dùng bật "Tiết kiệm dữ liệu" (Chrome/Android) → không tải video ~430KB. */
const saveData = () =>
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true

/**
 * Nền video toàn trang (gắn 1 lần ở root, không tải lại khi chuyển trang).
 * Lớp phủ kem mờ giúp card và chữ phía trước dễ đọc.
 * Video luôn phát, kể cả khi hệ điều hành bật giảm chuyển động (prefers-reduced-motion): chủ dự án chọn vậy
 * vì đây chỉ là họa tiết chuyển động nhẹ. Chỉ khi bật tiết kiệm dữ liệu mới hiện ảnh tĩnh.
 */
export function TripBackground() {
  const stillOnly = saveData()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    // React không gắn thuộc tính HTML `muted`; đặt lại property để chính sách autoplay (Safari/iOS) chắc chắn cho phát
    video.muted = true
    video.play().catch(() => {
      // Trình duyệt chặn autoplay (vd chế độ tiết kiệm pin) → giữ poster, không báo lỗi
    })
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {stillOnly ? (
        <img src={POSTER_SRC} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
        />
      )}
      <div className="absolute inset-0 bg-[#fdf8f5]/45 backdrop-blur-[1px]" />
    </div>
  )
}
