import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import {
  ArrowRight,
  ArrowUp,
  CalendarCheck2,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock,
  Heart,
  LogIn,
  Mail,
  MapPin,
  Menu,
  QrCode,
  Send,
  Share2,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/useAuth'
import { BrandLogo } from '@/components/BrandLogo'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FloatingBackground } from '@/components/ui/FloatingBackground'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

/**
 * Trang giới thiệu (Landing Page) cho ứng dụng Team Trip Planner:
 * - Chuẩn hóa theo thiết kế Tactile Clay & Pill UI (nền ấm áp pastel, bo tròn mềm mại, đổ bóng 3D).
 * - Tự động điều hướng user đã đăng nhập vào /trips.
 * - 5 Section: Sticky Navbar, Hero + UI Mockup Card, Giới thiệu (#about), Tính năng (#features), Liên hệ & Footer (#contact).
 */
export function LandingPage() {
  const { status } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Form liên hệ state
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 1. Kiểm tra luồng Auth:
  // Đang tải dữ liệu session -> hiển thị spinner
  if (status === 'loading') {
    return <FullPageSpinner />
  }

  // Đã đăng nhập -> redirect thẳng vào trang quản lý chuyến đi /trips
  if (status === 'authenticated') {
    return <Navigate to="/trips" replace />
  }

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = contactName.trim()
    const trimmedEmail = contactEmail.trim()
    const trimmedMessage = contactMessage.trim()

    if (!trimmedName) {
      toast.error('Vui lòng nhập họ và tên của bạn.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Vui lòng nhập địa chỉ email hợp lệ.')
      return
    }

    if (trimmedMessage.length < 5) {
      toast.error('Nội dung tin nhắn cần tối thiểu 5 ký tự.')
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      toast.success('Cảm ơn bạn đã gửi liên hệ! Minhduoi và Công Ty TNHH Mai Mối sẽ phản hồi sớm nhất.')
      setContactName('')
      setContactEmail('')
      setContactMessage('')
    }, 600)
  }

  /**
   * Cuộn mượt mà có kiểm soát thời gian (không bị snap/nhảy tức thì).
   * Sử dụng cubic easing curve tạo cảm giác trôi từ từ, êm ái.
   */
  const smoothScrollTo = (targetId: string, duration = 900) => {
    const target = document.getElementById(targetId)
    if (!target) return

    const headerOffset = 72 // Trừ hao chiều cao của sticky navbar
    const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerOffset
    const startPosition = window.scrollY
    const distance = targetPosition - startPosition

    if (Math.abs(distance) < 2) return

    let startTime: number | null = null

    // easeInOutCubic: bắt đầu êm ái, lướt đều và hãm phanh nhẹ nhàng ở đích
    const easeInOutCubic = (t: number) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    }

    const step = (currentTime: number) => {
      if (startTime === null) startTime = currentTime
      const timeElapsed = currentTime - startTime
      const progress = Math.min(timeElapsed / duration, 1)
      const ease = easeInOutCubic(progress)

      window.scrollTo(0, startPosition + distance * ease)

      if (timeElapsed < duration) {
        requestAnimationFrame(step)
      }
    }

    requestAnimationFrame(step)
  }

  const scrollToTop = (duration = 800) => {
    const startPosition = window.scrollY
    if (startPosition < 2) return

    let startTime: number | null = null
    const easeInOutCubic = (t: number) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    }

    const step = (currentTime: number) => {
      if (startTime === null) startTime = currentTime
      const timeElapsed = currentTime - startTime
      const progress = Math.min(timeElapsed / duration, 1)
      const ease = easeInOutCubic(progress)

      window.scrollTo(0, startPosition * (1 - ease))

      if (timeElapsed < duration) {
        requestAnimationFrame(step)
      }
    }

    requestAnimationFrame(step)
  }

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault()
    if (mobileMenuOpen) {
      setMobileMenuOpen(false)
    }
    smoothScrollTo(targetId)
  }

  return (
    <div className="relative min-h-svh bg-background/50 overflow-x-hidden selection:bg-rose-200 selection:text-rose-900">
      {/* Background tương tác hoạt hình Tactile Clay */}
      <FloatingBackground />

      {/* ========================================================= */}
      {/* 1. STICKY NAVBAR                                         */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 w-full border-b border-white/70 bg-background/80 backdrop-blur-md shadow-clay-badge transition-all">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" aria-label="Team Trip Planner Home" className="flex items-center">
            <BrandLogo />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 rounded-full bg-white/70 p-1.5 shadow-clay-badge border border-white/80 backdrop-blur-sm">
            <a
              href="#about"
              onClick={(e) => handleNavClick(e, 'about')}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-foreground/80 hover:text-primary hover:bg-white/90 transition-all duration-150"
            >
              Giới thiệu
            </a>
            <a
              href="#features"
              onClick={(e) => handleNavClick(e, 'features')}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-foreground/80 hover:text-primary hover:bg-white/90 transition-all duration-150"
            >
              Tính năng
            </a>
            <a
              href="#contact"
              onClick={(e) => handleNavClick(e, 'contact')}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-foreground/80 hover:text-primary hover:bg-white/90 transition-all duration-150"
            >
              Liên hệ
            </a>
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden sm:flex items-center gap-2.5">
            <Button asChild variant="outline" size="sm" className="rounded-full shadow-clay-btn-outline">
              <Link to="/login">
                <LogIn className="size-4" />
                Đăng nhập
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-full shadow-clay-btn-primary">
              <Link to="/register">
                Bắt đầu ngay
              </Link>
            </Button>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex sm:hidden size-10 items-center justify-center rounded-2xl bg-white/80 shadow-clay-badge border border-white/80 text-foreground transition-all active:scale-95"
            aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/60 bg-background/95 backdrop-blur-xl px-4 py-4 shadow-clay-card animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-2">
              <a
                href="#about"
                onClick={(e) => handleNavClick(e, 'about')}
                className="rounded-xl px-3.5 py-2.5 text-base font-medium text-foreground hover:bg-white/80 hover:text-primary transition-all"
              >
                Giới thiệu
              </a>
              <a
                href="#features"
                onClick={(e) => handleNavClick(e, 'features')}
                className="rounded-xl px-3.5 py-2.5 text-base font-medium text-foreground hover:bg-white/80 hover:text-primary transition-all"
              >
                Tính năng nổi bật
              </a>
              <a
                href="#contact"
                onClick={(e) => handleNavClick(e, 'contact')}
                className="rounded-xl px-3.5 py-2.5 text-base font-medium text-foreground hover:bg-white/80 hover:text-primary transition-all"
              >
                Liên hệ & Góp ý
              </a>
              <div className="my-2 h-px bg-border/60" />
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="default" className="rounded-full shadow-clay-btn-outline w-full">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <LogIn className="size-4" />
                    Đăng nhập
                  </Link>
                </Button>
                <Button asChild size="default" className="rounded-full shadow-clay-btn-primary w-full">
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    Bắt đầu ngay
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Sections */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* ========================================================= */}
        {/* 2. HERO SECTION                                          */}
        {/* ========================================================= */}
        <section className="pt-10 pb-16 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left Column: Heading & Value Proposition */}
            <div className="text-center lg:col-span-7 lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-100/90 px-4 py-1.5 text-xs sm:text-sm font-semibold text-rose-600 shadow-clay-badge border border-rose-200/80 mb-6 animate-pulse-gentle">
                <Sparkles className="size-4 text-rose-500" />
                Giải pháp du lịch nhóm số 1 cho hội bạn thân
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-5xl/tight font-bold tracking-tight text-foreground">
                Lên kèo đi chơi nhóm,{' '}
                <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 bg-clip-text text-transparent">
                  không còn ai phải đau đầu
                </span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Quên đi cảnh hỏi 10 lần không ai rep, chốt ngày trùng lịch vất vả hay tranh cãi tính tiền sau mỗi chuyến đi.
                <strong className="text-foreground font-semibold"> Team Trip Planner</strong> gom trọn khảo sát ngày rảnh, lịch trình,
                chia tiền VietQR và kho ảnh chung vào một không gian xinh xắn.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
                <Button asChild size="lg" className="w-full sm:w-auto rounded-full h-13 px-8 text-base shadow-clay-btn-primary">
                  <Link to="/login">
                    Bắt đầu ngay
                    <ArrowRight className="ml-1.5 size-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto rounded-full h-13 px-7 text-base shadow-clay-btn-outline">
                  <a href="#about" onClick={(e) => handleNavClick(e, 'about')}>
                    Tìm hiểu thêm
                    <ChevronDown className="ml-1 size-4" />
                  </a>
                </Button>
              </div>

              {/* Micro-props / Trust Indicators */}
              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span>100% Miễn phí</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span>Không quảng cáo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span>Mượt mà trên điện thoại</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span>Chia tiền VietQR 1 chạm</span>
                </div>
              </div>
            </div>

            {/* Right Column: Tactile Clay UI Mockup Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Aura Glow Behind Preview */}
                <div className="absolute -inset-2 rounded-4xl bg-gradient-to-r from-rose-200/40 via-amber-200/30 to-violet-200/40 blur-xl opacity-80" />

                {/* Main Mockup Card */}
                <Card className="relative rounded-3xl bg-card/90 backdrop-blur-md shadow-clay-floating border-2 border-white/90 p-5 sm:p-6 transition-transform duration-300 hover:scale-[1.01]">
                  {/* Trip Header Mockup */}
                  <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🌸</span>
                        <h3 className="font-heading text-lg font-bold text-foreground">
                          Vi vu Đà Lạt săn mây
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                        <CalendarCheck2 className="size-3.5 text-primary" />
                        15/11 – 17/11 (3 ngày 2 đêm) • 8 bạn
                      </p>
                    </div>
                    <Badge variant="default" className="bg-emerald-500 text-white shadow-xs">
                      Đã chốt ngày
                    </Badge>
                  </div>

                  {/* Section 1: Availability Highlight */}
                  <div className="mt-4 rounded-2xl bg-amber-50/70 p-3.5 border border-amber-200/60 shadow-clay-sunken">
                    <div className="flex items-center justify-between text-xs font-semibold text-amber-900 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-amber-600" />
                        Khung ngày vàng đông đủ nhất
                      </span>
                      <span className="text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                        100% rảnh
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                      <div className="rounded-xl bg-white/90 py-1.5 border border-amber-200/50 shadow-xs font-medium">
                        T6 15/11 <span className="block text-[10px] text-emerald-600 font-bold">8/8 rảnh</span>
                      </div>
                      <div className="rounded-xl bg-white/90 py-1.5 border border-amber-200/50 shadow-xs font-medium">
                        T7 16/11 <span className="block text-[10px] text-emerald-600 font-bold">8/8 rảnh</span>
                      </div>
                      <div className="rounded-xl bg-white/90 py-1.5 border border-amber-200/50 shadow-xs font-medium">
                        CN 17/11 <span className="block text-[10px] text-emerald-600 font-bold">7/8 rảnh</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Itinerary Timeline Sample */}
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>LỊCH TRÌNH NGÀY 1</span>
                      <span className="text-[11px] text-primary font-medium">Xem chi tiết &gt;</span>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-2.5 shadow-clay-badge border border-white/80">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 font-bold text-xs">
                        08:00
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-foreground">
                          Cà phê săn mây Đồi Gió
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3 text-rose-500" /> Cầu Đất, Đà Lạt
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-600 border-rose-200">
                        Check-in
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-2.5 shadow-clay-badge border border-white/80">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 font-bold text-xs">
                        12:30
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-foreground">
                          Lẩu gà lá é Tao Ngộ
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3 text-amber-500" /> Bữa trưa nhóm
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                        Ăn uống
                      </Badge>
                    </div>
                  </div>

                  {/* Section 3: Expense Split Highlight */}
                  <div className="mt-4 rounded-2xl bg-gradient-to-r from-violet-50 to-pink-50 p-3.5 border border-violet-100 shadow-clay-badge flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-muted-foreground font-medium">Chia tiền đợt 1 (Ăn trưa & Vé)</div>
                      <div className="text-sm font-bold text-foreground">
                        4.800.000đ <span className="text-xs font-normal text-muted-foreground">→ 600.000đ/người</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-clay-btn-outline text-xs font-semibold text-purple-700 border border-purple-200">
                      <QrCode className="size-3.5" />
                      VietQR
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. MỤC GIỚI THIỆU (#about)                                 */}
        {/* ========================================================= */}
        <section id="about" className="scroll-mt-20 py-16 sm:py-24 border-t border-white/60">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="bg-white/80 text-primary border-primary/30 mb-3.5">
              Về Team Trip Planner
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              Không gian riêng dành trọn cho nhóm bạn 5 – 15 người
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Mỗi chuyến du lịch đáng nhớ đều khởi đầu từ câu hỏi quen thuộc: <em>&ldquo;Hôm nào cả nhóm mình rảnh đi đâu đó đi!&rdquo;</em>.
              Nhưng tin nhắn trôi đi, người bận người quên, kế hoạch cứ thế lỡ dở. Chúng tôi tạo nên Team Trip Planner để biến
              chuyến đi trong mơ thành hiện thực một cách nhẹ nhàng nhất.
            </p>
          </div>

          {/* 3 Story / Value Pillars */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="rounded-3xl bg-card/85 backdrop-blur-md shadow-clay-card border-2 border-white/80 p-6 transition-all duration-200 hover:-translate-y-1">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-clay-badge border border-amber-200/80 mb-5">
                <CalendarCheck2 className="size-6" />
              </div>
              <CardTitle className="text-lg font-bold text-foreground">
                Từ &ldquo;Hôm nào rảnh&rdquo; đến &ldquo;Chốt ngày liền&rdquo;
              </CardTitle>
              <CardDescription className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
                Không ai phải gõ đi gõ lại trong nhóm chat. Mỗi người chỉ mất 15 giây chấm ngày rảnh trực quan trên điện thoại.
                Hệ thống tự động tính điểm và gợi ý khoảng thời gian vàng có đông đủ thành viên nhất.
              </CardDescription>
            </Card>

            <Card className="rounded-3xl bg-card/85 backdrop-blur-md shadow-clay-card border-2 border-white/80 p-6 transition-all duration-200 hover:-translate-y-1">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-clay-badge border border-rose-200/80 mb-5">
                <MapPin className="size-6" />
              </div>
              <CardTitle className="text-lg font-bold text-foreground">
                Một nguồn thông tin duy nhất (Single Source of Truth)
              </CardTitle>
              <CardDescription className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
                Tất cả lịch trình, địa điểm tham quan, ghi chú Google Maps dẫn đường, ý tưởng ăn chơi (Wishlist) và danh sách đồ cần chuẩn bị
                được gom về một màn hình duy nhất, rõ ràng theo từng ngày.
              </CardDescription>
            </Card>

            <Card className="rounded-3xl bg-card/85 backdrop-blur-md shadow-clay-card border-2 border-white/80 p-6 transition-all duration-200 hover:-translate-y-1 sm:col-span-2 lg:col-span-1">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 shadow-clay-badge border border-violet-200/80 mb-5">
                <Wallet className="size-6" />
              </div>
              <CardTitle className="text-lg font-bold text-foreground">
                Đi chơi hết mình, chia tiền phân minh
              </CardTitle>
              <CardDescription className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
                Ai trả tiền thì ghi lại trong 5 giây. Thuật toán tự động cân đối bù trừ để số lần chuyển tiền là ít nhất,
                tích hợp mã VietQR chuyển khoản tức thì, không bao giờ phải ngại ngùng chuyện nhắc nợ.
              </CardDescription>
            </Card>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. MỤC TÍNH NĂNG NỔI BẬT (#features)                      */}
        {/* ========================================================= */}
        <section id="features" className="scroll-mt-20 py-16 sm:py-24 border-t border-white/60">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="bg-white/80 text-primary border-primary/30 mb-3.5">
              Tính năng cốt lõi
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              Tất cả công cụ bạn cần cho chuyến đi hoàn hảo
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Thiết kế theo chuẩn Tactile Clay & Pill UI: tròn trịa, màu sắc tươi sáng, chạm vuốt sướng tay và tối ưu 100% cho điện thoại.
            </p>
          </div>

          {/* Grid 4 Feature Cards */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {/* Feature 1 */}
            <Card className="rounded-3xl bg-card/85 backdrop-blur-md shadow-clay-card border-2 border-white/80 p-6 sm:p-7 transition-all duration-200 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <div className="flex size-13 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-400 text-white shadow-clay-badge">
                  <CalendarCheck2 className="size-6" />
                </div>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                  Thuật toán gợi ý
                </Badge>
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">
                1. Chốt lịch rảnh thông minh
              </h3>
              <p className="mt-2.5 text-sm sm:text-base text-muted-foreground leading-relaxed">
                Khảo sát ngày rảnh của từng thành viên với thanh cọ vẽ (Brush Bar) quét chọn nhanh trên màn hình cảm ứng.
                Hệ thống tự động chấm điểm và gợi ý top 3 khung ngày vàng có đông bạn rảnh nhất để chốt lịch đi chơi.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-white/80 px-3 py-1 shadow-xs border border-white">✓ Quét chọn Rảnh/Có thể/Bận</span>
                <span className="rounded-full bg-white/80 px-3 py-1 shadow-xs border border-white">✓ Khóa lịch 1 chạm</span>
              </div>
            </Card>

            {/* Feature 2 */}
            <Card className="rounded-3xl bg-card/85 backdrop-blur-md shadow-clay-card border-2 border-white/80 p-6 sm:p-7 transition-all duration-200 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <div className="flex size-13 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-clay-badge">
                  <MapPin className="size-6" />
                </div>
                <Badge variant="secondary" className="bg-rose-100 text-rose-800 border-rose-200">
                  Kéo thả sắp xếp
                </Badge>
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">
                2. Lịch trình & Địa điểm trực quan
              </h3>
              <p className="mt-2.5 text-sm sm:text-base text-muted-foreground leading-relaxed">
                Gom toàn bộ lịch trình chi tiết theo từng ngày (Day 1, Day 2...), đính kèm link bản đồ Google Maps dẫn đường,
                gợi ý bảng màu trang phục (Dress code) và bảng danh sách chuẩn bị đồ dùng cá nhân/nhóm.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-white/80 px-3 py-1 shadow-xs border border-white">✓ Tự chèn theo mốc giờ</span>
                <span className="rounded-full bg-white/80 px-3 py-1 shadow-xs border border-white">✓ Wishlist bình chọn ý tưởng</span>
              </div>
            </Card>

            {/* Feature 3 */}
            <Card className="rounded-3xl bg-card/85 backdrop-blur-md shadow-clay-card border-2 border-white/80 p-6 sm:p-7 transition-all duration-200 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <div className="flex size-13 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-clay-badge">
                  <QrCode className="size-6" />
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                  Thanh toán 1 chạm
                </Badge>
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">
                3. Chia tiền minh bạch & VietQR
              </h3>
              <p className="mt-2.5 text-sm sm:text-base text-muted-foreground leading-relaxed">
                Ghi nhận nhanh mọi khoản chi tiêu của nhóm, tự động tính toán bù trừ để số người phải chuyển khoản là ít nhất.
                Tạo sẵn mã VietQR chuẩn xác kèm số tài khoản ngân hàng và số tiền cần chuyển.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-white/80 px-3 py-1 shadow-xs border border-white">✓ Tự tạo mã VietQR chuẩn</span>
                <span className="rounded-full bg-white/80 px-3 py-1 shadow-xs border border-white">✓ Chia đều hoặc chọn người</span>
              </div>
            </Card>

            {/* Feature 4 */}
            <Card className="rounded-3xl bg-card/85 backdrop-blur-md shadow-clay-card border-2 border-white/80 p-6 sm:p-7 transition-all duration-200 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-5">
                <div className="flex size-13 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 text-white shadow-clay-badge">
                  <Camera className="size-6" />
                </div>
                <Badge variant="secondary" className="bg-violet-100 text-violet-800 border-violet-200">
                  Google Drive & MinIO
                </Badge>
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">
                4. Album kỷ niệm & Mời 1 chạm
              </h3>
              <p className="mt-2.5 text-sm sm:text-base text-muted-foreground leading-relaxed">
                Gửi link mời bạn bè tham gia phòng chuyến đi chỉ với 1 cú click. Tích hợp album lưu giữ kho ảnh, video chất lượng gốc
                qua Google Drive và MinIO, kèm sơ đồ xếp phòng ngủ tiện nghi cho cả nhóm.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-white/80 px-3 py-1 shadow-xs border border-white inline-flex items-center gap-1">
                  <Share2 className="size-3 text-violet-500" /> Link mời 1 chạm
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1 shadow-xs border border-white">✓ Giữ nguyên chất lượng ảnh gốc</span>
                <span className="rounded-full bg-white/80 px-3 py-1 shadow-xs border border-white">✓ Sắp xếp phòng ngủ thông minh</span>
              </div>
            </Card>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. MỤC LIÊN HỆ & GÓP Ý (#contact)                         */}
        {/* ========================================================= */}
        <section id="contact" className="scroll-mt-20 py-16 sm:py-24 border-t border-white/60">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge variant="outline" className="bg-white/80 text-primary border-primary/30 mb-3.5">
              Liên hệ & Đóng góp ý kiến
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              Chúng tôi luôn đồng hành cùng chuyến đi của bạn
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Bạn có góp ý tính năng, phát hiện điều cần tối ưu hoặc muốn hợp tác? Đội ngũ phát triển luôn sẵn lòng lắng nghe bạn!
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left Column: Author & Company Info Card */}
            <div className="lg:col-span-5">
              <Card className="rounded-3xl bg-card/90 backdrop-blur-md shadow-clay-card border-2 border-white/90 p-6 sm:p-7 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-fuchsia-400 text-white shadow-clay-badge">
                      <Heart className="size-6" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        Công Ty TNHH Mai Mối
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Đội ngũ phát triển Team Trip Planner
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 text-sm text-foreground/90">
                    <div className="flex items-start gap-3 rounded-2xl bg-white/70 p-3 shadow-xs border border-white">
                      <Users className="size-4.5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground font-medium">Tác giả dự án</div>
                        <div className="font-semibold text-foreground">Các thành viên mai mối</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl bg-white/70 p-3 shadow-xs border border-white">
                      <Mail className="size-4.5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground font-medium">Email hỗ trợ & Hợp tác</div>
                        <a href="mailto:minhduoi142006@gmail.com" className="font-semibold text-primary hover:underline break-all">
                          minhduoi142006@gmail.com
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl bg-white/70 p-3 shadow-xs border border-white">
                      <MapPin className="size-4.5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs text-muted-foreground font-medium">Địa điểm</div>
                        <div className="font-semibold text-foreground">Hà Nội, Việt Nam</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border/60">
                  <p className="text-xs text-muted-foreground italic leading-relaxed">
                    &ldquo;Kết nối những chuyến đi, gắn kết những kỷ niệm đẹp đẽ bên bạn bè và người thương.&rdquo;
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-[11px] bg-rose-50/80 text-rose-600 border-rose-200">
                      Phiên bản 1.0
                    </Badge>
                    <Badge variant="outline" className="text-[11px] bg-violet-50/80 text-violet-600 border-violet-200">
                      Trip Planner
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column: Quick Contact & Feedback Form */}
            <div className="lg:col-span-7">
              <Card className="rounded-3xl bg-card/90 backdrop-blur-md shadow-clay-card border-2 border-white/90 p-6 sm:p-7">
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="text-xl font-bold text-foreground">
                    Gửi tin nhắn hoặc góp ý nhanh
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Mọi ý kiến đóng góp của bạn giúp ứng dụng ngày càng tiện lợi hơn cho các hội nhóm.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-0">
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label htmlFor="contact-name" className="text-xs font-semibold text-foreground">
                          Họ và tên <span className="text-destructive">*</span>
                        </label>
                        <Input
                          id="contact-name"
                          placeholder="Nguyễn Văn A"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          disabled={isSubmitting}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="contact-email" className="text-xs font-semibold text-foreground">
                          Email của bạn <span className="text-destructive">*</span>
                        </label>
                        <Input
                          id="contact-email"
                          type="email"
                          placeholder="example@gmail.com"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          disabled={isSubmitting}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="contact-message" className="text-xs font-semibold text-foreground">
                        Nội dung góp ý / liên hệ <span className="text-destructive">*</span>
                      </label>
                      <Textarea
                        id="contact-message"
                        placeholder="Hãy chia sẻ cảm nghĩ, tính năng bạn muốn có thêm hoặc bất kỳ điều gì bạn muốn nhắn gửi..."
                        rows={4}
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full sm:w-auto rounded-full h-11 px-7 shadow-clay-btn-primary"
                      >
                        {isSubmitting ? (
                          <>Đang gửi...</>
                        ) : (
                          <>
                            <Send className="mr-1.5 size-4" />
                            Gửi liên hệ ngay
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* FOOTER & SCROLL TO TOP                                    */}
      {/* ========================================================= */}
      <footer className="relative z-10 border-t border-white/70 bg-background/85 backdrop-blur-md shadow-clay-dock mt-12 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Left: Brand & Copyright */}
            <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
              <BrandLogo />
              <div className="hidden sm:block h-4 w-px bg-border/60" />
              <p className="text-xs text-muted-foreground">
                © 2026 Team Trip Planner • Phát triển bởi <strong className="text-foreground">Minhduoi</strong> - <strong className="text-foreground">Công Ty TNHH Mai Mối</strong>.
              </p>
            </div>

            {/* Right: Quick Links & Scroll to top */}
            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                <a href="#about" onClick={(e) => handleNavClick(e, 'about')} className="hover:text-primary transition-colors">Giới thiệu</a>
                <a href="#features" onClick={(e) => handleNavClick(e, 'features')} className="hover:text-primary transition-colors">Tính năng</a>
                <a href="#contact" onClick={(e) => handleNavClick(e, 'contact')} className="hover:text-primary transition-colors">Liên hệ</a>
              </nav>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => scrollToTop()}
                className="rounded-full shadow-clay-btn-outline gap-1.5 text-xs"
                aria-label="Cuộn lên đầu trang"
              >
                <ArrowUp className="size-3.5" />
                <span className="hidden sm:inline">Lên đầu trang</span>
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
