import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import { AuthShell } from '@/components/AuthShell'
import { EmptyState } from '@/components/common/states'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <AuthShell>
      <EmptyState
        icon={Compass}
        title="Không tìm thấy trang"
        description="Trang bạn tìm không tồn tại hoặc đã được dời đi."
        className="rounded-overlay border-solid shadow-raised"
        action={
          <Button asChild>
            <Link to="/">Về trang chủ</Link>
          </Button>
        }
      />
    </AuthShell>
  )
}
