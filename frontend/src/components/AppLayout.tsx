import { LogOut, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet } from 'react-router'
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
import { UserAvatar } from './UserAvatar'
import { FloatingBackground } from '@/components/ui/FloatingBackground'

/** Khung chung cho các trang đã đăng nhập: header + nội dung + hình trang trí bay bổng (nền video là TripBackground ở App). */
export function AppLayout() {
  const { user, logout } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <div className="relative min-h-svh overflow-x-hidden">
      <FloatingBackground />
      <header className="sticky top-0 z-30 border-b border-white/70 bg-background/75 backdrop-blur-md shadow-clay-badge">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/trips" aria-label="Về trang chủ">
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
                <DropdownMenuLabel className="truncate">Xin chào, {user.displayName} 👋</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
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
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 pt-6 pb-16">
        <Outlet />
      </main>

      {user && <ProfileDialog user={user} open={profileOpen} onOpenChange={setProfileOpen} />}
    </div>
  )
}
