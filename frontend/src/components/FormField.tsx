import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'

interface FormFieldProps {
  id: string
  label: string
  error?: string
  hint?: string
  optional?: boolean
  children: ReactNode
}

type DescribableProps = { 'aria-describedby'?: string; 'aria-invalid'?: boolean | 'true' | 'false' }

/**
 * Nhãn + control + lỗi/gợi ý. Khi children là một phần tử duy nhất, FormField tự nối lỗi/gợi ý vào control
 * qua `aria-describedby` và đặt `aria-invalid` khi có lỗi, để trình đọc màn hình đọc được.
 */
export function FormField({ id, label, error, hint, optional, children }: FormFieldProps) {
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  let control = children
  if (messageId && Children.count(children) === 1 && isValidElement<DescribableProps>(children)) {
    const child = children as ReactElement<DescribableProps>
    const describedBy = [child.props['aria-describedby'], messageId].filter(Boolean).join(' ')
    control = cloneElement(child, {
      'aria-describedby': describedBy,
      ...(error && child.props['aria-invalid'] === undefined ? { 'aria-invalid': true } : {}),
    })
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-muted-foreground">(không bắt buộc)</span>}
      </Label>
      {control}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
