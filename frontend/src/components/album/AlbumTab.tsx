import { ExternalLink, FolderOpen, ImageOff, ImagePlus, Images, MoreVertical, Pencil, Trash2, X } from 'lucide-react'
import { memo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormField } from '@/components/FormField'
import { ChoiceChips } from '@/components/common/ChoiceChips'
import { EmptyState, TabErrorState, TabSkeleton } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { dayLabel } from '@/components/itinerary/dayLabel'
import {
  useAddAlbumPhotos,
  useAlbum,
  useDeleteAlbumPhoto,
  useSetAlbumFolder,
  useUpdateAlbumPhoto,
} from '@/hooks/useAlbum'
import { useItinerary } from '@/hooks/useItinerary'
import { getErrorMessage } from '@/lib/api'
import type { AddPhotosRequest, AlbumPhotoResponse } from '@/types/album'
import type { ItineraryDayResponse } from '@/types/itinerary'

const NO_DAY = 'none'
/** Số ảnh hiện mỗi lần (P3-AL-04): album 200 ảnh không render hết một lúc. */
const PAGE_SIZE = 24

interface AlbumTabProps {
  tripId: number
  canEdit: boolean
}

export function AlbumTab({ tripId, canEdit }: AlbumTabProps) {
  const album = useAlbum(tripId)
  const itinerary = useItinerary(tripId)
  const setFolder = useSetAlbumFolder(tripId)
  const addPhotos = useAddAlbumPhotos(tripId)
  const deletePhoto = useDeleteAlbumPhoto(tripId)
  const updatePhoto = useUpdateAlbumPhoto(tripId)

  const [showEmbed, setShowEmbed] = useState(false)
  const [folderOpen, setFolderOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [editing, setEditing] = useState<AlbumPhotoResponse | null>(null)
  const [toDelete, setToDelete] = useState<AlbumPhotoResponse | null>(null)

  if (album.isPending) return <TabSkeleton variant="grid" rows={3} />
  if (album.isError) return <TabErrorState error={album.error} onRetry={() => album.refetch()} />

  const data = album.data
  const days = (itinerary.data?.days ?? []).filter((d) => !d.overflow)
  const onError = (e: unknown) => toast.error(getErrorMessage(e))
  const photos = filter === 'all' ? data.photos : data.photos.filter((p) => String(p.dayId) === filter)
  const shown = photos.slice(0, visible)
  const remaining = photos.length - shown.length

  const submitPhotos = (body: AddPhotosRequest) =>
    addPhotos.mutate(body, {
      onSuccess: (res) => {
        const invalid = res.skipped.filter((s) => s.reason === 'INVALID').length
        const dup = res.skipped.filter((s) => s.reason === 'DUPLICATE').length
        const notes = [invalid && `${invalid} link không phải file Drive`, dup && `${dup} link đã có`].filter(Boolean)
        if (res.added > 0) {
          setAddOpen(false)
          toast.success(`Đã thêm ${res.added} ảnh${notes.length ? ` · bỏ qua ${notes.join(', ')}` : ''}`)
        } else toast.error(`Chưa thêm được ảnh nào${notes.length ? `: ${notes.join(', ')}` : ''}`)
      },
      onError,
    })

  const addButton = (
    <Button onClick={() => setAddOpen(true)}>
      <ImagePlus />
      Thêm ảnh
    </Button>
  )

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">
          Ảnh nổi bật{data.photos.length > 0 && <span className="text-muted-foreground"> ({data.photos.length})</span>}
        </h2>
        {data.photos.length > 0 && addButton}
      </div>

      {/* Lọc theo ngày */}
      {data.photos.length > 0 && days.length > 0 && (
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ChoiceChips
            label="Lọc theo ngày"
            className="flex-nowrap"
            value={filter}
            onChange={(next) => {
              setFilter(next)
              setVisible(PAGE_SIZE)
            }}
            options={[
              { value: 'all', label: 'Tất cả' },
              ...days.map((d) => ({ value: String(d.id), label: `Ngày ${d.dayIndex}` })),
            ]}
          />
        </div>
      )}

      {/* Lưới ảnh: nội dung chính nên đứng đầu (P3-AL-01) */}
      {data.photos.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Chưa có ảnh nào"
          description="Dán link ảnh Drive đẹp nhất của chuyến để cả nhóm cùng xem."
          action={addButton}
        />
      ) : photos.length === 0 ? (
        <p className="rounded-surface border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Ngày này chưa có ảnh.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {shown.map((p, i) => (
              <PhotoTile key={p.id} photo={p} index={i + 1} onEdit={setEditing} onDelete={setToDelete} />
            ))}
          </ul>
          {remaining > 0 && (
            <Button variant="outline" className="justify-self-center" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Xem thêm ({remaining})
            </Button>
          )}
        </>
      )}

      {/* Thư mục Drive chung: một dòng (P3-AL-01) */}
      <section
        className="grid gap-3 rounded-surface border border-border bg-card p-4"
        aria-label="Thư mục Google Drive"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <FolderOpen className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Thư mục Google Drive chung</p>
            <p className="text-sm text-muted-foreground">
              {data.folderUrl
                ? 'Ảnh/video gốc chất lượng cao, cả nhóm cùng tải lên.'
                : canEdit
                  ? 'Chưa gắn thư mục. Gắn link để cả nhóm cùng tải ảnh gốc lên.'
                  : 'Chưa gắn thư mục. Nhờ trưởng nhóm gắn link thư mục Drive.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.folderUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={data.folderUrl} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  Mở Drive
                </a>
              </Button>
            )}
            {data.folderUrl && data.folderEmbedUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                aria-expanded={showEmbed}
                onClick={() => setShowEmbed((v) => !v)}
              >
                {showEmbed ? <X /> : <Images />}
                {showEmbed ? 'Đóng' : 'Xem trong app'}
              </Button>
            )}
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => setFolderOpen(true)}>
                {data.folderUrl ? 'Đổi link' : 'Gắn link'}
              </Button>
            )}
          </div>
        </div>
        {showEmbed && data.folderEmbedUrl && (
          <iframe
            title="Thư mục Google Drive"
            src={data.folderEmbedUrl}
            className="hidden h-[60svh] max-h-[480px] w-full rounded-item border border-border bg-card sm:block"
          />
        )}
      </section>

      <AddPhotosDialog
        open={addOpen}
        days={days}
        pending={addPhotos.isPending}
        onOpenChange={setAddOpen}
        onSubmit={submitPhotos}
      />
      <FolderDialog
        open={folderOpen}
        current={data.folderUrl}
        pending={setFolder.isPending}
        onOpenChange={setFolderOpen}
        onSubmit={(url) =>
          setFolder.mutate(url, {
            onSuccess: () => {
              setFolderOpen(false)
              toast.success(url ? 'Đã gắn thư mục Drive' : 'Đã gỡ link thư mục')
            },
            onError,
          })
        }
      />
      <PhotoEditDialog
        photo={editing}
        days={days}
        pending={updatePhoto.isPending}
        onOpenChange={(open) => !open && setEditing(null)}
        onSubmit={(body) =>
          editing && updatePhoto.mutate({ photoId: editing.id, body }, { onSuccess: () => setEditing(null), onError })
        }
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Xóa ảnh khỏi album?"
        description="Chỉ xóa khỏi album trong app, file trên Google Drive vẫn giữ nguyên."
        confirmLabel="Xóa"
        destructive
        pending={deletePhoto.isPending}
        onConfirm={() => toDelete && deletePhoto.mutate(toDelete.id, { onSuccess: () => setToDelete(null), onError })}
      />
    </div>
  )
}

/** memo: poll 15s trả cùng object (structural sharing) nên các ô không render lại (P3-AL-04). */
const PhotoTile = memo(function PhotoTile({
  photo,
  index,
  onEdit,
  onDelete,
}: {
  photo: AlbumPhotoResponse
  index: number
  onEdit: (photo: AlbumPhotoResponse) => void
  onDelete: (photo: AlbumPhotoResponse) => void
}) {
  const [broken, setBroken] = useState(false)
  const name = `Ảnh ${index}${photo.dayIndex ? ` · Ngày ${photo.dayIndex}` : ''}${photo.caption ? `: ${photo.caption}` : ''}`
  const hasOverlay = Boolean(photo.dayIndex || photo.caption)
  return (
    <li className="relative overflow-hidden rounded-surface border border-border bg-muted">
      <a href={photo.viewUrl} target="_blank" rel="noreferrer" className="block aspect-square">
        {broken ? (
          <span className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center text-xs text-muted-foreground">
            <ImageOff className="size-6" aria-hidden="true" />
            <span className="sr-only">{name}. </span>
            Không xem trước được, bấm để mở trên Drive
          </span>
        ) : (
          <img
            src={photo.thumbnailUrl}
            alt={name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="size-full object-cover transition-[filter] duration-150 motion-safe:[@media(hover:hover)]:hover:brightness-95"
            onError={() => setBroken(true)}
          />
        )}
      </a>
      {hasOverlay && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-3 text-white">
          {photo.dayIndex && <p className="text-xs font-bold text-white/90">Ngày {photo.dayIndex}</p>}
          {photo.caption && <p className="line-clamp-2 text-xs font-semibold">{photo.caption}</p>}
        </div>
      )}
      {photo.canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-1.5 right-1.5 rounded-full bg-card/95 text-foreground shadow-flat hover:bg-card"
              aria-label={`Tùy chọn cho ảnh ${index}`}
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(photo)}>
              <Pencil />
              Sửa chú thích / ngày
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(photo)}>
              <Trash2 />
              Xóa khỏi album
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  )
})

function DaySelect({
  id,
  value,
  days,
  onChange,
}: {
  id: string
  value: string
  days: ItineraryDayResponse[]
  onChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_DAY}>Không gắn ngày</SelectItem>
        {days.map((d) => (
          <SelectItem key={d.id} value={String(d.id)}>
            {dayLabel(d)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function AddPhotosDialog({
  open,
  days,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  days: ItineraryDayResponse[]
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (body: AddPhotosRequest) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <AddPhotosForm days={days} pending={pending} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function AddPhotosForm({
  days,
  pending,
  onSubmit,
  onCancel,
}: {
  days: ItineraryDayResponse[]
  pending: boolean
  onSubmit: (body: AddPhotosRequest) => void
  onCancel: () => void
}) {
  const [links, setLinks] = useState('')
  const [dayId, setDayId] = useState(NO_DAY)
  const [caption, setCaption] = useState('')
  const [error, setError] = useState<string>()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const list = links
      .split(/[\s,]+/)
      .map((l) => l.trim())
      .filter(Boolean)
    if (list.length === 0) {
      setError('Dán ít nhất một link ảnh Drive')
      return
    }
    setError(undefined)
    onSubmit({
      links: list.slice(0, 50),
      dayId: dayId === NO_DAY ? null : Number(dayId),
      caption: caption.trim() || null,
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>Thêm ảnh</DialogTitle>
        <DialogDescription>
          Dán link ảnh/video Drive (đã chia sẻ "Bất kỳ ai có đường liên kết"), mỗi dòng một link, tối đa 50.
        </DialogDescription>
      </DialogHeader>
      <FormField id="album-links" label="Link ảnh Drive" error={error}>
        <Textarea
          id="album-links"
          autoFocus
          rows={4}
          placeholder="https://drive.google.com/file/d/…/view"
          value={links}
          onChange={(e) => setLinks(e.target.value)}
        />
      </FormField>
      <FormField id="album-day" label="Gắn với ngày" optional>
        <DaySelect id="album-day" value={dayId} days={days} onChange={setDayId} />
      </FormField>
      <FormField id="album-caption" label="Chú thích" optional>
        <Input id="album-caption" maxLength={300} value={caption} onChange={(e) => setCaption(e.target.value)} />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Đang thêm…' : 'Thêm ảnh'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function FolderDialog({
  open,
  current,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  current: string | null
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (url: string | null) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <FolderForm current={current} pending={pending} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  )
}

function FolderForm({
  current,
  pending,
  onSubmit,
}: {
  current: string | null
  pending: boolean
  onSubmit: (url: string | null) => void
}) {
  const [url, setUrl] = useState(current ?? '')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(url.trim() || null)
      }}
      className="grid gap-4"
    >
      <DialogHeader>
        <DialogTitle>Link thư mục Google Drive</DialogTitle>
        <DialogDescription>Dạng drive.google.com/drive/folders/…</DialogDescription>
      </DialogHeader>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Tạo một thư mục trên Google Drive cho chuyến đi.</li>
        <li>
          Chia sẻ → <b>Bất kỳ ai có đường liên kết</b> (Người chỉnh sửa để mọi người cùng tải lên).
        </li>
        <li>Dán link thư mục vào ô dưới.</li>
      </ol>
      <FormField id="album-folder" label="Link thư mục">
        <Input
          id="album-folder"
          autoFocus
          inputMode="url"
          placeholder="https://drive.google.com/drive/folders/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </FormField>
      <DialogFooter>
        {current && (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            disabled={pending}
            onClick={() => onSubmit(null)}
          >
            Gỡ link
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? 'Đang lưu…' : 'Lưu'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function PhotoEditDialog({
  photo,
  days,
  pending,
  onOpenChange,
  onSubmit,
}: {
  photo: AlbumPhotoResponse | null
  days: ItineraryDayResponse[]
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (body: { caption: string | null; dayId: number | null }) => void
}) {
  return (
    <Dialog open={photo !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {photo && <PhotoEditForm key={photo.id} photo={photo} days={days} pending={pending} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  )
}

function PhotoEditForm({
  photo,
  days,
  pending,
  onSubmit,
}: {
  photo: AlbumPhotoResponse
  days: ItineraryDayResponse[]
  pending: boolean
  onSubmit: (body: { caption: string | null; dayId: number | null }) => void
}) {
  const [caption, setCaption] = useState(photo.caption ?? '')
  const [dayId, setDayId] = useState(photo.dayId ? String(photo.dayId) : NO_DAY)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ caption: caption.trim() || null, dayId: dayId === NO_DAY ? null : Number(dayId) })
      }}
      className="grid gap-4"
    >
      <DialogHeader>
        <DialogTitle>Sửa ảnh</DialogTitle>
      </DialogHeader>
      <FormField id="photo-caption" label="Chú thích" optional>
        <Input id="photo-caption" maxLength={300} value={caption} onChange={(e) => setCaption(e.target.value)} />
      </FormField>
      <FormField id="photo-day" label="Ngày" optional>
        <DaySelect id="photo-day" value={dayId} days={days} onChange={setDayId} />
      </FormField>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? 'Đang lưu…' : 'Lưu'}
        </Button>
      </DialogFooter>
    </form>
  )
}
