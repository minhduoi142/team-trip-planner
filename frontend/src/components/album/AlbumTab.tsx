import { ExternalLink, FolderOpen, ImageOff, Images, MoreVertical, Pencil, RotateCw, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
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
import { cn } from '@/lib/utils'
import type { AlbumPhotoResponse } from '@/types/album'
import type { ItineraryDayResponse } from '@/types/itinerary'

const NO_DAY = 'none'

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
  const [links, setLinks] = useState('')
  const [dayId, setDayId] = useState(NO_DAY)
  const [caption, setCaption] = useState('')
  const [filter, setFilter] = useState<number | 'all'>('all')
  const [editing, setEditing] = useState<AlbumPhotoResponse | null>(null)
  const [toDelete, setToDelete] = useState<AlbumPhotoResponse | null>(null)

  if (album.isPending) return <Skeleton className="h-64 rounded-3xl" />
  if (album.isError) {
    return (
      <div className="rounded-3xl border border-dashed p-8 text-center">
        <p className="text-muted-foreground">{getErrorMessage(album.error)}</p>
        <Button variant="outline" className="mt-4" onClick={() => album.refetch()}>
          <RotateCw />
          Thử lại
        </Button>
      </div>
    )
  }

  const data = album.data
  const days = (itinerary.data?.days ?? []).filter((d) => !d.overflow)
  const onError = (e: unknown) => toast.error(getErrorMessage(e))
  const photos = filter === 'all' ? data.photos : data.photos.filter((p) => p.dayId === filter)

  const submitLinks = (event: FormEvent) => {
    event.preventDefault()
    const list = links
      .split(/[\s,]+/)
      .map((l) => l.trim())
      .filter(Boolean)
    if (list.length === 0) return
    addPhotos.mutate(
      { links: list.slice(0, 50), dayId: dayId === NO_DAY ? null : Number(dayId), caption: caption.trim() || null },
      {
        onSuccess: (res) => {
          setLinks('')
          setCaption('')
          const invalid = res.skipped.filter((s) => s.reason === 'INVALID').length
          const dup = res.skipped.filter((s) => s.reason === 'DUPLICATE').length
          const notes = [invalid && `${invalid} link không phải file Drive`, dup && `${dup} link đã có`].filter(Boolean)
          if (res.added > 0) toast.success(`Đã thêm ${res.added} ảnh${notes.length ? ` · bỏ qua ${notes.join(', ')}` : ''}`)
          else toast.error(`Chưa thêm được ảnh nào${notes.length ? `: ${notes.join(', ')}` : ''}`)
        },
        onError,
      },
    )
  }

  return (
    <div className="grid gap-4">
      {/* Thư mục Drive chung */}
      <Card className="bg-gradient-to-br from-sky-50 to-violet-50">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="size-5 text-sky-600" />
              Thư mục Google Drive chung
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Ảnh/video gốc chất lượng cao để ở đây, cả nhóm cùng tải lên.
            </p>
          </div>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setFolderOpen(true)}>
              {data.folderUrl ? 'Đổi link' : 'Gắn link'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-3">
          {data.folderUrl ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <a href={data.folderUrl} target="_blank" rel="noreferrer">
                    <ExternalLink />
                    Mở trên Google Drive
                  </a>
                </Button>
                {data.folderEmbedUrl && (
                  <Button variant="outline" onClick={() => setShowEmbed((v) => !v)}>
                    {showEmbed ? <X /> : <Images />}
                    {showEmbed ? 'Đóng' : 'Xem trong app'}
                  </Button>
                )}
              </div>
              {showEmbed && data.folderEmbedUrl && (
                <iframe
                  title="Thư mục Google Drive"
                  src={data.folderEmbedUrl}
                  className="h-[480px] w-full rounded-2xl bg-white ring-1 ring-border"
                />
              )}
            </>
          ) : (
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Tạo 1 thư mục trên Google Drive cho chuyến đi.</li>
              <li>
                Chia sẻ → <b>Bất kỳ ai có đường liên kết</b> (Người xem hoặc Người chỉnh sửa để mọi người cùng tải lên).
              </li>
              <li>{canEdit ? 'Bấm "Gắn link" và dán link thư mục.' : 'Nhờ trưởng nhóm gắn link thư mục vào đây.'}</li>
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Thêm ảnh nổi bật */}
      <Card>
        <CardHeader>
          <CardTitle>Ảnh nổi bật</CardTitle>
          <p className="text-sm text-muted-foreground">
            Dán link ảnh/video Drive (đã chia sẻ "Bất kỳ ai có đường liên kết"), mỗi dòng 1 link.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitLinks} className="grid gap-2">
            <Textarea
              rows={3}
              placeholder="https://drive.google.com/file/d/…/view"
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              aria-label="Link ảnh Drive"
            />
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Select value={dayId} onValueChange={setDayId}>
                <SelectTrigger aria-label="Gắn với ngày" className="w-full">
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
              <Input
                placeholder="Chú thích (tùy chọn)"
                maxLength={300}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
              <Button type="submit" disabled={!links.trim() || addPhotos.isPending}>
                Thêm
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lọc theo ngày */}
      {data.photos.length > 0 && days.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="radiogroup" aria-label="Lọc theo ngày">
          {[{ id: 'all' as const, label: 'Tất cả' }, ...days.map((d) => ({ id: d.id, label: `Ngày ${d.dayIndex}` }))].map(
            (f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-sm ring-1 ring-border',
                  filter === f.id ? 'bg-foreground text-background' : 'bg-card',
                )}
              >
                {f.label}
              </button>
            ),
          )}
        </div>
      )}

      {/* Lưới ảnh */}
      {photos.length === 0 ? (
        <p className="rounded-2xl bg-muted/50 px-4 py-10 text-center text-sm text-muted-foreground">
          {data.photos.length === 0 ? 'Chưa có ảnh nào. Dán link ảnh Drive đẹp nhất của chuyến vào nhé 📸' : 'Ngày này chưa có ảnh.'}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {photos.map((p) => (
            <PhotoTile key={p.id} photo={p} onEdit={() => setEditing(p)} onDelete={() => setToDelete(p)} />
          ))}
        </ul>
      )}

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
          editing &&
          updatePhoto.mutate({ photoId: editing.id, body }, { onSuccess: () => setEditing(null), onError })
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

function PhotoTile({ photo, onEdit, onDelete }: { photo: AlbumPhotoResponse; onEdit: () => void; onDelete: () => void }) {
  const [broken, setBroken] = useState(false)
  return (
    <li className="group relative overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
      <a href={photo.viewUrl} target="_blank" rel="noreferrer" className="block aspect-square">
        {broken ? (
          <span className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center text-xs text-muted-foreground">
            <ImageOff className="size-6" />
            Không xem trước được, bấm để mở trên Drive
          </span>
        ) : (
          <img
            src={photo.thumbnailUrl}
            alt={photo.caption ?? 'Ảnh trong album'}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="size-full object-cover transition group-hover:scale-105"
            onError={() => setBroken(true)}
          />
        )}
      </a>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-white">
        {photo.dayIndex && <p className="text-[11px] opacity-90">Ngày {photo.dayIndex}</p>}
        {photo.caption && <p className="line-clamp-2 text-xs font-medium">{photo.caption}</p>}
      </div>
      {photo.canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon-xs"
              className="absolute top-1.5 right-1.5 bg-white/80"
              aria-label="Tùy chọn ảnh"
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil />
              Sửa chú thích / ngày
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 />
              Xóa khỏi album
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
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
        <DialogDescription>Dạng drive.google.com/drive/folders/… và đã bật "Bất kỳ ai có đường liên kết".</DialogDescription>
      </DialogHeader>
      <Input
        autoFocus
        inputMode="url"
        placeholder="https://drive.google.com/drive/folders/…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <DialogFooter>
        {current && (
          <Button type="button" variant="ghost" disabled={pending} onClick={() => onSubmit(null)}>
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
      <div className="grid gap-1.5">
        <Label htmlFor="photo-caption">Chú thích</Label>
        <Input id="photo-caption" maxLength={300} value={caption} onChange={(e) => setCaption(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="photo-day">Ngày</Label>
        <Select value={dayId} onValueChange={setDayId}>
          <SelectTrigger id="photo-day" className="w-full">
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
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? 'Đang lưu…' : 'Lưu'}
        </Button>
      </DialogFooter>
    </form>
  )
}
