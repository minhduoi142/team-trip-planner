import { Landmark, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBanks, useClearMyBank, useSetMyBank } from '@/hooks/useBank'
import { getErrorMessage } from '@/lib/api'
import { toTransferContent } from '@/lib/vietqr'
import type { UserResponse } from '@/types/auth'

/** Tài khoản nhận tiền (VietQR) trong hồ sơ. */
export function BankAccountSection({ user }: { user: UserResponse }) {
  const banks = useBanks()
  const save = useSetMyBank()
  const clear = useClearMyBank()
  const [bin, setBin] = useState(user.bank?.bin ?? '')
  const [accountNo, setAccountNo] = useState(user.bank?.accountNo ?? '')
  const [accountName, setAccountName] = useState(user.bank?.accountName ?? '')
  const onError = (e: unknown) => toast.error(getErrorMessage(e))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!bin || !accountNo.trim() || !accountName.trim()) {
      toast.error('Điền đủ ngân hàng, số tài khoản và tên chủ tài khoản')
      return
    }
    save.mutate(
      { bankBin: bin, accountNo: accountNo.trim(), accountName: accountName.trim() },
      { onSuccess: () => toast.success('Đã lưu tài khoản nhận tiền'), onError },
    )
  }

  return (
        <form onSubmit={submit} className="grid gap-3.5 rounded-[24px] border-2 border-white/80 bg-card/90 p-4 sm:p-5 shadow-clay-card">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Landmark className="size-4 text-primary" />
            Tài khoản nhận tiền (VietQR)
          </p>
          <div className="grid gap-1.5">
            <Label htmlFor="bank-bin" className="text-xs font-semibold">Ngân hàng</Label>
            <Select value={bin} onValueChange={setBin}>
                <SelectTrigger id="bank-bin" className="w-full rounded-full shadow-clay-card">
                  <SelectValue placeholder={banks.isPending ? 'Đang tải…' : 'Chọn ngân hàng'} />
                </SelectTrigger>
                <SelectContent>
                  {banks.data?.map((b) => (
                    <SelectItem key={b.bin} value={b.bin}>
                      {b.shortName}
                    </SelectItem>
                  ))}
                </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="bank-no" className="text-xs font-semibold">Số tài khoản</Label>
            <Input
              id="bank-no"
              inputMode="numeric"
              maxLength={19}
              value={accountNo}
              onChange={(e) => setAccountNo(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="bank-name" className="text-xs font-semibold">Tên chủ tài khoản</Label>
            <Input
              id="bank-name"
              maxLength={50}
              placeholder="NGUYEN THI LINH"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              onBlur={() => setAccountName(toTransferContent(accountName, 50).replace(/[0-9]/g, '').trim())}
            />
          </div>
            <p className="text-xs text-muted-foreground font-medium">
              Số tài khoản sẽ hiện với thành viên các chuyến bạn tham gia, để mọi người quét QR chuyển tiền cho bạn.
            </p>
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" disabled={save.isPending}>
                  {save.isPending ? 'Đang lưu…' : 'Lưu tài khoản'}
                </Button>
                {user.bank && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={clear.isPending}
                    className="rounded-full text-destructive hover:bg-destructive/10"
                    onClick={() =>
                      clear.mutate(undefined, {
                        onSuccess: () => {
                          setBin('')
                          setAccountNo('')
                          setAccountName('')
                          toast.success('Đã xóa tài khoản nhận tiền')
                        },
                        onError,
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                    Xóa
                  </Button>
                )}
              </div>
            </form>
            )
}
