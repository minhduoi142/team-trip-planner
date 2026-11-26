import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { extractInviteCode } from '@/lib/inviteCode'

/** Nhập mã mời (hoặc dán cả link) → chuyển sang trang /join/:code. */
export function JoinCodeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const [value, setValue] = useState('')

  const code = extractInviteCode(value)
  const invalid = value.trim() !== '' && !code

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!code) return
    onOpenChange(false)
    setValue('')
    navigate(`/join/${code}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Nhập mã mời</DialogTitle>
            <DialogDescription>Mã gồm 8 ký tự, hoặc dán nguyên link mời vào đây.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Input
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              aria-label="Mã mời"
              aria-invalid={invalid}
              aria-describedby={invalid ? 'join-code-error' : undefined}
              placeholder="VD: K7MP4QXT"
              className="text-center font-mono text-lg tracking-widest uppercase"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            {invalid && (
              <p id="join-code-error" role="alert" className="text-sm text-destructive">
                Mã chưa hợp lệ: mã gồm 8 ký tự, hoặc dán link /join/… hay /share/…
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!code} className="w-full sm:w-auto">
              Tiếp tục
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
