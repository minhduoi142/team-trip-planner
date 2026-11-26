import { LogOut, UserRound } from 'lucide-react'
import { Link, Outlet, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/auth/useAuth'
import { BrandLogo } from './BrandLogo'
import { ProfileDialog } from './ProfileDialog'
import { parseProfileSection, type ProfileSection } from './profile/sections'
import { UserAvatar } from './UserAvatar'
import { FloatingBackground } from '@/components/ui/FloatingBackground'
import { PageContainer } from '@/components/common/layout'

/** Khung chung cho các trang đã đăng nhập: header + nội dung + hình trang trí bay bổng (nền video là TripBackground ở App). */
export function AppLayout() {
  const { user, logout } = useAuth()
  // Dialog Hồ sơ mở theo ?profile=<mục> (P3-PF-01): link từ email/trang xác minh mở thẳng đúng mục.
  const [params, setParams] = useSearchParams()
  const profileParam = params.get('profile')
  const profileOpen = profileParam !== null
  const profileSection = parseProfileSection(profileParam)
  const setProfile = (section: ProfileSection | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (section) next.set('profile', section)
        else next.delete('profile')
        return next
      },
      { replace: true },
    )

  return (
    <div className="relative min-h-svh overflow-x-clip">
      <FloatingBackground density="corners" />
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <PageContainer className="flex h-16 items-center justify-between">
          <Link to="/trips" aria-label="Về danh sách chuyến đi" className="rounded-item">
            <BrandLogo />
          </Link>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto gap-2 rounded-full p-1 pr-3" aria-label="Tài khoản">
                  <UserAvatar userId={user.id} name={user.displayName} avatarUrl={user.avatarUrl} />
                  <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">{user.displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="grid gap-0.5">
                  <span className="truncate text-sm text-foreground">{user.displayName}</span>
                  {user.username && <span className="truncate font-normal">@{user.username}</span>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setProfile('account')}>
                  <UserRound />
                  Hồ sơ
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={logout}>
                  <LogOut />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </PageContainer>
      </header>

      <PageContainer asMain className="relative z-10 pt-6 pb-16">
        <Outlet />
      </PageContainer>

      {user && (
        <ProfileDialog
          user={user}
          open={profileOpen}
          section={profileSection}
          onOpenChange={(open) => setProfile(open ? profileSection : null)}
          onSectionChange={setProfile}
        />
      )}
    </div>
  )
}
