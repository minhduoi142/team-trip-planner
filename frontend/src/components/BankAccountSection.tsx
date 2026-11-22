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
    <form onSubmit={submit} className="grid gap-3 rounded-2xl bg-muted/40 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Landmark className="size-4" />
        Tài khoản nhận tiền
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="bank-bin">Ngân hàng</Label>
        <Select value={bin} onValueChange={setBin}>
          <SelectTrigger id="bank-bin" className="w-full">
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
        <Label htmlFor="bank-no">Số tài khoản</Label>
        <Input
          id="bank-no"
          inputMode="numeric"
          maxLength={19}
          value={accountNo}
          onChange={(e) => setAccountNo(e.target.value.replace(/\D/g, ''))}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="bank-name">Tên chủ tài khoản</Label>
        <Input
          id="bank-name"
          maxLength={50}
          placeholder="NGUYEN THI LINH"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          onBlur={() => setAccountName(toTransferContent(accountName, 50).replace(/[0-9]/g, '').trim())}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Số tài khoản sẽ hiện với thành viên các chuyến bạn tham gia, để mọi người quét QR chuyển tiền cho bạn.
      </p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={save.isPending}>
          {save.isPending ? 'Đang lưu…' : 'Lưu tài khoản'}
        </Button>
        {user.bank && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={clear.isPending}
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
            <Trash2 />
            Xóa
          </Button>
        )}
      </div>
    </form>
  )
}
