import { CloudSun, Plus, Shirt } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { PackingSuggestion } from '@/lib/packing'

interface PackingSuggestionsProps {
  suggestions: PackingSuggestion[]
  pending: boolean
  onAdd: (suggestion: PackingSuggestion) => Promise<unknown>
}

/**
 * Gợi ý theo dự báo thời tiết + outfit mình đã đăng (docs/sdd-packing-list.md 4.3). Tính trên FE, không lưu;
 * món đã có thì không gợi ý. Ẩn khi không còn gì.
 */
export function PackingSuggestions({ suggestions, pending, onAdd }: PackingSuggestionsProps) {
  const [addingAll, setAddingAll] = useState(false)
  if (suggestions.length === 0) return null

  const addAll = async () => {
    setAddingAll(true)
    try {
      for (const s of suggestions) {
        await onAdd(s)
      }
    } finally {
      setAddingAll(false)
    }
  }

  return (
    <section aria-label="Gợi ý cho bạn" className="grid gap-2 rounded-surface border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground">Gợi ý cho bạn</h3>
        {suggestions.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="-mr-2 text-primary-strong"
            disabled={pending || addingAll}
            onClick={addAll}
          >
            Thêm tất cả
          </Button>
        )}
      </div>
      <ul className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <li key={s.itemName} className="min-w-0 max-w-full">
            <button
              type="button"
              disabled={pending || addingAll}
              onClick={() => onAdd(s)}
              className="flex min-h-10 max-w-full items-center gap-1.5 rounded-item border border-dashed border-primary-strong bg-background px-3 py-1.5 text-left text-sm text-foreground transition-colors outline-none hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-50"
            >
              <Plus className="size-4 shrink-0 text-primary-strong" aria-hidden="true" />
              {s.source === 'weather' ? (
                <CloudSun className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              ) : (
                <Shirt className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <span className="min-w-0 font-medium break-words">{s.itemName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">· {s.reason}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
