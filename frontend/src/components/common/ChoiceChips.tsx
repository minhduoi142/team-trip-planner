import type { LucideIcon } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export interface ChoiceOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

interface ChoiceChipsProps<T extends string> {
  /** Tên nhóm cho trình đọc màn hình (vd "Loại hoạt động", "Lọc") */
  label: string
  options: readonly ChoiceOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'default' | 'sm'
  className?: string
}

/**
 * Chọn đúng một giá trị trong nhóm viên (docs/ui-slop-audit.md P1-41 CategoryPicker, P1-42 FilterChips).
 * Bấm lại viên đang chọn không bỏ chọn (luôn có một giá trị). Có phím mũi tên nhờ Radix ToggleGroup.
 */
export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
  size,
  className,
}: ChoiceChipsProps<T>) {
  return (
    <ToggleGroup
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as T)
      }}
      className={className}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} size={size}>
          {option.icon && <option.icon />}
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
