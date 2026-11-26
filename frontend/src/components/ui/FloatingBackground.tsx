import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Background du lịch hoạt hình tương tác đồng điệu với hệ thống Tactile Clay & Pill UI:
 * - Tông màu nền pastel ấm áp (coral hồng, lavender tím, hổ phách ấm) hài hòa 100% với các nút bấm & card.
 * - 4 thực thể vẽ tay độc quyền từ assets (/assets/sun.png, plane.png, van.png, campfire.png):
 *   + Chuyển động liên tục lên xuống nhẹ nhàng, thư thái (bobbing & floating hữu cơ).
 *   + Không lạm dụng, được bố trí tinh tế ở các góc/khoảng trống bên ngoài vùng nội dung.
 *   + Tương tác tự nhiên: Tốc độ tăng nhẹ nhàng, mượt mà khi di chuột trên desktop hoặc lướt/cuộn trang trên mobile.
 *   + Hoàn toàn không cản trở thao tác bấm/chạm (pointer-events-none select-none).
 * - Người dùng bật giảm chuyển động: hình đứng yên (không chạy rAF). Tab ẩn: dừng rAF.
 */
/**
 * `density`: "full" (landing) hiện đủ 4 hình; "corners" (trang trong app, trang đăng nhập) ẩn xe van và lửa trại
 * dưới md, vì ở màn nhỏ hai hình này nằm ngay sau ô nhập và card.
 */
export function FloatingBackground({
  className,
  density = 'full',
}: {
  className?: string
  density?: 'full' | 'corners'
}) {
  const bottomDecor = density === 'corners' ? 'hidden md:block' : undefined
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    // Giảm chuyển động: giữ hình tĩnh ở vị trí gốc (video nền vẫn chạy, đó là lựa chọn riêng của chủ dự án)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let lastX = 0
    let lastY = 0
    let lastTime = performance.now()
    let rafId: number

    // Physics state
    let currentSpeed = 1.0
    let targetSpeed = 1.0
    let currentPx = 0
    let currentPy = 0
    let targetPx = 0
    let targetPy = 0
    let idleClock = 0

    const boostVelocity = (dist: number, dt: number) => {
      const v = dist / Math.max(16, dt)
      // Tăng tốc độ vừa phải (tối đa 1.8x, tránh làm rối mắt người dùng)
      targetSpeed = Math.min(1.85, Math.max(targetSpeed, 1.0 + v * 0.9))
    }

    const onMouseMove = (e: MouseEvent) => {
      const now = performance.now()
      const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY)
      boostVelocity(dist, now - lastTime)

      // Parallax nhẹ nhàng từ -1 đến 1 (tối đa 8px để không gây mất tập trung)
      const nx = (e.clientX / window.innerWidth - 0.5) * 2
      const ny = (e.clientY / window.innerHeight - 0.5) * 2
      targetPx = nx * 8
      targetPy = ny * 8

      lastX = e.clientX
      lastY = e.clientY
      lastTime = now
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0]
        const now = performance.now()
        const dist = Math.hypot(touch.clientX - lastX, touch.clientY - lastY)
        boostVelocity(dist, now - lastTime)

        const nx = (touch.clientX / window.innerWidth - 0.5) * 2
        const ny = (touch.clientY / window.innerHeight - 0.5) * 2
        targetPx = nx * 6
        targetPy = ny * 6

        lastX = touch.clientX
        lastY = touch.clientY
        lastTime = now
      }
    }

    let lastScrollY = window.scrollY
    const onScroll = () => {
      const now = performance.now()
      const scrollDist = Math.abs(window.scrollY - lastScrollY)
      boostVelocity(scrollDist * 0.8, now - lastTime)
      lastScrollY = window.scrollY
      lastTime = now
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })

    let prevTime = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.08, (now - prevTime) / 1000)
      prevTime = now

      // Nội suy gia tốc mượt mà
      currentSpeed += (targetSpeed - currentSpeed) * 0.08
      // Giảm tốc dần về 1.0x (nhịp thư thái cơ bản)
      targetSpeed += (1.0 - targetSpeed) * 0.04

      // Parallax làm mượt
      currentPx += (targetPx - currentPx) * 0.06
      currentPy += (targetPy - currentPy) * 0.06

      // Tiến trình thời gian nhân với hệ số tốc độ
      idleClock += dt * currentSpeed

      // Dao động lên xuống liên tục (sinusoidal gentle bobbing):
      // Mỗi thực thể có nhịp điệu riêng biệt và lệch pha nhau để tạo chuyển động tự nhiên
      const sunY = Math.sin(idleClock * 1.25) * 7.5
      const sunRot = Math.sin(idleClock * 0.85) * 1.5

      const planeY = Math.sin(idleClock * 1.1 + 1.2) * 9.0
      const planeRot = Math.sin(idleClock * 0.75 + 0.6) * 2.0

      const vanY = Math.sin(idleClock * 1.35 + 2.4) * 6.0
      const vanRot = Math.sin(idleClock * 0.95 + 1.5) * 1.2

      const fireY = Math.sin(idleClock * 1.45 + 3.8) * 5.5
      const fireRot = Math.sin(idleClock * 1.05 + 2.8) * 1.0

      // Áp dụng biến CSS trực tiếp lên node: GPU accelerated, 0 React re-renders!
      el.style.setProperty('--px', `${currentPx.toFixed(2)}px`)
      el.style.setProperty('--py', `${currentPy.toFixed(2)}px`)
      el.style.setProperty('--sun-y', `${sunY.toFixed(2)}px`)
      el.style.setProperty('--sun-rot', `${sunRot.toFixed(2)}deg`)
      el.style.setProperty('--plane-y', `${planeY.toFixed(2)}px`)
      el.style.setProperty('--plane-rot', `${planeRot.toFixed(2)}deg`)
      el.style.setProperty('--van-y', `${vanY.toFixed(2)}px`)
      el.style.setProperty('--van-rot', `${vanRot.toFixed(2)}deg`)
      el.style.setProperty('--fire-y', `${fireY.toFixed(2)}px`)
      el.style.setProperty('--fire-rot', `${fireRot.toFixed(2)}deg`)

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    // Tab ẩn thì không vẽ nữa; quay lại thì chạy tiếp (prevTime reset để không nhảy cóc)
    const onVisibility = () => {
      cancelAnimationFrame(rafId)
      if (!document.hidden) {
        prevTime = performance.now()
        rafId = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibility)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn('pointer-events-none fixed inset-0 z-0 overflow-hidden select-none', className)}
    >
      {/* Nền là video (TripBackground ở App); ở đây chỉ còn các hình trang trí bay bổng */}

      {/* ========================================================= */}
      {/* 2. MẶT TRỜI ĐEO KÍNH RÂM (sun.png) - Top Left             */}
      {/* ========================================================= */}
      <div
        className="absolute top-4 left-3 sm:top-8 sm:left-6 lg:left-10 opacity-90"
        style={{
          transform: `translate3d(calc(var(--px, 0px) * 0.4), calc(var(--py, 0px) * 0.4 + var(--sun-y, 0px)), 0) rotate(var(--sun-rot, 0deg))`,
        }}
      >
        <div className="relative w-20 sm:w-28 lg:w-32">
          <img
            src="/assets/sun.png"
            alt=""
            className="relative w-full h-auto object-contain drop-shadow-decor select-none pointer-events-none"
            draggable={false}
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MÁY BAY GIẤY TÍM PASTEL (plane.png) - Top Right        */}
      {/* ========================================================= */}
      <div
        className="absolute top-5 right-3 sm:top-9 sm:right-6 lg:right-12 opacity-90"
        style={{
          transform: `translate3d(calc(var(--px, 0px) * -0.4), calc(var(--py, 0px) * 0.4 + var(--plane-y, 0px)), 0) rotate(var(--plane-rot, 0deg))`,
        }}
      >
        <div className="relative w-20 sm:w-28 lg:w-32">
          <img
            src="/assets/plane.png"
            alt=""
            className="relative w-full h-auto object-contain drop-shadow-decor select-none pointer-events-none"
            draggable={false}
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. XE VAN CAM KOMBI (van.png) - Bottom Left              */}
      {/* ========================================================= */}
      <div
        className={cn('absolute bottom-6 left-3 opacity-95 sm:bottom-10 sm:left-6 lg:left-12', bottomDecor)}
        style={{
          transform: `translate3d(calc(var(--px, 0px) * 0.5), calc(var(--py, 0px) * -0.4 + var(--van-y, 0px)), 0) rotate(var(--van-rot, 0deg))`,
        }}
      >
        <div className="relative w-28 sm:w-40 lg:w-48">
          <img
            src="/assets/van.png"
            alt=""
            className="relative w-full h-auto object-contain drop-shadow-decor select-none pointer-events-none"
            draggable={false}
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. LỬA TRẠI ẤM ÁP (campfire.png) - Bottom Right          */}
      {/* ========================================================= */}
      <div
        className={cn('absolute right-3 bottom-6 opacity-95 sm:right-6 sm:bottom-10 lg:right-12', bottomDecor)}
        style={{
          transform: `translate3d(calc(var(--px, 0px) * -0.5), calc(var(--py, 0px) * -0.4 + var(--fire-y, 0px)), 0) rotate(var(--fire-rot, 0deg))`,
        }}
      >
        <div className="relative w-20 sm:w-28 lg:w-32">
          <img
            src="/assets/campfire.png"
            alt=""
            className="relative w-full h-auto object-contain drop-shadow-decor select-none pointer-events-none"
            draggable={false}
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. HỌA TIẾT NHỎ ĐIỂM XUYẾT KHÔNG GIAN (Không gây rối mắt)   */}
      {/* ========================================================= */}
      {/* Ngôi sao nhỏ lấp lánh nhẹ nhàng gần mặt trời */}
      <div
        className="hidden sm:block absolute top-28 left-36 lg:left-48 opacity-75"
        style={{
          transform: `translate3d(calc(var(--px, 0px) * 0.3), calc(var(--py, 0px) * 0.3), 0)`,
        }}
      >
        <svg viewBox="0 0 100 100" className="size-5 animate-star-twinkle fill-amber-300 drop-shadow-sm">
          <path d="M50 0 C50 30 70 50 100 50 C70 50 50 70 50 100 C50 70 30 50 0 50 C30 50 50 30 50 0 Z" />
        </svg>
      </div>

      {/* Trái tim hồng nhỏ điểm xuyết trên bầu trời */}
      <div
        className="hidden sm:block absolute top-12 left-1/2 opacity-70"
        style={{
          transform: `translate3d(calc(-50% + var(--px, 0px) * 0.2), calc(var(--py, 0px) * 0.2), 0)`,
        }}
      >
        <svg viewBox="0 0 24 24" className="size-4 animate-heart-float fill-pink-300 drop-shadow-sm">
          <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.8 4.3 7.3C19.5 16.4 12 21 12 21Z" />
        </svg>
      </div>

      {/* Đám mây nhẹ trôi rất êm ở khoảng trời trên */}
      <div className="hidden lg:block absolute top-6 left-1/3 animate-cloud-drift-1 opacity-50 pointer-events-none">
        <div className="flex items-end scale-75">
          <div className="size-8 rounded-full bg-white shadow-flat" />
          <div className="size-12 rounded-full bg-white shadow-raised -ml-3 -mb-1" />
          <div className="size-9 rounded-full bg-white shadow-flat -ml-3" />
        </div>
      </div>
    </div>
  )
}
