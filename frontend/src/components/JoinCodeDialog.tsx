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

/** Nhập mã mời (hoặc dán cả link) → chuyển sang trang /join/:code. */
export function JoinCodeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const [value, setValue] = useState('')

  const code = extractCode(value)

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
          <Input
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="VD: K7MP4QXT"
            className="text-center font-mono text-lg tracking-[0.2em] uppercase"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
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

function extractCode(raw: string): string {
  const trimmed = raw.trim()
  const fromLink = trimmed.match(/\/join\/([A-Za-z0-9]+)/)
  const code = (fromLink ? fromLink[1] : trimmed).replace(/[^A-Za-z0-9]/g, '')
  return code.toUpperCase()
}
