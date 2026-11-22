import { Link } from 'react-router'
import { AuthShell } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function NotFoundPage() {
  return (
    <AuthShell>
      <Card className="rounded-[32px] border-2 border-white/80 bg-card/95 shadow-clay-card p-4">
        <CardContent className="space-y-4 p-6 sm:p-8 text-center">
          <p className="text-6xl animate-float-slow">🧭</p>
          <h1 className="text-2xl font-bold text-foreground">Lạc đường rồi!</h1>
          <p className="text-sm font-medium text-muted-foreground">Trang bạn tìm không tồn tại hoặc đã được dời đi.</p>
          <Button asChild className="rounded-full shadow-clay-btn-primary font-bold px-6">
            <Link to="/trips">Về trang chủ ✨</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
