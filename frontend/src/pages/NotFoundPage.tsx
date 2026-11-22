import { Link } from 'react-router'
import { AuthShell } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <AuthShell>
      <div className="space-y-4 text-center">
        <p className="text-5xl">🧭</p>
        <h1 className="text-xl font-semibold">Lạc đường rồi!</h1>
        <p className="text-muted-foreground">Trang bạn tìm không tồn tại.</p>
        <Button asChild>
          <Link to="/trips">Về trang chủ</Link>
        </Button>
      </div>
    </AuthShell>
  )
}
