import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import dayjs from 'dayjs'
import {
  ArrowRight,
  ArrowUp,
  BedDouble,
  CloudSun,
  Images,
  LogIn,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  QrCode,
  Shirt,
  ThumbsUp,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { BrandLogo } from '@/components/BrandLogo'
import { CountdownLabel } from '@/components/CountdownLabel'
import { FieldError } from '@/components/common/layout'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { StatusBadge } from '@/components/StatusBadge'
import { TripCover } from '@/components/TripCover'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card } from '@/components/ui/card'
import { FloatingBackground } from '@/components/ui/FloatingBackground'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CONTACT_EMAIL, CONTACT_GMAIL_URL, CONTACT_ZALO_URL } from '@/lib/config'
import { formatDateRange } from '@/lib/date'
import { extractInviteCode } from '@/lib/inviteCode'
import { cn } from '@/lib/utils'

/**
 * Trang giới thiệu cho khách chưa đăng nhập (người đã đăng nhập được chuyển tới /trips).
 * Bố cục: header, hero (CTA + ô mã mời + ví dụ chuyến đi), "Cách nhóm bạn dùng" (4 bước thật), liên hệ, footer.
 * Copy phải khớp hành vi thật của app (docs/ui-slop-audit.md P3-LD-05): không số liệu bịa, không tên công nghệ nội bộ.
 */
const NAV_LINKS = [
  { id: 'features', label: 'Cách dùng' },
  { id: 'contact', label: 'Liên hệ' },
] as const

const INVITE_ERROR_ID = 'landing-invite-error'

/** Ngày ví dụ tính theo hôm nay để thẻ mẫu không bao giờ là chuyến đã qua */
const SAMPLE_START = dayjs().add(12, 'day')
const SAMPLE_DAYS = [0, 1, 2].map((i) => SAMPLE_START.add(i, 'day'))
const SAMPLE_TRIP = {
  status: 'UPCOMING' as const,
  startDate: SAMPLE_DAYS[0].format('YYYY-MM-DD'),
  endDate: SAMPLE_DAYS[2].format('YYYY-MM-DD'),
  plannedStartDate: null,
}

export function LandingPage() {
  const { status } = useAuth()
  const navigate = useNavigate()
  // Ô "Có mã mời?": người được mời tự gõ tên miền vẫn vào thẳng trang tham gia
  const [inviteInput, setInviteInput] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)

  if (status === 'loading') return <FullPageSpinner />
  if (status === 'authenticated') return <Navigate to="/trips" replace />

  const goToInvite = (e: FormEvent) => {
    e.preventDefault()
    const code = extractInviteCode(inviteInput)
    if (code.length < 4) {
      setInviteError('Nhập mã mời (8 ký tự) hoặc dán link mời bạn bè gửi.')
      return
    }
    navigate(`/join/${code}`)
  }

  return (
    <div id="top" className="relative min-h-svh overflow-x-clip selection:bg-primary/20 selection:text-foreground">
      {/* Hình trang trí bay bổng; nền video là TripBackground ở App */}
      <FloatingBackground />

      <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" aria-label="Team Trip Planner: trang giới thiệu" className="flex items-center rounded-item">
            <BrandLogo />
          </Link>

          <nav aria-label="Các mục trên trang" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted/70 hover:text-primary-strong"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Button asChild variant="outline" size="sm">
              <Link to="/login">
                <LogIn />
                Đăng nhập
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">Tạo tài khoản</Link>
            </Button>
          </div>

          {/* Menu mobile: DropdownMenu của Radix có sẵn Esc, chạm ra ngoài để đóng, giữ focus */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-11 md:hidden" aria-label="Mở menu">
                <Menu className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {NAV_LINKS.map((link) => (
                <DropdownMenuItem key={link.id} asChild className="min-h-11 text-base">
                  <a href={`#${link.id}`}>{link.label}</a>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="min-h-11 text-base">
                <Link to="/login">
                  <LogIn />
                  Đăng nhập
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="min-h-11 text-base font-semibold text-primary-strong">
                <Link to="/register">
                  <UserPlus />
                  Tạo tài khoản
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6">
        {/* HERO */}
        <section className="pt-10 pb-16 sm:pt-16 sm:pb-20">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="reading-surface px-5 py-8 text-center sm:px-8 lg:col-span-7 lg:text-left">
              <h1 className="text-3xl font-bold tracking-tight text-balance text-foreground sm:text-5xl lg:text-5xl/tight">
                Lên kèo đi chơi nhóm, <span className="text-primary-strong">không còn ai phải đau đầu</span>
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-foreground/80 sm:text-lg lg:mx-0">
                Hỏi ngày rảnh, chốt lịch trình, ghi lại ai trả gì và chia tiền: cả nhóm làm chung trên một trang thay vì
                lục lại tin nhắn trong nhóm chat.
              </p>

              <div className="mx-auto mt-8 grid max-w-md gap-2 lg:mx-0">
                <Button asChild size="lg" className="w-full sm:w-auto sm:justify-self-center lg:justify-self-start">
                  <Link to="/register">
                    Tạo chuyến đi
                    <ArrowRight />
                  </Link>
                </Button>
                <p className="text-sm text-foreground/75">
                  Miễn phí. Đã có tài khoản?{' '}
                  <Link to="/login" className="font-semibold text-primary-strong hover:underline">
                    Đăng nhập
                  </Link>
                </p>
              </div>

              {/* Có mã mời? → trang tham gia (không cần đăng nhập trước) */}
              <form onSubmit={goToInvite} noValidate className="mx-auto mt-8 grid max-w-md gap-2 text-left lg:mx-0">
                <Label htmlFor="landing-invite" className="text-base font-semibold">
                  Có mã mời?
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="landing-invite"
                    value={inviteInput}
                    onChange={(e) => {
                      setInviteInput(e.target.value)
                      setInviteError(null)
                    }}
                    placeholder="Mã hoặc link mời"
                    autoCapitalize="characters"
                    autoComplete="off"
                    aria-invalid={inviteError ? true : undefined}
                    aria-describedby={inviteError ? INVITE_ERROR_ID : undefined}
                    className="h-11 min-w-0 flex-1 bg-card"
                  />
                  <Button type="submit" variant="outline" className="h-11 shrink-0">
                    Vào nhóm
                  </Button>
                </div>
                <FieldError id={INVITE_ERROR_ID}>{inviteError}</FieldError>
              </form>
            </div>

            <div className="lg:col-span-5">
              <SampleTripCard />
            </div>
          </div>
        </section>

        {/* CÁCH NHÓM BẠN DÙNG */}
        <section id="features" className="scroll-mt-20 border-t border-border/60 py-16 sm:py-20">
          <div className="reading-surface max-w-2xl px-5 py-6 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Cách nhóm bạn dùng</h2>
            <p className="mt-3 text-base leading-relaxed text-foreground/80">
              Một người tạo chuyến đi, những người còn lại vào bằng link mời. Sau đó mọi việc đi theo bốn bước.
            </p>
          </div>

          <ol className="mt-12 grid gap-14 sm:gap-16">
            <Step
              index={1}
              title="Gửi link mời vào nhóm chat"
              body="Mở link là thấy tên chuyến, ai chưa có tài khoản thì đăng ký xong được đưa thẳng vào nhóm."
              illustration={<InviteIllustration />}
            />
            <Step
              index={2}
              reverse
              title="Mỗi người chấm ngày rảnh"
              body="Chọn Rảnh, Có thể hoặc Bận rồi kéo ngón tay qua các ngày. App gợi ý ba khoảng ngày nhiều người rảnh nhất để trưởng nhóm chốt."
              illustration={<AvailabilityIllustration />}
            />
            <Step
              index={3}
              title="Lên lịch trình từng ngày"
              body="Thêm hoạt động có giờ thì tự xếp đúng chỗ, kéo thả để đổi thứ tự. Ý tưởng chưa chắc thì để vào wishlist cho cả nhóm thả tim."
              illustration={<ItineraryIllustration />}
            />
            <Step
              index={4}
              reverse
              title="Ghi chi tiêu, chia tiền"
              body="Ai trả khoản nào thì ghi lại, chia đều hoặc chọn người. App tính sẵn ai cần chuyển cho ai, kèm mã VietQR để quét."
              illustration={<ExpenseIllustration />}
            />
          </ol>

          <div className="reading-surface mt-16 p-5 sm:p-6">
            <h3 className="text-lg font-bold text-foreground">Ngoài ra</h3>
            <ul className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <Extra icon={Images} title="Album ảnh">
                Gom link ảnh Google Drive của cả nhóm, gắn theo từng ngày.
              </Extra>
              <Extra icon={BedDouble} title="Chia phòng">
                Xếp từng người vào phòng, không vượt quá sức chứa.
              </Extra>
              <Extra icon={Shirt} title="Dress code và checklist">
                Bảng màu trang phục cho mỗi ngày, danh sách đồ cần mang có người phụ trách.
              </Extra>
              <Extra icon={ThumbsUp} title="Bình chọn">
                Hỏi ý cả nhóm khi cần chọn một phương án.
              </Extra>
              <Extra icon={CloudSun} title="Thời tiết">
                Dự báo cho từng ngày khi chuyến đi đã gần.
              </Extra>
              <Extra icon={Mail} title="Email nhắc">
                Báo khi có người vào nhóm, có khoản chi mới và đếm ngược trước ngày đi. Tắt được bất cứ lúc nào.
              </Extra>
            </ul>
          </div>
        </section>

        {/* LIÊN HỆ */}
        <section id="contact" className="scroll-mt-20 border-t border-border/60 py-16 sm:py-20">
          <Card className="max-w-2xl gap-0 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">Góp ý / báo lỗi</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Gặp lỗi hoặc muốn có thêm tính năng? Nhắn qua kênh bạn quen dùng.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              {CONTACT_ZALO_URL && (
                <Button asChild variant="outline" size="lg">
                  <a href={CONTACT_ZALO_URL} target="_blank" rel="noreferrer">
                    <MessageCircle />
                    Nhắn Zalo
                  </a>
                </Button>
              )}
              <Button asChild variant="outline" size="lg">
                <a href={CONTACT_GMAIL_URL} target="_blank" rel="noreferrer">
                  <Mail />
                  Gửi Gmail
                </a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Hoặc gửi thư tới{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-semibold break-all text-primary-strong hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </Card>
        </section>
      </main>

      <footer className="relative z-10 mt-12 border-t border-border bg-background/95 py-8">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
              <BrandLogo />
              <div className="hidden h-4 w-px bg-border/60 sm:block" />
              <p className="text-xs text-muted-foreground">
                © 2026 Team Trip Planner • Phát triển bởi <strong className="text-foreground">Minhduoi</strong> -{' '}
                <strong className="text-foreground">Công Ty TNHH Mai Mối</strong>.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <nav
                aria-label="Liên kết cuối trang"
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground"
              >
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    className="inline-flex min-h-11 items-center px-2 transition-colors hover:text-primary-strong"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              <Button asChild variant="outline" size="sm">
                <a href="#top" aria-label="Lên đầu trang">
                  <ArrowUp />
                  <span className="hidden sm:inline">Lên đầu trang</span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

/** Thẻ chuyến đi mẫu dựng từ component thật (TripCover, StatusBadge, CountdownLabel); số liệu khớp nhau. */
function SampleTripCard() {
  return (
    <figure className="mx-auto max-w-md lg:max-w-none">
      <div aria-hidden="true" className="overflow-hidden rounded-surface border border-border/60 bg-card shadow-raised">
        <TripCover coverImageUrl="preset:mountain" seed={0} withOverlay className="h-40">
          <div className="flex h-full flex-col justify-between p-4 text-white">
            <StatusBadge status="UPCOMING" className="self-start" />
            <p className="text-xl leading-tight font-bold drop-shadow">Đà Lạt săn mây</p>
          </div>
        </TripCover>
        <div className="grid gap-3 p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" />
              Đà Lạt, Lâm Đồng
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" />8 thành viên
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              {formatDateRange(SAMPLE_TRIP.startDate, SAMPLE_TRIP.endDate)}
            </span>
            <CountdownLabel trip={SAMPLE_TRIP} />
          </div>
        </div>
      </div>
      <figcaption className="reading-surface mx-auto mt-2 w-fit rounded-control px-3 py-1 text-center text-xs text-foreground/75">
        Ví dụ một chuyến đi trong app
      </figcaption>
    </figure>
  )
}

function Step({
  index,
  title,
  body,
  illustration,
  reverse = false,
}: {
  index: number
  title: string
  body: string
  illustration: ReactNode
  reverse?: boolean
}) {
  return (
    <li className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
      <div className={cn('reading-surface p-5', reverse && 'md:order-2')}>
        <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary-strong">
          {index}
        </span>
        <h3 className="mt-3 text-xl font-bold text-foreground">{title}</h3>
        <p className="mt-2 text-base leading-relaxed text-foreground/80">{body}</p>
      </div>
      {/* Minh hoạ tĩnh, không bấm được: ẩn với trình đọc màn hình vì đã có đoạn mô tả ở trên */}
      <div aria-hidden="true" className={reverse ? 'md:order-1' : undefined}>
        <div className="rounded-surface border border-border/60 bg-card p-4 shadow-raised">{illustration}</div>
      </div>
    </li>
  )
}

function InviteIllustration() {
  return (
    <div className="grid gap-3">
      <p className="text-sm font-semibold text-foreground">Link mời</p>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 truncate rounded-control border border-border bg-muted/50 px-3 py-2 font-mono text-sm text-muted-foreground">
          …/join/K7MP4QXT
        </div>
        <span className="rounded-control bg-primary-strong px-3 py-2 text-sm font-semibold text-primary-strong-foreground">
          Chép
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Ai có link đều vào được, trưởng nhóm có thể đổi mã bất cứ lúc nào.
      </p>
    </div>
  )
}

const AVAIL_STYLE = {
  yes: 'bg-avail-yes-soft text-avail-yes-soft-foreground',
  maybe: 'bg-avail-maybe-soft text-avail-maybe-soft-foreground',
  no: 'bg-avail-no-soft text-avail-no-soft-foreground',
} as const
const AVAIL_LABEL = { yes: 'Rảnh', maybe: 'Có thể', no: 'Bận' } as const
const AVAIL_ROWS: { name: string; days: (keyof typeof AVAIL_STYLE)[] }[] = [
  { name: 'Linh', days: ['yes', 'yes', 'yes'] },
  { name: 'Mai', days: ['yes', 'yes', 'maybe'] },
  { name: 'Lan', days: ['no', 'yes', 'yes'] },
]

function AvailabilityIllustration() {
  return (
    <div className="grid gap-2 text-xs">
      <div className="grid grid-cols-[3.5rem_repeat(3,1fr)] gap-1.5 text-center font-medium text-muted-foreground">
        <span />
        {SAMPLE_DAYS.map((d) => (
          <span key={d.valueOf()}>{d.format('DD/MM')}</span>
        ))}
      </div>
      {AVAIL_ROWS.map((row) => (
        <div key={row.name} className="grid grid-cols-[3.5rem_repeat(3,1fr)] items-center gap-1.5 text-center">
          <span className="truncate text-left text-sm font-medium text-foreground">{row.name}</span>
          {row.days.map((value, i) => (
            <span key={i} className={`rounded-control py-2 font-semibold ${AVAIL_STYLE[value]}`}>
              {AVAIL_LABEL[value]}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

function ItineraryIllustration() {
  const items = [
    { time: '05:30', title: 'Săn mây đồi chè Cầu Đất', note: 'Cầu Đất' },
    { time: '12:00', title: 'Lẩu gà lá é', note: 'Bữa trưa cả nhóm' },
    { time: '19:00', title: 'Chợ đêm Đà Lạt', note: 'Trung tâm' },
  ]
  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold text-foreground">Ngày 1 · {SAMPLE_DAYS[0].format('DD/MM')}</p>
      {items.map((item) => (
        <div key={item.time} className="flex items-center gap-3 rounded-item border border-border/60 p-2.5">
          <span className="shrink-0 rounded-control bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground tabular-nums">
            {item.time}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
            <p className="truncate text-xs text-muted-foreground">{item.note}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function ExpenseIllustration() {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">Lẩu gà lá é</p>
          <p className="text-xs text-muted-foreground">Linh trả · chia đều 8 người</p>
        </div>
        <span className="shrink-0 text-sm font-bold text-foreground tabular-nums">4.800.000đ</span>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-item bg-muted/50 p-3">
        <p className="min-w-0 text-sm text-foreground">
          Mai chuyển cho Linh <span className="font-bold text-money-out tabular-nums">600.000đ</span>
        </p>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-control border border-border bg-card px-2 py-1 text-xs font-semibold text-foreground">
          <QrCode className="size-3.5" />
          VietQR
        </span>
      </div>
    </div>
  )
}

function Extra({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary-strong" aria-hidden="true" />
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-foreground/75">{children}</p>
      </div>
    </li>
  )
}
