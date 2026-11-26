import { Check, ChevronDown, RotateCw, Search, Trash2 } from 'lucide-react'
import { useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBanks, useClearMyBank, useSetMyBank } from '@/hooks/useBank'
import { getErrorMessage, getFieldErrors } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toTransferContent } from '@/lib/vietqr'
import type { UserResponse } from '@/types/auth'
import type { BankResponse } from '@/types/bank'
import { FieldError } from './common/layout'
import { FormField } from './FormField'

/** BIN của các ngân hàng nhiều người dùng nhất, đưa lên đầu danh sách (P3-PF-03). */
const POPULAR_BINS = [
  '970436', // Vietcombank
  '970422', // MB
  '970407', // Techcombank
  '970418', // BIDV
  '970415', // VietinBank
  '970405', // Agribank
  '970416', // ACB
  '970432', // VPBank
  '970423', // TPBank
  '970403', // Sacombank
  '970441', // VIB
  '970437', // HDBank
]

/** Bỏ dấu + chữ thường để tìm "vietcom", "tien phong"… */
const normalize = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()

type Errors = Partial<Record<'bin' | 'accountNo' | 'accountName', string>>

/** Hồ sơ → Nhận tiền: tài khoản nhận tiền (VietQR). */
export function BankAccountSection({ user }: { user: UserResponse }) {
  const save = useSetMyBank()
  const clear = useClearMyBank()
  const [bin, setBin] = useState(user.bank?.bin ?? '')
  const [accountNo, setAccountNo] = useState(user.bank?.accountNo ?? '')
  const [accountName, setAccountName] = useState(user.bank?.accountName ?? '')
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const bankRef = useRef<HTMLButtonElement>(null)
  const noRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    const next: Errors = {}
    if (!bin) next.bin = 'Chọn ngân hàng'
    if (!accountNo.trim()) next.accountNo = 'Nhập số tài khoản'
    if (!accountName.trim()) next.accountName = 'Nhập tên chủ tài khoản'
    setErrors(next)
    if (next.bin) return bankRef.current?.focus()
    if (next.accountNo) return noRef.current?.focus()
    if (next.accountName) return nameRef.current?.focus()
    save.mutate(
      { bankBin: bin, accountNo: accountNo.trim(), accountName: accountName.trim() },
      {
        onSuccess: () => toast.success('Đã lưu tài khoản nhận tiền'),
        onError: (e) => {
          const fe = getFieldErrors(e)
          const mapped: Errors = { bin: fe.bankBin, accountNo: fe.accountNo, accountName: fe.accountName }
          setErrors(mapped)
          if (!mapped.bin && !mapped.accountNo && !mapped.accountName) setFormError(getErrorMessage(e))
        },
      },
    )
  }

  const clearError = (key: keyof Errors) => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <p className="text-sm text-muted-foreground">
        Số tài khoản sẽ hiện với thành viên các chuyến bạn tham gia, để mọi người quét VietQR chuyển tiền cho bạn.
      </p>

      <BankPicker
        triggerRef={bankRef}
        value={bin}
        error={errors.bin}
        onChange={(value) => {
          setBin(value)
          clearError('bin')
        }}
      />

      <FormField id="bank-no" label="Số tài khoản" error={errors.accountNo}>
        <Input
          ref={noRef}
          id="bank-no"
          inputMode="numeric"
          maxLength={19}
          value={accountNo}
          onChange={(e) => {
            setAccountNo(e.target.value.replace(/\D/g, ''))
            clearError('accountNo')
          }}
        />
      </FormField>
      <FormField
        id="bank-name"
        label="Tên chủ tài khoản"
        error={errors.accountName}
        hint="In hoa, không dấu, đúng như trên app ngân hàng."
      >
        <Input
          ref={nameRef}
          id="bank-name"
          maxLength={50}
          placeholder="NGUYEN THI LINH"
          value={accountName}
          onChange={(e) => {
            setAccountName(e.target.value)
            clearError('accountName')
          }}
          onBlur={() => setAccountName(toTransferContent(accountName, 50).replace(/[0-9]/g, '').trim())}
        />
      </FormField>

      {formError && <FieldError>{formError}</FieldError>}

      <div className="flex flex-wrap justify-end gap-2">
        {user.bank && (
          <Button
            type="button"
            variant="ghost"
            disabled={clear.isPending}
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 />
            Xóa tài khoản
          </Button>
        )}
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Đang lưu…' : 'Lưu tài khoản'}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Xóa tài khoản nhận tiền?"
        description="Mọi người sẽ không quét được mã VietQR để chuyển tiền cho bạn nữa."
        confirmLabel="Xóa"
        destructive
        pending={clear.isPending}
        onConfirm={() =>
          clear.mutate(undefined, {
            onSuccess: () => {
              setBin('')
              setAccountNo('')
              setAccountName('')
              setConfirmClear(false)
              toast.success('Đã xóa tài khoản nhận tiền')
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          })
        }
      />
    </form>
  )
}

/**
 * Chọn ngân hàng có ô tìm theo tên hoặc BIN (P3-PF-03). Danh sách mở ngay trong form (không cần Popover),
 * phím ↑/↓ chọn, Enter xác nhận, Esc đóng. Lỗi tải danh sách thì báo kèm "Thử lại".
 */
function BankPicker({
  triggerRef,
  value,
  error,
  onChange,
}: {
  triggerRef: RefObject<HTMLButtonElement | null>
  value: string
  error?: string
  onChange: (bin: string) => void
}) {
  const banks = useBanks()
  const baseId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const sorted = useMemo(() => {
    const list = banks.data ?? []
    const rank = (b: BankResponse) => {
      const i = POPULAR_BINS.indexOf(b.bin)
      return i === -1 ? POPULAR_BINS.length : i
    }
    return [...list].sort((a, b) => rank(a) - rank(b) || a.shortName.localeCompare(b.shortName, 'vi'))
  }, [banks.data])

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return sorted
    return sorted.filter((b) => b.bin.includes(q) || normalize(`${b.shortName} ${b.name}`).includes(q))
  }, [sorted, query])

  const selected = banks.data?.find((b) => b.bin === value)
  const listId = `${baseId}-list`
  const errorId = `${baseId}-error`
  const optionId = (bin: string) => `${baseId}-opt-${bin}`

  const close = (focusTrigger = true) => {
    setOpen(false)
    setQuery('')
    if (focusTrigger) triggerRef.current?.focus()
  }
  const pick = (bank: BankResponse) => {
    onChange(bank.bin)
    close()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(i + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const bank = filtered[active]
      if (bank) pick(bank)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
    }
  }

  return (
    <div className="grid gap-2">
      <span id={`${baseId}-label`} className="text-sm leading-tight font-medium">
        Ngân hàng
      </span>
      <button
        ref={triggerRef}
        type="button"
        aria-labelledby={`${baseId}-label ${baseId}-value`}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        disabled={banks.isError}
        onClick={() => (open ? close() : (setOpen(true), setActive(0)))}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-control border border-input bg-card px-3.5 text-left text-sm shadow-sunken outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50 aria-invalid:border-destructive"
      >
        <span id={`${baseId}-value`} className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? `${selected.shortName} · ${selected.name}` : banks.isPending ? 'Đang tải…' : 'Chọn ngân hàng'}
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {banks.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
          Không tải được danh sách ngân hàng.
          <Button type="button" variant="outline" size="sm" onClick={() => banks.refetch()}>
            <RotateCw />
            Thử lại
          </Button>
        </div>
      )}

      {open && (
        <div className="grid gap-2 rounded-item border border-border bg-card p-2 shadow-raised">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              autoFocus
              role="combobox"
              data-bank-search
              aria-label="Tìm ngân hàng theo tên hoặc BIN"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={filtered[active] ? optionId(filtered[active].bin) : undefined}
              placeholder="Tìm theo tên hoặc BIN"
              className="pl-9"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={onKeyDown}
            />
          </div>
          <ul id={listId} role="listbox" aria-label="Ngân hàng" className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">Không tìm thấy ngân hàng nào.</li>
            )}
            {filtered.map((b, i) => (
              <li
                key={b.bin}
                id={optionId(b.bin)}
                role="option"
                aria-selected={b.bin === value}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(b)}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-2 rounded-control px-3 py-1.5 text-sm',
                  i === active && 'bg-muted',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{b.shortName}</span>
                  <span className="block truncate text-xs text-muted-foreground">{b.name}</span>
                </span>
                {b.bin === value && <Check className="size-4 shrink-0 text-primary-strong" aria-hidden="true" />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  )
}
