# UI "AI slop" Audit: Team Trip Planner (frontend)

**Ngày audit:** 26/11/2026
**Phạm vi:** toàn bộ `frontend/src/` (khoảng 15.000 dòng TSX/TS/CSS: `index.css`, `components/ui/*`, `components/**`, `pages/*`)
**Phương pháp:**
- Đọc code từng file.
- Dùng grep để đếm các mẫu lặp lại.
- Tính tương phản WCAG từ token OKLCH trong `index.css`.
- Chạy thử hàm `cn` bằng node.

Audit **chưa mở trên trình duyệt**. Mục nào ghi *(cần kiểm trên trình duyệt)* là suy luận từ code. Hãy kiểm ở 360px trước khi sửa.

**Trạng thái:** chỉ liệt kê, **chưa sửa gì**. Đánh dấu `- [x]` khi xong.

Mọi đường dẫn bên dưới tính từ `frontend/src/`. Ví dụ `components/ui/button.tsx:7` là `frontend/src/components/ui/button.tsx`, dòng 7.

> **Số dòng ứng với commit `5464094`, tức trước khi chạy Prettier (P0-00).** Sau khi format, số dòng đã lệch. Hãy tìm theo đoạn `Code:` trích trong từng mục, hoặc xem bản gốc bằng `git show 5464094:frontend/src/<file>`.

---

## 0. Đọc trước khi sửa

### 0.1 Ràng buộc đã chốt với chủ dự án
- **Giữ nền video** (`TripBackground`). Video luôn chạy, cố ý bỏ qua `prefers-reduced-motion`. Chỉ hiện poster khi bật Save-Data.
- **Giữ hình trang trí bay** (`FloatingBackground`). Được phép giảm bớt (độ mờ, số lượng, ẩn trên mobile), nhưng không xóa.
- Phong cách **Tactile Clay & Pill UI** đã được duyệt ở `docs/sdd-ui-phase-0.md` đến `sdd-ui-phase-5.md`. Audit này **không đề xuất bỏ Clay**. Mục tiêu là dùng Clay có phân cấp: chỉ chỗ quan trọng mới nổi khối.
- Mục có nhãn **`[Đổi SDD UI-N]`** đi ngược một quyết định đã ghi trong `docs/sdd-ui-phase-N.md`. Ví dụ: BrushBar nhấp nhô, TripCard nhấc 8px, `rounded-[32px]` cho Dialog. Những mục này **phải được chủ dự án duyệt** trước khi sửa. Sau khi sửa, cập nhật lại SDD đó.

### 0.2 Năm tiêu chí

| Mã | Tiêu chí | Dấu hiệu "AI slop" điển hình |
|---|---|---|
| **T1** | Màu sắc / Hiệu ứng | Palette Tailwind viết cứng thay vì token. Gradient, glow, kính mờ dùng để trang trí. Bóng chồng nhiều lớp. Chữ thiếu tương phản trên nền trong mờ. |
| **T2** | Bố cục / Phân cấp | Mọi thứ to như nhau. Card lồng card. Giá trị tùy ý (`rounded-[28px]`, `text-[11px]`). Section landing theo khuôn template. Nội dung chính bị đẩy xuống. |
| **T3** | Icon / Animation | Emoji dùng làm icon. Icon trang trí ở khắp nơi. `hover:scale` trên phần tử không bấm được. Animation vô hạn cạnh nội dung. Entrance animation chạy lại mỗi lần render. |
| **T4** | Trạng thái thực tế / Dữ liệu biên | Chỉ thiết kế cho dữ liệu đẹp. Thiếu loading, empty, error. Tên dài tràn khung. Danh sách 15–200 phần tử. Copy bịa hoặc sai sự thật. |
| **T5** | Responsive / Tương tác | Vùng chạm dưới 44px. Tràn ngang ở 360px. Control tự chế thiếu bàn phím hoặc ARIA. Lỗi chỉ báo bằng toast. |

**Mức độ:**
- **Cao:** hỏng chức năng, sai dữ liệu hoặc tiền, không dùng được trên mobile, hoặc không đạt WCAG AA ở thành phần chính.
- **Trung bình:** ảnh hưởng rõ đến trải nghiệm hoặc độ tin cậy.
- **Thấp:** lỗi thẩm mỹ hoặc tính nhất quán.

### 0.3 Số liệu nền (đo lại sau mỗi phase)

| Chỉ số | Hiện tại | Mục tiêu | Lệnh đo (chạy trong `frontend/src`) |
|---|---|---|---|
| Palette Tailwind viết cứng `(bg\|text\|border\|from\|via\|to\|ring)-(rose\|amber\|emerald\|…)-N` | khoảng 290 (42 file) | chỉ còn trong `index.css` và file token | `grep -rEo "(text\|bg\|border\|from\|to\|via\|ring)-(rose\|pink\|violet\|purple\|sky\|amber\|orange\|emerald\|teal\|cyan\|indigo\|fuchsia\|slate\|lime\|green\|red\|yellow\|blue\|zinc)-[0-9]" --include=*.tsx . \| wc -l` |
| `rounded-[Npx]` | 78 | 0 | `grep -rEo "rounded-(t-\|b-)?\[[^]]+\]" --include=*.tsx . \| wc -l` |
| `text-[10px]` / `text-[11px]` | 28 | 0 | `grep -rEo "text-\[[0-9]+px\]" --include=*.tsx . \| wc -l` |
| `shadow-clay-*` | 319 (card 115, badge 92, btn-primary 37) | nhỏ hơn 120, có phân cấp | `grep -rEo "shadow-clay-[a-z-]+" --include=*.tsx . \| sort \| uniq -c` |
| `backdrop-blur` | 35 (17 file) | 3 hoặc ít hơn (header, overlay) | `grep -rEo "backdrop-blur" --include=*.tsx . \| wc -l` |
| Gradient `bg-gradient-to` / `from-` | khoảng 90 | chỉ ảnh bìa preset và lớp phủ ảnh | `grep -rEo "bg-gradient-to\|from-" --include=*.tsx . \| wc -l` |
| `hover:scale` / `active:scale` / `hover:-translate` | 87 | chỉ phần tử bấm được, có `motion-safe:` | `grep -rEo "hover:scale\|active:scale\|hover:-translate" --include=*.tsx . \| wc -l` |
| Emoji trong UI | khoảng 55 dòng / 28 file | 0 trong heading, nút và trạng thái | (grep theo dải Unicode emoji) |
| Nút `size="xs\|sm\|icon-xs\|icon-sm"` | 65 (26 file) | 0 nút không có vùng chạm mở rộng | `grep -rEo 'size="(icon-xs\|xs\|icon-sm\|sm)"' --include=*.tsx . \| wc -l` |
| `aria-describedby` | 0 | mọi FormField có lỗi hoặc gợi ý | `grep -rn "aria-describedby" --include=*.tsx . \| wc -l` |
| Class `dark:` (dark mode không bao giờ bật) | 25 | 0, hoặc làm dark mode thật | `grep -rEo "dark:" --include=*.tsx . \| wc -l` |

### 0.4 Việc nên làm trước tiên (lỗi chức năng phát hiện khi audit)
Các lỗi dưới đây hỏng chức năng thật chứ không chỉ là thẩm mỹ. Nên sửa ngay, không cần chờ tới phase:
1. **P3-CP-01:** Gợi ý "Trả" / "Đã nhận" vẫn hiện khi đã có lần chuyển PENDING, nên khoản tiền có thể bị tính hai lần. Đã đối chiếu backend: `ExpenseSummaryBuilder` chỉ tính CONFIRMED.
2. **P0-09 / P3-LT-01:** `.stagger-list` (`fill-mode: both` có transform) ghi đè transform của dnd-kit. Khi kéo thả trong lịch trình, các thẻ khác không dạt chỗ.
3. **P2-01:** `overflow-x-hidden` trên wrapper làm header `sticky` không dính *(cần kiểm trên trình duyệt)*.
4. **P1-07:** `DialogContent` thiếu `max-w-[calc(100%-2rem)]`, nên dialog dính sát mép màn hình 360px.
5. **P1-30:** Nút Google rộng cố định 320px, tràn khỏi Card ở 360px.
6. **P0-02 / P0-03:** Chữ trắng trên nền `--primary` chỉ đạt 3,28:1, vòng focus chỉ đạt 1,33:1. Cả hai không đạt WCAG AA.

### 0.5 Thứ tự đề xuất
**P0-00 (Prettier)** → Phase 0 (token, CSS gốc) → Phase 1 (primitive và component dùng chung, kể cả các component mới cần tạo) → Phase 2 (khung) → Phase 3 (từng màn hình).

Phase 3 chủ yếu là thay class cũ bằng token và component mới của Phase 0–1. Làm ngược thứ tự sẽ phải sửa hai lần.

---

## Phase 0: Theme, CSS gốc & Design Tokens

File chính: `index.css`, `index.html`, `lib/utils.ts`, `components/ui/sonner.tsx`.

- [x] **P0-00 · [T2] Format lại code trước khi refactor UI** · Thấp
  - Ở đâu: thụt lề vỡ trong `DashboardPage.tsx:43-121`, `JoinPage.tsx:87-148`, `TripDetailPage.tsx:184-316`, `TripCard.tsx:22-76`, `InviteShare.tsx:58-135`, `ItineraryTab.tsx:98-170`, `AvailabilityTab.tsx:35-146`, `PollsTab.tsx:127-338`, `MemberList.tsx:120-218`, `ExpensesTab.tsx`, `ChecklistTab.tsx`, `RoomsTab.tsx`, `AlbumTab.tsx`, `DressCodeDialog.tsx:128-216`. Ngoài ra có comment kiểu marketing ("Tactile Clay Pebbles", "Floating Pill Dock").
  - Vì sao là slop: dấu hiệu code sinh ra rồi dán chồng. Diff của các phase sau sẽ không review được.
  - Sửa: thêm Prettier (cùng `prettier-plugin-tailwindcss` để sắp class) và chạy `prettier --write src` trong **một commit riêng** không đổi logic.

- [x] **P0-01 · [T1] Không có token màu ngữ nghĩa nên khoảng 290 chỗ viết cứng palette** · Cao
  - Ở đâu: `index.css:66-112` chỉ có bộ token shadcn (primary, accent, muted, destructive). Hệ quả: rose ×140, amber ×77, emerald ×59, violet ×26, sky ×23 rải ở 42 file. Nhiều nhất: `LandingPage.tsx` (49), `ExpensesTab.tsx`, `WeatherIcon.tsx`, `ItineraryTab.tsx`, `UserAvatar.tsx`.
  - Vì sao là slop: mỗi màn hình tự chọn màu cho cùng một nghĩa. "Nợ tiền", "Bận" và "lỗi" đều là rose, trùng hue với primary coral (hue 12). Dark mode hay đổi theme sẽ không theo được.
  - Sửa: thêm vào `:root` (và `@theme inline` để có class `bg-success`…), mỗi token gồm cặp nền nhạt `-soft` và chữ `-fg` đã kiểm tương phản ≥ 4,5:1:
    - `--success`, `--warning`, `--info` (cảnh báo, gợi ý, thời tiết)
    - `--money-in`, `--money-out` (tách khỏi hue của primary)
    - `--status-planning/upcoming/ongoing/completed` (StatusBadge, CountdownLabel)
    - `--avail-yes/maybe/no/none` (lịch rảnh; "Bận" dùng hue trung tính hoặc slate, không dùng rose)
    - `--avatar-1..8` (UserAvatar fallback)
    - Dùng lại `--chart-1..5` cho thanh tỷ lệ chi tiêu (hiện chưa dùng ở đâu)

- [x] **P0-02 · [T1] Chữ trên nút primary chỉ đạt 3,28:1, chữ `text-primary` trên nền chỉ đạt 3,23:1** · Cao
  - Ở đâu: `index.css:74-75` `--primary: oklch(0.66 0.17 12)`, `--primary-foreground: oklch(0.99 0.005 350)`.
  - Vì sao là slop: chọn màu pastel cho đẹp mà không kiểm tương phản. Nút `text-sm font-semibold` cần 4,5:1 (WCAG 1.4.3).
  - Sửa: hạ `--primary` xuống khoảng `oklch(0.58 0.17 12)` (tính được 4,54:1 với chữ, 4,47:1 trên nền) hoặc `0.56` (4,94:1). Nếu muốn giữ coral sáng cho mảng màu, tách thêm `--primary-strong` dùng cho chữ và nút có chữ. Bóng `--clay-btn-primary` pha từ `--primary` nên sẽ tự đổi theo.

- [x] **P0-03 · [T5] Vòng focus gần như vô hình (1,33:1)** · Cao
  - Ở đâu: `index.css:85` `--ring: oklch(0.78 0.11 12)`; `index.css:640` `@apply border-border outline-ring/50`. Các primitive dùng `focus-visible:ring-ring/50`.
  - Vì sao là slop: chỉ báo focus cần ≥ 3:1 (WCAG 1.4.11, 2.4.7). `--ring` trên nền đạt 2,01:1, pha thêm 50% thì còn 1,33:1, nên người dùng bàn phím không biết mình đang ở đâu.
  - Sửa: `--ring: oklch(0.55 0.15 12)` (khoảng 5:1) và bỏ `/50` ở ring focus. Cách khác: dùng `outline-2 outline-offset-2 outline-ring` cho mọi control tự chế.

- [x] **P0-04 · [T1] Dark mode là code chết, riêng toast lại theo theme hệ điều hành** · Trung bình
  - Ở đâu: `index.css:9` `@custom-variant dark`, `index.css:114-158` (khối `.dark` là bộ neutral mặc định của shadcn: primary xám `0.922 0 0`, sidebar-primary xanh 264). Không có `ThemeProvider` và không chỗ nào gắn class `.dark`, nhưng có 25 class `dark:` trong 12 file. `components/ui/sonner.tsx:6-10` gọi `useTheme()` nên luôn là `"system"`. `index.html:7` dùng `theme-color #fb7185` (rose-400), không phải primary.
  - Vì sao là slop: giữ nguyên template mà không quyết định gì. Người dùng bật dark mode ở hệ điều hành sẽ thấy toast tối trên nền app màu kem.
  - Sửa (khuyến nghị **light-only** cho MVP):
    - Thêm `:root { color-scheme: light }`.
    - `Toaster theme="light"`, bỏ `useTheme`.
    - Xóa khối `.dark` và các class `dark:`.
    - Đổi `theme-color` thành giá trị hex của `--primary` mới.
    - Nếu muốn làm dark mode, đó là một phase riêng: thiết kế đủ token, bóng và lớp phủ video.

- [x] **P0-05 · [T1/T2] Hệ thống bóng Clay: 10 token đều nhiều lớp, màu rgba viết cứng, `cn` không gộp được** · Cao
  - Ở đâu: `index.css:101-111` (mỗi token có 3–4 lớp, tint `rgba(220,175,185,…)` cố định). Có 319 chỗ dùng. `lib/utils.ts` dùng package `cn`: đã chạy `cn('shadow-sm','shadow-clay-badge')` và kết quả **giữ cả hai class**, nên `className="shadow-none"` không tắt được bóng Clay.
  - Vì sao là slop: badge, checkbox, avatar, dòng trong card, chip và nút đều có bóng phồng. Khi mọi thứ đều nổi thì không còn gì nổi. Tint không lấy từ `--primary`, nên đổi màu chủ đạo thì bóng vẫn hồng.
  - Sửa: gom về thang **elevation theo vai trò**, vẫn giữ chất Clay:

    | Token mới | Dùng cho |
    |---|---|
    | `clay-flat` (0 hoặc 1 lớp rất nhẹ) | badge, chip, avatar, dòng trong list |
    | `clay-raised` | card bề mặt chính |
    | `clay-cta` | **chỉ** nút default và destructive |
    | `clay-cta-destructive` | pha từ `--destructive` |
    | `clay-overlay` | dialog, popover, dock |
    | `clay-sunken` | input |
    | `clay-pressed` | trạng thái bấm |

    - Tint viết bằng `color-mix(in oklch, var(--primary) X%, transparent)`.
    - Quy tắc: **không trộn** `shadow-sm/md/xs` với `shadow-clay-*`.
    - Kiểm xem package `cn` có cấu hình được nhóm class shadow không. Nếu không, chuyển về `clsx` + `tailwind-merge` (`extendTailwindMerge` thêm nhóm `shadow-clay-*`).
    - `[Đổi SDD UI-0]`: §2.1 và §3 quy định bóng clay cho mọi atom.

- [x] **P0-06 · [T2] Thang bo góc có nhưng không ai dùng: 78 giá trị `rounded-[Npx]`** · Trung bình
  - Ở đâu: `index.css:45-51` (`--radius: 1rem`; 2xl = 28,8px, 3xl = 35,2px). Mã nguồn có `rounded-[28px]` ×32, `[32px]` ×16, `[24px]` ×14, `[22px]` ×5, `[20px]` ×5, `rounded-t-[22px]`, `rounded-b-[22px]`, `rounded-t-[26px]`.
  - Vì sao là slop: năm bán kính "gần giống nhau" cho cùng một loại bề mặt, mỗi nơi đoán một số.
  - Sửa: định nghĩa radius theo vai trò:
    - `--radius-control` (full) cho nút, input, chip
    - `--radius-item` (xl) cho option, menu item, dòng
    - `--radius-surface` (2xl) cho card
    - `--radius-overlay` (3xl) cho dialog, alert, sheet

    Thay hết `rounded-[…]`. Không bo riêng ảnh hay header bên trong card có `overflow-hidden`. Thêm rule lint hoặc grep vào CI để chặn `rounded-\[`. `[Đổi SDD UI-0, UI-1]`: Dialog `rounded-[32px]`, TripCard `rounded-[28px]`, `rounded-t-[26px]`.

- [x] **P0-07 · [T2] Không có thang chữ: 28 chỗ `text-[10px]` / `text-[11px]`** · Thấp
  - Ở đâu: `index.css:11-13` chỉ có font. `--font-heading` trùng `--font-sans`. Danh sách chữ siêu nhỏ có ở P3 (ExpensesTab, AvailabilityGrid, DayPills, DayWeatherCard, PlacePicker, InviteShare, AlbumTab, LandingPage…).
  - Vì sao là slop: 10–11px màu muted trên nền trong mờ không đọc được trên điện thoại.
  - Sửa: tối thiểu 12px (`text-xs`) cho nội dung đọc. Nếu thật cần nhỏ hơn thì thêm **một** token `--text-2xs: 0.6875rem` có line-height 1.4 và chỉ dùng cho nhãn phụ không quan trọng. Cấm `text-[Npx]`.

- [x] **P0-08 · [T3] Easing "lò xo" viết cứng, `transition-all` tràn lan** · Thấp
  - Ở đâu: `components/ui/button.tsx:7`, `components/TripCard.tsx:20` dùng `ease-[cubic-bezier(0.34,1.56,0.64,1)]`. `transition-all` có ở hầu hết primitive.
  - Sửa: thêm token `--ease-out-soft`, `--ease-press`, `--duration-fast: 150ms`, `--duration-base: 200ms`. Dùng `transition-[transform,box-shadow,background-color]` thay cho `transition-all`.

- [x] **P0-09 · [T3] `.animate-cascade` / `.stagger-list`: nội dung ẩn tới khoảng 1–2,5s, phá kéo thả, chạy lại mỗi lần đổi tab** · Cao
  - Ở đâu: `index.css:419-435` (`detail-unfold` có `filter: blur(6px)` + `translateY` + `scale`), `index.css:576-600` (delay tới 0,90s và 0,98s, `both`). Được dùng ở 12 chỗ `animate-cascade` và 7 chỗ `stagger-list`, trong 9 file.
  - Vì sao là slop:
    - (1) Radix unmount tab không active, nên mỗi lần đổi tab hoặc đổi `key` là toàn bộ nội dung "bay vào" lại, dù dữ liệu đã có trong cache.
    - (2) Lồng cascade với stagger làm trễ cộng dồn: tab Chi phí cần khoảng 2,5s mới hiện hết.
    - (3) `fill-mode: both` + `transform` ghi đè inline `transform` (animation thắng inline style), nên dnd-kit trong `ItineraryTab` hỏng (xem P3-LT-01).
    - (4) Animate `filter: blur` trên hàng chục phần tử, trong khi nền video đang phát.
  - Sửa CSS gốc (trước khi gỡ từng chỗ ở P3):
    - Đổi sang `animation-fill-mode: backwards` (không giữ transform sau khi chạy xong).
    - Bỏ `filter: blur`.
    - `duration` ≤ 200ms; delay `min(n, 4) × 40ms`, từ phần tử thứ 5 trở đi delay 0.
    - Chỉ áp cho lần mount đầu của trang, không áp cho tab.

- [x] **P0-10 · [T3] Khối `prefers-reduced-motion` thiếu nhiều thứ, cuộn mượt không có điều kiện** · Trung bình
  - Ở đâu: `index.css:608-636` thiếu `animate-campfire-flicker`, `animate-star-twinkle`, `animate-heart-float` (đang dùng trong `FloatingBackground`), `animate-camper-bounce`, `animate-spark-*`, `animate-exhaust-puff`, cùng `animate-pulse` và `animate-bounce` của Tailwind. Mọi `hover:`/`active:` translate, scale và transition cũng chưa được tắt. `index.css:648-651` bật `scroll-behavior: smooth` hai lần, không có điều kiện.
  - Sửa: thay danh sách liệt kê bằng rule chung:
    ```css
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: .01ms !important; animation-iteration-count: 1 !important;
        transition-duration: .01ms !important; scroll-behavior: auto !important;
      }
    }
    @media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth } }
    ```
    Video `<video>` không bị ảnh hưởng vì không phải CSS animation, nên ràng buộc "video luôn chạy" vẫn giữ. Vòng rAF của `FloatingBackground` phải tự kiểm `matchMedia` (P1-19).

- [x] **P0-11 · [T3] Khoảng 20/30 keyframe không còn ai dùng, có keyframe trùng nhau** · Thấp
  - Ở đâu: `index.css:161-480`. Không dùng: `mesh-blob-1..4`, `cloud-drift-left` (và `cloud-drift-2/3`), `camper-van-bounce`, `spark-rise`, `exhaust-puff`, `balloon-sway`, `plane-glide`, `sun-spin` (trùng `spin-slow`, cũng không dùng), `wave-sway`, `bubble-drift`, `float-medium`, `float-reverse`, `drift-sway`, `float-gentle-1..4`.
  - Sửa: xóa để `index.css` còn khoảng 250 dòng. Giữ `float-slow`, `pulse-gentle`, `cloud-drift-right`, `campfire-flicker`, `star-twinkle`, `heart-float`, `tab-fade`, `detail-unfold` (đã sửa theo P0-09).

- [x] **P0-12 · [T1] Lớp phủ video viết cứng và quá mỏng, chữ đặt thẳng lên nền không đảm bảo tương phản** · Cao
  - Ở đâu: `components/TripBackground.tsx:50` `bg-[#fdf8f5]/45 backdrop-blur-[1px]`.
  - Vì sao là slop: video lộ khoảng 55%. Ước tính với khung hình tối: `text-muted-foreground` đặt thẳng trên lớp phủ chỉ đạt khoảng 2,5:1. `backdrop-blur-[1px]` toàn màn hình phải tính lại ở mỗi frame mà mắt gần như không thấy khác.
  - Sửa: token `--overlay-video` (đề xuất `color-mix(in oklch, var(--background) 70%, transparent)`, hoặc gradient đậm ở đầu và cuối trang). Bỏ `backdrop-blur-[1px]`. Thêm quy tắc: **mọi chữ phải nằm trên một bề mặt** (card hoặc header), không đặt thẳng trên video. *(Cần chủ dự án duyệt độ đậm lớp phủ, vì video sẽ mờ hơn.)*

- [x] **P0-13 · [T1] Kính mờ là mặc định thay vì ngoại lệ** · Cao
  - Ở đâu: Card base (`components/ui/card.tsx:14` `bg-card/85 backdrop-blur-md`), cộng 35 chỗ `backdrop-blur` trong 17 file. Riêng Landing có 14 chỗ.
  - Sửa: thêm token bề mặt `--surface-solid` (mặc định, đặc) và `--surface-glass` (opacity ≥ 0,9, blur ≤ 8px). Quy tắc: glass chỉ dùng cho **header, dock và overlay của dialog**. Không blur bên trong dialog đã có nền đặc.

- [x] **P0-14 · [T5] Utility còn thiếu: vùng chạm, ẩn scrollbar, mask fade cho dải cuộn ngang** · Trung bình
  - Ở đâu: `components/availability/LockedBanner.tsx:59` dùng class `scrollbar-none`, nhưng class này **không tồn tại** trong Tailwind v4 lẫn `index.css`. `DayPills.tsx:21` thì tự viết arbitrary property. Có 65 nút nhỏ hơn 44px (xem P1-03).
  - Sửa: thêm vào `index.css`:
    - `@utility touch-target { position: relative; &::after { content: ''; position: absolute; inset: -0.5rem } }`
    - `@utility scrollbar-none { scrollbar-width: none; &::-webkit-scrollbar { display: none } }`
    - `@utility fade-x { mask-image: linear-gradient(to right, black 85%, transparent) }`

- [x] **P0-15 · [T1] Token sidebar không dùng** · Thấp
  - Ở đâu: `index.css:14-21`, `92-99`, `138-145`: 8 token `sidebar-*`, không có chỗ nào dùng (app không có sidebar).
  - Sửa: xóa. Giữ `chart-*` để dùng cho P3-CP-08.

---

### Ghi chú đã chốt khi làm Phase 0 (26/11/2026)
Chủ dự án chốt 3 điểm:
- Tách `--primary-strong`, giữ coral sáng cho mảng màu.
- Lớp phủ video 60%, không blur.
- Chỉ dùng giao diện sáng.

**Đã làm:**
- **P0-00:**
  - Thêm Prettier 3.10.1 (`.prettierrc.json`: không chấm phẩy, nháy đơn, `printWidth` 120, `endOfLine: auto` vì máy dùng `core.autocrlf=true`). Có script `npm run format` và `format:check`.
  - **Không** dùng `prettier-plugin-tailwindcss`. Plugin này sắp lại class trong một chuỗi, mà `cn` lại cho class đứng sau thắng, nên có thể đổi kết quả.
  - Bản build trước và sau khi format giống hệt nhau: CSS trùng byte; JS chỉ khác 5 chỗ khoảng trắng JSX bị tách thành `{' '}`, chữ hiển thị không đổi.
- **P0-01:** token ngữ nghĩa nằm trong `index.css` (`success`, `warning`, `info` cùng `-soft`/`-foreground`; `money-in`/`money-out`; `avail-yes/maybe/no`; `status-planning/upcoming/ongoing/completed`; `avatar-1..8`). Mọi cặp chữ/nền đạt ít nhất 4,5:1. Component **chưa** chuyển sang các token này: việc đó thuộc Phase 1–3.
- **P0-02:**
  - Thêm `--primary-strong: oklch(0.56 0.17 12)`: chữ trắng trên nó đạt 5,1:1, bản thân nó trên nền đạt 4,9:1.
  - 48 chỗ `text-primary` đổi thành `text-primary-strong`.
  - 7 chỗ `bg-primary text-primary-foreground` có chữ (Button default, Badge default, avatar badge, BrushBar, AvailabilityGrid, DayPills) đổi thành `bg-primary-strong`. Checkbox chỉ có icon nên giữ `bg-primary`.
- **P0-03:** `--ring: oklch(0.6 0.15 12)` (4,1:1); `outline-ring/50` thành `outline-ring`; 5 chỗ `ring-ring/50` thành `ring-ring`. **Còn lại cho Phase 1:** input, textarea, select đang dùng `focus-visible:ring-primary/25`.
- **P0-04:** đặt `color-scheme: light`; xóa khối `.dark`, `@custom-variant dark` và 25 class `dark:`; `Toaster theme="light"`, màu `richColors` lấy từ token; gỡ `next-themes`; `theme-color` đổi thành `#e65d76`.
- **P0-05:**
  - Thang bóng theo vai trò `shadow-flat/raised/cta/cta-destructive/overlay/sunken/pressed`, tint lấy từ `--primary`.
  - `shadow-clay-*` **giữ nguyên giá trị** cho tới khi Phase 1–3 chuyển xong, nên giao diện chưa đổi.
  - `lib/utils.ts` dùng `createCn` (từ `cn/config`) khai báo các token shadow, radius, text, ease. Nhờ vậy `cn('shadow-clay-badge','shadow-flat')` ra `shadow-flat`, và `text-2xs` không bị nhầm là màu chữ.
- **P0-06:**
  - Thêm `rounded-control/item/surface/overlay`.
  - 78 chỗ `rounded-[Npx]` đã đổi: 20/22px thành item, 24/26/28px thành surface, 32px thành overlay. Lệch tối đa khoảng 4px, ví dụ Dialog 32px thành 35,2px.
  - ESLint (`no-restricted-syntax` trong `eslint.config.js`) chặn `rounded-[…]`, `text-[Npx]` và `dark:`.
- **P0-07:** thêm `text-2xs` (11px). 28 chỗ `text-[10px]`/`text-[11px]` đổi thành `text-2xs`. Việc nâng lên `text-xs` cho nội dung cần đọc thuộc Phase 3.
- **P0-08:** thêm token `ease-out-soft` và `ease-press` (2 easing viết cứng đổi sang `ease-press`, hành vi giữ nguyên), cùng `--duration-fast/base`. Thay `transition-all` thuộc Phase 1.
- **P0-09:**
  - `detail-unfold` chỉ còn opacity + `translateY(8px)`: 200ms, `backwards`, không blur.
  - Trễ tối đa 160ms, `animate-tab-unfold` còn 150ms.
  - **Lỗi kéo thả trong lịch trình (P3-LT-01) đã hết ở tầng CSS**, vì animation không còn giữ transform. Việc gỡ class cascade/stagger khỏi các tab vẫn để Phase 3.
- **P0-10:** dùng rule reduced-motion chung cho mọi animation và transition. Video không bị ảnh hưởng. Vòng rAF của `FloatingBackground` để P1-19.
- **P0-11:** `index.css` từ 734 xuống 489 dòng (có thêm khoảng 120 dòng token mới). Xóa 21 keyframe không dùng cùng utility đi kèm và `clay-bg-dots`.
- **P0-12:** dùng `bg-overlay-video` (`color-mix(#fdf8f5 60%)`, không blur).
- **P0-13:** thêm utility `surface-glass`. Card mặc định chuyển sang nền đặc ở P1-05.
- **P0-14:**
  - Thêm utility `touch-target` (áp dụng ở P1-03).
  - Ẩn scrollbar bằng `no-scrollbar` có sẵn của `shadcn/tailwind.css` (LockedBanner trước dùng `scrollbar-none` không tồn tại; DayPills trước dùng class tùy ý).
  - Mask fade dùng `scroll-fade-x` có sẵn của shadcn.
- **P0-15:** xóa token `sidebar-*`.

**Kiểm chứng:**
- `npm run build`, `npm run lint` và `npm run format:check` đều xanh. Đã cố ý tạo vi phạm để thử: luật ESLint bắt được.
- Chụp màn hình bằng Chrome headless ở 360px và 1280px (landing, đăng nhập, dashboard, lịch trình, chi phí, lịch rảnh).
- Ảnh chụp ở 360px thấy tràn ngang ở tab Lịch rảnh: đã đo lại khi tải trang thẳng ở 360px, card rộng 366px trong khung 328px, khớp với P3-NR-02. *(Đính chính ở Phase 1: "tràn" ở trang đăng nhập trong ảnh Phase 0 là do script chụp đổi viewport từ 1280px xuống 360px trên cùng một trang. Tải thẳng ở 360px thì trang vừa khung.)*
- Ảnh chụp cũng xác nhận P3-CP-02 (số tiền bị cắt "9.055.…").

---

## Phase 1: Core UI Components dùng chung

Phạm vi: `components/ui/*` và các component dùng ở nhiều màn hình. Phần **1.B** liệt kê các component mới cần tạo để gom những đoạn copy-paste mà Phase 3 sẽ dùng.

### Ghi chú đã chốt khi làm Phase 1 (26/11/2026)
Chạy `/run-phase 1` được coi là đồng ý với các đề xuất trong audit, kể cả những mục gắn nhãn `[Đổi SDD UI-0/UI-1]`.

**Primitive:**
- **Button:**
  - Chỉ `default` và `destructive` còn nổi khối (`shadow-cta`, `shadow-cta-destructive`) và nhấc 2px khi hover. `outline` và `secondary` phẳng (`shadow-flat`, viền 1px), `ghost` không còn scale.
  - Transition chỉ áp cho màu, bóng và transform (150ms, `ease-out`); khi bấm chỉ lún 1px, bỏ scale.
  - Size `xs`, `sm`, `icon-xs`, `icon-sm` có `relative touch-target`: kích thước hiển thị giữ nguyên, vùng chạm thêm 8px mỗi phía (28px thành 44px).
  - Utility `touch-target` **không tự đặt `position`**, để không đè class `absolute` của nơi gọi.
- **Card:** nền đặc `bg-card`, viền 1px, `shadow-raised`, bo `rounded-surface`, bỏ blur và các bo góc riêng bên trong.
- **Badge:** phẳng, không bóng.
- **Checkbox:** không bóng, không scale; vùng chạm `after:-inset-3` (44px).
- **Tabs:** tab đang chọn bỏ `scale` và dùng `shadow-flat`.
- **Input, Textarea, Select:** focus dùng `border-ring` và `ring-ring/30`; bóng dùng `shadow-sunken`.
- **Dialog:**
  - Thêm `max-w-[calc(100%-2rem)]`, nên ở 360px dialog cách mép 16px (đã kiểm bằng ảnh chụp).
  - Nút đóng 40px, nhãn "Đóng"; tiêu đề `leading-snug pr-8`.
  - `DialogFooter` có prop `sticky` (áp dụng ở Phase 3).
  - **Chưa làm:** cho header và nút đóng dính khi cuộn, vì cần đổi cấu trúc cuộn của DialogContent.
- **AlertDialog** dùng `shadow-overlay`. **Label** dùng `leading-tight`. **Dropdown** RadioItem dùng chấm `CircleIcon`.

**FloatingBackground:**
- Khi máy bật giảm chuyển động thì không chạy rAF (hình đứng yên). Tab ẩn thì dừng rAF.
- Bỏ `transition-transform` ở 4 lớp bọc, bỏ 4 quầng blur. Drop-shadow dùng token mới `drop-shadow-decor`.
- Ngôi sao và trái tim: parallax nằm ở lớp ngoài, keyframe ở lớp trong. 💖 thay bằng SVG.

**Component dùng chung:**
- `StatusBadge`, `CountdownLabel` dùng token `status-*`, `primary`, `secondary`; không bóng, không nhấp nháy. "Đang đi" hiển thị bằng một chấm `bg-success`.
- **TripCard:**
  - Chỉ nhấc 2px khi hover, và chỉ trên thiết bị có hover (`[@media(hover:hover)]`).
  - Điểm đến dài thì `truncate`; số thành viên đọc qua `sr-only`.
  - Skeleton khớp bố cục thật (pill, dòng ngày, 3 avatar).
- **TripCover:** icon nhỏ lại (`size-24`, `white/25`).
- **UserAvatar:** màu lấy từ `avatar-1..8`, bỏ scale và bóng.
- **FormField:** tự nối lỗi hoặc gợi ý vào control (`aria-describedby`, `aria-invalid`) khi children là một phần tử; lỗi có `role="alert"`.
- **GoogleLoginButton:** đo khung bằng `ResizeObserver`, độ rộng trong khoảng 200–320px; khi đang gửi token có lớp phủ "Đang đăng nhập với Google…".
- **JoinCodeDialog:** báo lỗi ngay dưới ô khi mã không hợp lệ, có `aria-label`.
- **PlacePicker:**
  - Listbox luôn có trong DOM, nên `aria-controls` luôn trỏ tới phần tử có thật.
  - Thông báo trạng thái nằm trong `role="status"`.
  - Màu dùng `muted`, `success`; chip loại dùng `text-xs`.
- **CoverPicker:** có `aria-label`, bỏ `text-xs` (chống iOS tự zoom); ô đang chọn chỉ có ring, không scale hay quầng sáng.
- **InviteShare:** dùng Card mặc định; bỏ emoji 💌 và 💡; nút "Chép" size default; gợi ý `text-xs` kèm icon `Info`.

**Component mới (1.C):**
- `ui/toggle-group.tsx` (Radix ToggleGroup, có sẵn phím mũi tên).
- `common/ChoiceChips.tsx`: dùng chung cho CategoryPicker và FilterChips. Đã thay thử ở `ItemFormDialog` và kiểm bằng ảnh chụp; 3 bản copy còn lại để Phase 3.
- `common/states.tsx`: `EmptyState`, `TabErrorState`, `TabSkeleton`.
- `common/layout.tsx`: `PageContainer`, `FieldError`, `RowMenuButton`.

**Kiểm chứng:**
- `npm run build`, `lint`, `format:check` đều xanh.
- Chụp màn hình ở 360px và 1280px: đăng nhập (nút Google vừa khung), dashboard, dialog "Thêm hoạt động" (có lề, ChoiceChips chọn được).

### 1.A Primitive (`components/ui/`)

#### `button.tsx`
- [x] **P1-01 · [T2] Mọi variant đều nổi khối và nhấc lên khi hover, nên nút chính không nổi bật** · Cao
  - `components/ui/button.tsx:12-20`. Code: `outline: "border-2 border-border/80 bg-card ... shadow-clay-btn-outline hover:-translate-y-0.5 ..."`
  - Vì sao: "Hủy" (outline) đứng cạnh "Lưu" (default) gần như nặng ngang nhau.
  - Sửa: chỉ `default` và `destructive` giữ `clay-cta` cùng hiệu ứng nhấc. `outline` và `secondary` dùng `clay-flat`, không translate, chỉ đổi nền khi hover. `border-2` đổi thành `border`. `[Đổi SDD UI-0]`

- [x] **P1-02 · [T3] Chuyển động lò xo trên mọi nút, không có `motion-reduce`** · Trung bình
  - `components/ui/button.tsx:7`. Code: `transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] … active:translate-y-1 active:scale-[0.98]`
  - Vì sao: mỗi lần bấm nút nảy tổng cộng khoảng 6px. `transition-all` làm cả màu và bóng cũng nảy theo.
  - Sửa: `transition-[background-color,box-shadow,transform] duration-150 ease-out`, `active:translate-y-px`, bỏ `scale-[0.98]`, thêm `motion-reduce:transform-none`.

- [x] **P1-03 · [T5] Size `xs` / `sm` / `icon-xs` / `icon-sm` chỉ 28–34px, dùng ở 65 chỗ trong 26 file** · Cao
  - `components/ui/button.tsx:26-31`: `xs: "h-7"`, `sm: "h-8.5"`, `"icon-xs": "size-7"`, `"icon-sm": "size-8.5"`.
  - Sửa: các size này tự kèm utility `touch-target` (P0-14), giống cách `switch.tsx:17` đã làm, hoặc dùng `size-11 sm:size-8.5`. Đây là sửa một lần cho cả 65 chỗ.

- [x] **P1-04 · [T1] Destructive mượn quầng sáng coral của primary, chữ trắng viết cứng** · Thấp
  - `components/ui/button.tsx:20`. Code: `destructive: "bg-destructive text-white shadow-clay-btn-primary ..."`
  - Sửa: dùng `clay-cta-destructive` (P0-05) và token `--destructive-foreground`.

#### `card.tsx`
- [x] **P1-05 · [T1] Mọi Card đều là kính mờ (85% + `backdrop-blur-md`) có viền trắng 2px** · Cao
  - `components/ui/card.tsx:14`. Code: `rounded-3xl bg-card/85 backdrop-blur-md ... shadow-clay-card border-2 border-white/80 transition-all`
  - Vì sao: trình duyệt phải blur lại từng Card ở mỗi frame vì nền video đang chạy, nên 15 card rất nặng với máy yếu. `border-white/80` trên card trắng không thấy được. `transition-all` thừa vì card không có hover.
  - Sửa: mặc định dùng `bg-card` đặc, `border border-border/60`, `clay-raised`. Thêm `variant="glass"` có chủ đích (P0-13).

- [x] **P1-06 · [T2] Bo góc lệch ngay trong primitive** · Trung bình
  - `components/ui/card.tsx:14, 27, 83`: thẻ `rounded-3xl` (35px), ảnh, header và footer `rounded-t-[22px]` / `rounded-b-[22px]`.
  - Sửa: dùng `--radius-surface`, bỏ mọi giá trị 22px (`overflow-hidden` đã cắt góc).

#### `dialog.tsx`, `alert-dialog.tsx`, `label.tsx`
- [x] **P1-07 · [T5] Dialog dính sát mép màn hình mobile** · Cao
  - `components/ui/dialog.tsx:62`. Code: `fixed top-1/2 left-1/2 ... w-full ... rounded-[32px] ... sm:max-w-lg`. Khi sửa tay đã mất `max-w-[calc(100%-2rem)]` có trong bản shadcn gốc.
  - Sửa: thêm `max-w-[calc(100%-2rem)]`, `rounded-[32px]` đổi thành `--radius-overlay`. Hoặc trên mobile dùng bottom sheet (`inset-x-0 bottom-0 rounded-b-none`).

- [ ] **P1-08 · [T5] Nút đóng 32px, nhãn tiếng Anh, bị cuộn mất trong dialog dài** · Trung bình *(đã sửa kích thước và nhãn; còn phần header dính khi cuộn)*
  - `components/ui/dialog.tsx:69-75`. Code: `absolute top-4 right-4 rounded-full p-2 …` / `<span className="sr-only">Close</span>`
  - Sửa: `Button variant="ghost" size="icon"` (40px trở lên), `sr-only` đổi thành "Đóng", bỏ `active:scale-90`. Header (tiêu đề + nút đóng) đặt `sticky top-0` khi `DialogContent` có `overflow-y-auto`.

- [x] **P1-09 · [T5] Footer dialog không dính đáy** · Trung bình
  - Ở đâu: mọi dialog dài như `ExpenseFormDialog`, `TripFormDialog`, `DressCodeDialog`, `ProfileDialog` (`max-h-[92svh] overflow-y-auto`).
  - Sửa: `DialogFooter` thêm prop `sticky` dùng `sticky bottom-0 -mx-6 border-t bg-card px-6 pt-3`.

- [x] **P1-10 · [T4] `leading-none` trên tiêu đề và nhãn làm dấu tiếng Việt đè nhau khi xuống dòng** · Trung bình
  - `components/ui/dialog.tsx:109` (DialogTitle), `components/ui/label.tsx:13`.
  - Vì sao: tiêu đề dài như "Xóa chuyến đi "Đà Lạt săn mây 2027"?" xuống dòng ở 360px, dấu chồng (ễ, ổ, Ữ) của dòng dưới đè lên dòng trên.
  - Sửa: dùng `leading-snug` cho title, `leading-tight` cho Label.

- [x] **P1-11 · [T2] AlertDialog `rounded-[32px]` lệch với scale** · Thấp
  - `components/ui/alert-dialog.tsx:58`. Sửa: dùng `--radius-overlay` chung với Dialog.

#### `badge.tsx`, `checkbox.tsx`, `tabs.tsx`, `dropdown-menu.tsx`, `sonner.tsx`
- [x] **P1-12 · [T2] Mọi badge, kể cả `ghost`/`link`, đều có bóng clay nên trông như nút** · Trung bình
  - `components/ui/badge.tsx:7` `… shadow-clay-badge transition-all …`.
  - Sửa: badge phẳng (nền nhạt + viền 1px), bỏ `shadow-clay-badge` và `transition-all` khỏi base.

- [x] **P1-13 · [T5] Checkbox 20px không có vùng chạm mở rộng** · Trung bình
  - `components/ui/checkbox.tsx:14` `size-5 … active:scale-90`.
  - Sửa: thêm `touch-target` (P0-14) hoặc bọc cả dòng bằng `<label>`. Bỏ `active:scale-90`.

- [x] **P1-14 · [T1] Ô đã tích phát sáng như nút CTA** · Thấp
  - `components/ui/checkbox.tsx:14` `data-checked:shadow-clay-btn-primary`. 30 món đã tích thành 30 đốm sáng coral.
  - Sửa: khi đã tích chỉ dùng `bg-primary border-primary`, không bóng.

- [x] **P1-15 · [T3] Tab đang chọn bị scale 1.02 bên trong vùng có overflow** · Thấp
  - `components/ui/tabs.tsx:67` `data-active:scale-[1.02]`. Thêm `:84` `data-[state=active]:animate-tab-unfold` (0,4s).
  - Sửa: bỏ scale. Fade tối đa 150ms.

- [x] **P1-16 · [T3] RadioItem dùng `CheckIcon size-2` nên dấu chọn gần như vô hình** · Thấp
  - `components/ui/dropdown-menu.tsx:140`. Bản shadcn gốc dùng `CircleIcon size-2 fill-current`. Hiện chưa có chỗ nào dùng, nên sửa ngay trước khi có người dùng.

- [x] **P1-17 · [T1] Toast theo theme hệ điều hành, `richColors` dùng palette riêng của Sonner** · Trung bình
  - `components/ui/sonner.tsx:6-10` (`useTheme()` luôn là "system"), `main.tsx:17` `richColors`.
  - Sửa: `theme="light"` (P0-04). Map `--normal-bg`, `--success-bg`, `--error-bg`… của Sonner sang token ngữ nghĩa (P0-01). `--border-radius` lấy theo `--radius-overlay`.

#### `FloatingBackground.tsx` (giữ hình theo ràng buộc 0.1, chỉ giảm bớt)
- [x] **P1-18 · [T3] Vòng rAF ghi 10 biến CSS mỗi frame, mãi mãi, đánh nhau với `transition-transform`** · Trung bình
  - `components/ui/FloatingBackground.tsx:83-133`, wrapper ở `:155`, `:176`, `:197`, `:218`.
  - Vì sao: khi đứng yên vẫn ghi biến lên container ở mỗi frame, nên trình duyệt tính lại style toàn bộ cây con. Mỗi frame lại khởi động một transition 150ms nên chuyển động trễ và nhòe. Vòng lặp vẫn chạy khi tab đang ẩn.
  - Sửa: bỏ `transition-transform` ở 4 wrapper. Dừng rAF khi `document.hidden` hoặc khi parallax đã hội tụ. Phần nhấp nhô chuyển sang CSS keyframes, JS chỉ xử lý parallax khi có sự kiện cuộn.

- [x] **P1-19 · [T3] Không có nhánh reduced-motion; inline transform ở hai phần tử là code chết** · Trung bình
  - `FloatingBackground.tsx:225`, `:240`, `:252` (`campfire-flicker`, `star-twinkle`, `heart-float`), `:241-242`, `:253-254`.
  - Vì sao: keyframe `heart-float` và `star-twinkle` đặt `transform`, nên ghi đè inline `style.transform` của parallax.
  - Sửa: `if (matchMedia('(prefers-reduced-motion: reduce)').matches) return` trước khi chạy rAF (giữ hình tĩnh). Bọc thêm một lớp wrapper để tách parallax khỏi keyframe. Cách này không đụng tới video.

- [x] **P1-20 · [T1] Quầng blur và drop-shadow màu viết cứng trên từng hình; emoji 💖** · Thấp
  - `FloatingBackground.tsx:162, 166, 183, 187, 204, 208, 225, 229` (`bg-amber-300/30 blur-md animate-pulse-gentle`, `drop-shadow-[0_10px_20px_rgba(245,158,11,0.22)]`), `:257` (💖).
  - Sửa: bỏ các div quầng (PNG đã có màu), nếu giữ thì không animate. Drop-shadow dùng một token `--shadow-decor`. 💖 thay bằng SVG cùng phong cách với ngôi sao ở `:245`.

### 1.B Component dùng chung trong `components/`

#### `TripBackground.tsx`
- [x] **P1-21 · [T1] Lớp phủ video**: xem P0-12 (sửa trong file này, dùng token đã định nghĩa ở Phase 0).

#### `StatusBadge.tsx`, `CountdownLabel.tsx`
- [x] **P1-22 · [T1/T3] StatusBadge: palette viết cứng, 3 bóng chồng nhau, blur vô dụng, nhấp nháy vô hạn** · Trung bình
  - `components/StatusBadge.tsx:7-10, 17`. Code: `ONGOING: 'bg-emerald-100 text-emerald-900 ... shadow-clay-badge animate-pulse-gentle'` + `'border shadow-sm backdrop-blur-xs'`. TripCard (`:24`) còn thêm `shadow-md`.
  - Sửa: token `--status-*` (P0-01). Bỏ `shadow-sm`, `backdrop-blur-xs`, `animate-pulse-gentle` và các class trùng với base Badge. "Đang đi" thể hiện bằng một chấm tĩnh.

- [x] **P1-23 · [T2] CountdownLabel: nhãn tĩnh mặc bóng nút CTA và nhấp nháy** · Trung bình
  - `components/CountdownLabel.tsx:9-10, 19`. Code: `today: 'bg-rose-200 text-rose-800 … shadow-clay-btn-primary animate-pulse-gentle'` + base `shadow-xs`.
  - Sửa: bỏ toàn bộ bóng và pulse. Phân cấp bằng tone màu (token) và độ đậm chữ.

#### `TripCard.tsx`, `TripCover.tsx`
- [x] **P1-24 · [T4] Điểm đến dài tràn khỏi ảnh bìa cao cố định** · Trung bình
  - `components/TripCard.tsx:22, 29-33`. Code: `h-44` … `<p className="mt-1 flex items-center gap-1.5 text-sm">{trip.destination}`
  - Vì sao: tên như "Thị trấn Sa Pa, huyện Sa Pa, Lào Cai, Việt Nam" đẩy tiêu đề lên đè badge, hoặc bị cắt mất.
  - Sửa: `min-w-0` cho container, bọc `<span className="truncate">` quanh điểm đến.

- [x] **P1-25 · [T3] Hover nhấc 8px với easing lò xo, tiêu đề trượt ngang, hover "dính" trên cảm ứng** · Thấp
  - `components/TripCard.tsx:20, 26`. Code: `ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-2` / `group-hover:translate-x-0.5`
  - Sửa: `[@media(hover:hover)]:hover:-translate-y-0.5 ease-out motion-reduce:transform-none`, bỏ translate-x. `[Đổi SDD UI-1]`

- [x] **P1-26 · [T2] Bo góc tùy ý giữa thẻ và ảnh bìa** · Thấp
  - `components/TripCard.tsx:20, 22, 68`: `rounded-[28px]` / `rounded-t-[26px]`.
  - Sửa: dùng `--radius-surface`, bỏ bo riêng của ảnh bìa. `[Đổi SDD UI-1]`

- [x] **P1-27 · [T5/T4] `aria-label` đặt trên div không role; skeleton không khớp layout thật** · Thấp
  - `components/TripCard.tsx:48`: `<div … aria-label={`${trip.memberCount} thành viên`}>` nên trình đọc màn hình đọc "L M T +12". `:66-75`: skeleton chỉ có 2 thanh.
  - Sửa: dùng `<span className="sr-only">` và `aria-hidden` cho AvatarGroup. Skeleton gồm pill đếm ngược, dòng ngày và 3 vòng avatar.

- [x] **P1-28 · [T3] Icon lucide 144px trang trí trên mọi ảnh bìa preset** · Thấp
  - `components/TripCover.tsx:32`. Code: `size-36 text-white/40`. Ở preset sáng (`lib/covers.ts:17-18`) icon thành vệt bẩn, lại nằm đúng góc có chữ của TripCard.
  - Sửa: dùng `size-24 text-white/25`, hoặc chỉ hiện trong CoverPicker.

#### `UserAvatar.tsx`
- [x] **P1-29 · [T3/T1] Avatar tĩnh có hover và active scale; 8 màu fallback viết cứng** · Thấp
  - `components/UserAvatar.tsx:35` (`hover:scale-105 active:scale-95 shadow-clay-badge` + `ring-2` + `after:border` của Avatar, tổng 3 lớp viền), `:4-13` (`'bg-rose-100 text-rose-700 shadow-clay-badge'`…).
  - Sửa: bỏ scale và bóng, chỉ giữ `ring-2 ring-card`. Màu lấy từ `--avatar-1..8` (P0-01). Hai tên cùng chữ cái đầu (Linh, Lan): cân nhắc lấy 2 ký tự.

#### `GoogleLoginButton.tsx`, `JoinCodeDialog.tsx`, `FormField.tsx`
- [x] **P1-30 · [T5] Nút Google rộng cố định 320px, tràn Card ở 360px** · Cao
  - `components/GoogleLoginButton.tsx:19` `width="320"`. Ở 360px vùng nội dung Card chỉ còn khoảng 280px.
  - Sửa: đo container bằng `ResizeObserver` và truyền `width={Math.min(320, w)}` (GIS nhận 200–400).

- [x] **P1-31 · [T4] Không có trạng thái loading sau khi Google trả token** · Trung bình
  - `components/GoogleLoginButton.tsx:14, 25` (chỉ có `aria-busy`).
  - Sửa: khi `isPending`, phủ một lớp `Loader2` với chữ "Đang đăng nhập với Google…" và chặn `pointer-events`.

- [x] **P1-32 · [T5] Nút "Tiếp tục" bị disable mà không giải thích; input không có label** · Trung bình
  - `components/JoinCodeDialog.tsx:38-50` (`disabled={!code}`), `tracking-[0.2em]`.
  - Sửa: khi `value.trim() && !code`, hiện `<p role="alert">Mã không hợp lệ: mã gồm 8 ký tự hoặc link /join/…</p>`. Thêm `aria-label="Mã mời"`, đổi sang `tracking-widest`.

- [x] **P1-33 · [T5] FormField tạo id lỗi nhưng không nối vào input (0 `aria-describedby` trong cả repo)** · Trung bình
  - `components/FormField.tsx:21-27`. Có 35 chỗ dùng.
  - Sửa: FormField dùng `Slot` để tự gắn `aria-describedby` (lỗi hoặc hint) và `aria-invalid` cho child. Dòng lỗi thêm `role="alert"`, hint thêm `id`.

#### `PlacePicker.tsx`, `CoverPicker.tsx`, `InviteShare.tsx`
- [x] **P1-34 · [T1] PlacePicker: option active `bg-rose-50`, lệch với Select và Dropdown (`bg-muted/70`); MapPin hồng trên mọi dòng; màu "thành công" viết cứng** · Thấp
  - `components/PlacePicker.tsx:87, 122, 125, 147`.
  - Sửa: `bg-muted/70`, icon `text-muted-foreground`, `text-success` (token).

- [x] **P1-35 · [T5] PlacePicker: chip loại 10px; `aria-controls` trỏ tới id chưa render; trạng thái không có `aria-live`** · Thấp
  - `components/PlacePicker.tsx:130` (`text-[10px]`), `:68`, `:107`.
  - Sửa: dùng `text-xs`. Luôn render `<ul id={listId} role="listbox">`. "Đang tìm…" và "Không thấy…" đặt trong `role="status" aria-live="polite"`.

- [x] **P1-36 · [T2] Panel gợi ý là card nổi lồng trong dialog nổi** · Thấp
  - `components/PlacePicker.tsx:94` `rounded-2xl border-2 border-white/80 bg-card shadow-clay-card`.
  - Sửa: `rounded-xl border bg-popover` + `clay-overlay` (hoặc `shadow-sm`).

- [x] **P1-37 · [T5] CoverPicker: input `text-xs` khiến iOS tự zoom khi focus, chỉ có placeholder làm nhãn; ô preset scale và phát sáng; kiểu lỗi khác FormField** · Trung bình
  - `components/CoverPicker.tsx:55-59`, `:41-43`, `:65`.
  - Sửa: bỏ `text-xs sm:text-sm` (Input base đã cố ý dùng `text-base md:text-sm`), thêm `aria-label="Link ảnh bìa"`. Ô đã chọn chỉ cần `ring-3 ring-primary ring-offset-2`. Lỗi dùng chung component `FieldError`.

- [x] **P1-38 · [T3/T5] InviteShare: emoji 💌 nhấp nháy, gợi ý 💡 11px nghiêng mờ, nút "Chép" và "Đổi mã" 34px, gradient trang trí** · Trung bình
  - `components/InviteShare.tsx:59` (`rounded-[28px] … bg-gradient-to-br from-rose-50/70 via-card to-violet-50/70`), `:63`, `:72`, `:76-85`, `:105-114`, `:119-121`.
  - Vì sao: copy link mời là hành động chính của màn hình, vậy mà vùng chạm chỉ 34px.
  - Sửa: dùng `<Card>` mặc định (hoặc `bg-accent/40`), bỏ emoji. Gợi ý dùng `text-xs text-muted-foreground`, không italic, có icon `Info`. Nút copy `size="default"`. Icon tick đổi từ `text-emerald-100` sang `text-primary-foreground`.

### 1.C Component mới cần tạo (gom các đoạn copy-paste mà Phase 3 sẽ dùng)
- [x] **P1-40 · `SelectablePill` / dùng `ToggleGroup` của Radix** · Trung bình
  - Ở đâu: gradient `bg-gradient-to-r from-rose-500 to-rose-600` cho trạng thái "được chọn" bị copy ở 8 chỗ: `DayPills.tsx:64`, `ItemFormDialog.tsx:113`, `IdeasTab.tsx:44`, `ProposalFormDialog.tsx:120`, `ScheduleProposalDialog.tsx:132`, `ClosePollDialog.tsx:148`, `ProposalCard.tsx:110`, `PollsTab.tsx:247`, cùng `ChecklistTab.tsx:158`, `ExpenseFormDialog.tsx:218-232`.
  - Sửa: một variant chung `bg-primary text-primary-foreground border-primary/40` (không gradient, không translate), `min-h-10`, có focus ring.

- [x] **P1-41 · `CategoryPicker`** · Trung bình
  - Ở đâu: bộ chọn loại hoạt động có 4 bản copy lệch nhau (ARIA, hover, cỡ icon): `ItemFormDialog.tsx:102-121`, `ProposalFormDialog.tsx:109-128`, `ScheduleProposalDialog.tsx:121-140`, `ClosePollDialog.tsx:138-156`. Bản cuối dùng `aria-pressed` và không có nhãn. Ba bản đầu khai báo `role="radio"` nhưng không có phím mũi tên.
  - Sửa: dùng `ToggleGroup type="single"` (có sẵn bàn phím), bọc trong `FormField label="Loại"`.

- [x] **P1-42 · `FilterChips`** · Trung bình
  - Ở đâu: `role="radiogroup"` tự chế không có roving tabindex, cao khoảng 30px: `ChecklistTab.tsx:147-165`, `AlbumTab.tsx:211-231`, `ExpenseFormDialog.tsx:157-176`.
  - Sửa: dùng `ToggleGroup`, `h-10` trở lên, dựa trên `SelectablePill`.

- [x] **P1-43 · `EmptyState`** · Thấp
  - Ở đâu: cùng một khuôn "emoji 48px `animate-float-slow` + viền dashed rose + bóng clay" lặp ở `DashboardPage.tsx:73-87`, `AvailabilityTab.tsx:59-60`, `ProposalsPanel.tsx:141, 150`, `PollsTab.tsx:92, 120`, `RoomsTab.tsx:101`, `AlbumTab.tsx:237`.
  - Sửa: `<EmptyState icon={LucideIcon} title description action />`. Icon tĩnh đặt trong vòng `bg-primary/10`, CTA đặt ngay trong khối.

- [x] **P1-44 · `TabErrorState` + `TabSkeleton`** · Thấp
  - Ở đâu: khối lỗi `border-rose-200/80` được dán ở 4 tab (`ExpensesTab.tsx:73`, `ChecklistTab.tsx:76`, `RoomsTab.tsx:58`, `AlbumTab.tsx:67`), cộng `ItineraryTab.tsx:111-112`. Skeleton mỗi tab một kiểu, thường chỉ là một khối `h-64` (`ProposalsPanel.tsx:51`, `PollsTab.tsx:49`).
  - Sửa: `<TabErrorState error onRetry />` dùng `border-destructive/30`. `<TabSkeleton variant="list|grid|form+list" />` có hình dạng khớp với bố cục thật.

- [x] **P1-45 · `RowMenuButton`** · Thấp
  - Ở đâu: nút ⋮ có viền, bóng và nền trắng mờ, kích thước 28–34px, được copy ở Checklist (`:244-251`), Expenses (`:288`), Rooms (`:291` `icon-xs`), Album (`:314`), ItemCard (`:54`), ProposalCard (`:121`), MemberList (`:146`).
  - Sửa: ghost, 40px trở lên, kèm `touch-target`, không bóng, `aria-label` có tên đối tượng.

- [x] **P1-46 · `PageContainer`** (dùng ở P2-03) và **`FieldError`** (dùng ở P1-37). Xong khi tạo đủ hai component này.

---

## Phase 2: Layout khung (Header, Nav, Footer, Shell)

Phạm vi: `App.tsx`, `components/AppLayout.tsx`, `components/AuthShell.tsx`, `components/BrandLogo.tsx`, khung header, nav và footer của `pages/LandingPage.tsx`, phần header, cover, thanh tab và menu "⋯" của `pages/TripDetailPage.tsx`, và cách đặt `FloatingBackground`.

### Ghi chú đã chốt khi làm Phase 2 (26/11/2026)
- **P2-01 (đã kiểm trên trình duyệt):** `overflow-x-hidden` đổi thành `overflow-x-clip` ở AppLayout, Landing và AuthShell. Sau khi cuộn, header nằm ở `top: 0` và thanh tab ở `top: 72px`.
- **P2-02:**
  - Header của app và Landing dùng **nền đặc** `bg-background` + `border-b`, không blur, không bóng. Bản `/95` để lộ chữ phía sau khi cuộn (thấy trên ảnh chụp), nên chọn nền đặc.
  - Footer Landing dùng `bg-background/95`, nav pill bỏ nền và blur.
- **P2-03:** header và main của AppLayout dùng `PageContainer` (`max-w-5xl px-4 sm:px-6`), Landing đổi từ `max-w-6xl lg:px-8` sang cùng khung đó. `PageContainer` có thêm prop `asMain`.
- **P2-04:** BrandLogo là ô `bg-primary-strong` + chữ `text-foreground`, không gradient, không nhấp nhô, không xoay khi hover. `[Đổi SDD UI-1]`
- **P2-05:** menu tài khoản hiện tên + `@username` (khi có), không emoji.
- **P2-06:** `FloatingBackground` có prop `density`. AppLayout và AuthShell dùng `corners` (ẩn xe van và lửa trại dưới `md`), Landing giữ `full`.
- **P2-07:** mọi thẻ của trang auth (Login, Register, Join ×3, VerifyEmail, Unsubscribe, NotFound) là `<Card className="rounded-overlay">` mặc định; Join giữ thêm `overflow-hidden p-0` cho ảnh bìa. AuthShell không tự bọc Card, vì JoinPage có 3 trạng thái với bố cục thẻ khác nhau.
- **P2-08:**
  - Nav và menu dùng cùng breakpoint `md`. Menu mobile dùng `DropdownMenu` của Radix (có Esc, chạm ra ngoài, giữ focus), nút mở menu 44px.
  - Nhãn lấy từ một mảng `NAV_LINKS` chung.
  - **Chưa làm:** `aria-current` cho section đang xem.
- **P2-09:** xóa `smoothScrollTo` và `scrollToTop` (khoảng 60 dòng). Anchor `#about`, `#features`, `#contact` và "Lên đầu trang" (`#top`) chạy tự nhiên, URL giữ hash. Cuộn mượt nhờ CSS và tự tắt khi bật giảm chuyển động (P0-10). Đã kiểm: mở `/#features` thì trang tự cuộn tới section, header vẫn dính.
- **P2-10:** link footer `text-sm`, `min-h-11`.
- **P2-11:** ảnh bìa trang chuyến dùng `min-h-60` (`sm:min-h-72`) thay chiều cao cố định; tiêu đề `line-clamp-3 break-words`; điểm đến `truncate`.
- **P2-12 (đã kiểm trên trình duyệt):**
  - Dải tab `sticky top-16`, nền đặc, mép mờ dần bằng `scroll-fade-x` của shadcn, trigger `min-h-11`.
  - Tab đang chọn tự cuộn vào giữa (`scrollIntoView`) khi mở trang và khi đổi tab. Mở `?tab=album` ở 360px thì thấy tab "Album".
- **P2-13:** pill đếm ngược chỉ còn `CountdownLabel` (không bọc thêm, không phóng to khi hover).
- **P2-14:** bỏ `animate-cascade` ở tab Tổng quan và ở skeleton. Bản thân TabsContent vẫn fade 150ms (P0-09).
- **Kiểm chứng:** `npm run build`, `lint`, `format:check` đều xanh. Chụp màn hình Chrome headless ở 360px (tải thẳng ở 360px, không đổi viewport giữa chừng): menu mobile của Landing, `/#features`, trang chuyến `?tab=album` trước và sau khi cuộn.

- [x] **P2-01 · [T5] `overflow-x-hidden` trên wrapper làm `sticky` header không dính** · Cao
  - `components/AppLayout.tsx:25`, `pages/LandingPage.tsx:144`. Code: `<div className="relative min-h-svh overflow-x-hidden">` … `<header className="sticky top-0 …">`
  - Vì sao: `overflow-x: hidden` ép `overflow-y` thành `auto`, nên div thành scroll container mà không bao giờ tự cuộn, và `sticky` bám theo khung đó. `smoothScrollTo` (`LandingPage.tsx:80`) còn trừ `headerOffset = 72` cho một header có thể không dính. *(Cần kiểm trên trình duyệt.)*
  - Sửa: đổi sang `overflow-x-clip` (không tạo scroll container). `FloatingBackground` đã `fixed overflow-hidden` nên tự chặn được tràn ngang.

- [x] **P2-02 · [T1] Header và footer là kính mờ chồng lên video, lớp phủ và hình trang trí** · Trung bình
  - `components/AppLayout.tsx:27`, `pages/LandingPage.tsx:151`, `:159` (nav pill `bg-white/70 backdrop-blur-sm`), `:212` (menu mobile `backdrop-blur-xl`), `:766` (footer). Code: `border-b border-white/70 bg-background/75 backdrop-blur-md shadow-clay-badge`
  - Sửa: `bg-background/95` (glass theo P0-13 chỉ khi thật cần), `border-b border-border`, không bóng. Nav pill bỏ nền và blur.

- [x] **P2-03 · [T2] Container mỗi layout một kiểu** · Thấp
  - `pages/LandingPage.tsx:152`, `:255` (`max-w-6xl px-4 sm:px-6 lg:px-8`) so với `components/AppLayout.tsx:28`, `:57` (`max-w-5xl px-4`). AuthShell lại khác.
  - Vì sao: đăng nhập xong thì logo và avatar nhảy chỗ, gutter desktop đổi từ 32px xuống 16px.
  - Sửa: dùng chung `PageContainer` (P1-46) `mx-auto max-w-5xl px-4 sm:px-6` cho header, main và footer ở mọi layout.

- [x] **P2-04 · [T1/T3] BrandLogo: chữ gradient, gradient rose/fuchsia viết cứng, nhấp nhô vô hạn, xoay khi hover** · Trung bình
  - `components/BrandLogo.tsx:7`, `:10`. Code: `bg-gradient-to-br from-rose-400 to-fuchsia-400 … animate-float-slow` / `bg-gradient-to-r from-rose-500 to-fuchsia-500 bg-clip-text text-transparent`
  - Vì sao: chữ gradient là dấu hiệu AI slop điển hình. Logo nhấp nhô ngay cạnh nội dung ở mọi trang.
  - Sửa: chữ `text-foreground` (hoặc `text-primary`), ô icon `bg-primary text-primary-foreground`, bỏ `animate-float-slow` và `group-hover:scale-110 -rotate-6`. `[Đổi SDD UI-1]`

- [x] **P2-05 · [T3] Emoji 👋 trong menu tài khoản, trùng với lời chào ở Dashboard** · Thấp
  - `components/AppLayout.tsx:41`. Code: `Xin chào, {user.displayName} 👋`
  - Sửa: label hiện tên + `@username`, có `truncate`, không emoji.

- [x] **P2-06 · [T1/T5] Hình trang trí lớn nằm cố định sau form và card trên mobile** · Trung bình
  - `components/ui/FloatingBackground.tsx:196-233` (xe van `bottom-6 left-3 w-28`, lửa trại `bottom-6 right-3 w-20`, kèm quầng `bg-amber-300/30 blur-md`…).
  - Vì sao: ở 360px, hai hình này lộ qua sau ô input và TripCard (vốn trong mờ).
  - Sửa: thêm prop `density="full" | "corners"`. `AppLayout` và `AuthShell` dùng `corners` (`hidden md:block` cho hai hình dưới, `opacity-60`, bỏ quầng). Landing giữ `full`. *(Giữ hình theo ràng buộc 0.1, chỉ giảm.)*

- [x] **P2-07 · [T2] Vỏ card của các trang auth bị copy 7 lần với biến thể lệch nhau** · Thấp
  - `components/AuthShell.tsx:11-17` (vỏ không có card); `pages/LoginPage.tsx:47`, `RegisterPage.tsx:70`, `JoinPage.tsx:53`, `:69`, `:95`, `VerifyEmailPage.tsx:49`, `UnsubscribePage.tsx:46`. Code: `rounded-[32px] border-2 border-white/80 bg-card/95 shadow-clay-card` (Login/Register lại `border … backdrop-blur-sm p-1 sm:p-2`).
  - Sửa: `AuthShell` tự bọc một `<Card>` chuẩn duy nhất, các trang chỉ truyền nội dung. `[Đổi SDD UI-1]`

- [x] **P2-08 · [T5] Landing: khoảng 640–767px không có nav; menu mobile thiếu Esc, click ra ngoài và focus trap; hamburger 40px; nhãn mobile khác desktop** · Thấp
  - `pages/LandingPage.tsx:159` (nav `hidden md:flex`), `:184`, `:202` (hamburger `flex sm:hidden`), `:211-251`.
  - Sửa: dùng chung breakpoint `md` cho nav và hamburger. Menu đổi sang `Sheet` hoặc `DropdownMenu` của Shadcn, hamburger `size-11`, nhãn thống nhất. Desktop nav đánh dấu section đang xem (`aria-current`).

- [x] **P2-09 · [T3/T5] Landing: smooth-scroll tự viết 60 dòng, bỏ qua reduced-motion, xóa hash URL** · Trung bình
  - `pages/LandingPage.tsx:76-133`, `:135-141`. Code: `const smoothScrollTo = (targetId, duration = 900) => { … requestAnimationFrame(step)`
  - Vì sao: `e.preventDefault()` làm URL không có `#features`, nên không chia sẻ hay bấm Back được.
  - Sửa: xóa hai hàm, để anchor chạy tự nhiên, kết hợp `scroll-mt-20` có sẵn và rule `scroll-behavior` theo P0-10. "Lên đầu trang" dùng `href="#top"`.

- [x] **P2-10 · [T5] Landing: link footer `text-xs` không padding, vùng chạm khoảng 16px** · Thấp
  - `pages/LandingPage.tsx:780-784`. Sửa: `text-sm inline-flex min-h-11 items-center px-2`.

- [x] **P2-11 · [T4] Trang chuyến: tên chuyến dài tràn hoặc bị cắt trong cover cao cố định** · Trung bình
  - `pages/TripDetailPage.tsx:120`, `:122`, `:165`. Code: `-mx-4 h-60 sm:mx-0 sm:h-72 …` … `<h1 className="text-2xl leading-tight font-bold">{data.title}</h1>`
  - Sửa: `min-h-60` thay cho `h-60`; h1 thêm `line-clamp-3 break-words`; điểm đến thêm `truncate`.

- [x] **P2-12 · [T5] Thanh 8 tab: cuộn ngang không có gợi ý, không dính, tab đang chọn có thể nằm ngoài màn hình, trigger 36px** · Trung bình
  - `pages/TripDetailPage.tsx:191-201`. Code: `<div className="-mx-4 overflow-x-auto px-4 pb-2"><TabsList className="bg-card/90 backdrop-blur-md shadow-clay-dock … h-12">`
  - Vì sao: ở 360px chỉ thấy 3–4 tab. Mở từ email với `?tab=album` thì tab đang chọn nằm khuất bên phải. Nội dung dài thì phải cuộn ngược lên mới đổi được tab.
  - Sửa: wrapper `sticky top-16 z-20` (sau khi sửa P2-01), dùng `fade-x` (P0-14). Gọi `scrollIntoView({ inline: 'center' })` cho trigger active khi mount và khi đổi tab. Trigger `min-h-11`. Bỏ blur.

- [x] **P2-13 · [T3] Pill đếm ngược phóng to khi hover dù không bấm được** · Thấp
  - `pages/TripDetailPage.tsx:185`. Code: `bg-card/90 backdrop-blur-xs … hover:scale-105`
  - Sửa: bỏ scale và blur. Cân nhắc đưa vào cover, cạnh `StatusBadge`.

- [x] **P2-14 · [T3] Tab Tổng quan cascade lại mỗi lần quay về; skeleton cũng cascade** · Thấp
  - `pages/TripDetailPage.tsx:205`, `:220`, `:310` (`animate-cascade`) + `ui/tabs.tsx:84`.
  - Sửa: bỏ `animate-cascade` ở ba chỗ này. Chỉ giữ fade ngắn của TabsContent (P1-15).

---

## Phase 3: Từng màn hình / feature

### Ghi chú đã chốt khi làm Phase 3 (26/11/2026)
**Backend (đổi contract, test 253 pass, 1 skip, có cả test tích hợp):**
- `ExpenseDtos.TransferResponse` thêm `pendingAmount`: tổng các lần chuyển PENDING cùng chiều from → to, tối đa bằng `amount`. Tính bằng `ExpenseSummaryBuilder.pendingByPair`; `ExpenseIntegrationTest` có kiểm.
  - FE dùng `remaining = amount − pendingAmount`. Khi `remaining` bằng 0 thì hiện "Đang chờ xác nhận". Người nhận chỉ thấy "Xác nhận" trên dòng PENDING, không thấy "Đã nhận". Vì vậy lỗi tính tiền hai lần (P3-CP-01) đã hết.
- `InvitePreviewResponse` thêm `coverSeed` (= id chuyến), để ảnh bìa mặc định ở trang mời giống trang chuyến.

**Frontend:** 5 agent chạy song song, mỗi agent một nhóm file riêng.
- Deep link hồ sơ: `?profile=account|bank|notifications|security` trên mọi trang trong app. AppLayout đọc tham số này, bỏ nó khi đóng hộp thoại. Danh sách mục nằm trong `components/profile/sections.ts`.
  - Trang xác minh email và gợi ý "thêm tài khoản nhận tiền" ở tab Chi tiêu đều trỏ tới link này.
  - Hộp thoại hồ sơ chia thành Tabs: Hồ sơ · Nhận tiền · Thông báo · Bảo mật.
- Landing:
  - Gộp #about và #features thành một mục `#features` "Cách nhóm bạn dùng" (4 bước). Nav còn "Cách dùng" và "Liên hệ".
  - Mockup hero dựng từ component thật.
  - Đã bỏ "số 1", trust bar, MinIO và Tactile Clay.
  - **Chủ dự án cần xác nhận:** footer vẫn ghi nguyên "Công Ty TNHH Mai Mối". Bỏ chữ "TNHH" nếu đây không phải pháp nhân đã đăng ký.
- `ROLE_LABEL.VIEWER` đổi từ "Chỉ xem" thành "Người xem", để câu "Đặt làm Người xem" đọc tự nhiên. Mọi chuỗi vai trò lấy từ `ROLE_LABEL`.
- `lib/tripContent.ts`: `tone` của các loại lấy từ token `avatar-*`.
- Album: poll mỗi 60 giây (`hooks/useAlbum.ts`), hiện 24 ảnh rồi "Xem thêm".
- Esc trong ô tìm ngân hàng chỉ đóng danh sách gợi ý, không đóng hộp thoại hồ sơ.
- Lịch trình: viên ngày không còn `sticky`, vì đè lên thanh tab vốn đã dính từ Phase 2. Kéo thả xuống viên ngày khi đang cuộn trang dựa vào auto-scroll của dnd-kit.
- **Lỗi tràn ngang 360px (P3-NR-02 và tương tự) có nguyên nhân chung:**
  - Lưới `grid` không khai báo cột thì cột ngầm định là `auto`, giãn theo nội dung rộng nhất (thanh tab cuộn ngang, bảng lịch rảnh, TabsList trong dialog).
  - Sửa bằng một quy tắc base trong `index.css`: `.grid { grid-template-columns: minmax(0, 1fr) }`. Class `grid-cols-*` vẫn ghi đè được.
  - Đã đo lại trên trình duyệt: 0 phần tử tràn khung ở Lịch trình, Lịch rảnh, Chi tiêu và Hồ sơ.
- Đã xóa hẳn token `shadow-clay-*`, `--clay-*` và khai báo của chúng trong `cn`, vì không còn chỗ nào dùng.

**Số liệu sau Phase 3** (so với mục 0.3):
- Palette viết cứng: khoảng 290 → 20. Còn lại 18 chỗ trong `lib/covers.ts` (gradient ảnh bìa mặc định, cố ý) và 2 chỗ trong hình trang trí.
- `shadow-clay`: 319 → 0. `backdrop-blur`: 35 → 2 (lớp phủ sau dialog).
- `bg-gradient`: khoảng 90 → 4 (ảnh bìa, lớp phủ ảnh).
- `hover:scale` / `active:scale` / `hover:-translate`: 87 → 3 (nút CTA nhấc 2px và TripCard trên thiết bị có hover).
- `animate-cascade` / `stagger-list`: 19 → 0. Emoji trong TSX: khoảng 55 dòng → 0.
- `aria-describedby`: 0 → 12, cộng phần FormField tự nối.

**Kiểm chứng:**
- `npm run build`, `lint` và `format:check` đều xanh.
- Chụp màn hình Chrome headless ở 360px, tải thẳng ở 360px: landing, dashboard, lịch trình, chi tiêu, checklist, lịch rảnh, ý tưởng, phòng, album, hồ sơ `?profile=bank`.
- **Chưa kiểm tay:** kéo thả lịch trình, tô lịch rảnh bằng bàn phím, lưu và chia sẻ ảnh QR trên điện thoại thật, hoàn tác "Rảnh tất cả".

### 3.1 `/`: Landing (`pages/LandingPage.tsx`)
- [x] **P3-LD-01 · [T2/T4] Tuyên bố "số 1" không kiểm chứng được và trust bar giả** · Cao
  - `:263-266`, `:317-334`. Code: `Giải pháp du lịch nhóm số 1 cho hội bạn thân` / `<CheckCircle2 className="text-emerald-500" /><span>100% Miễn phí</span>` ×4
  - Vì sao: social proof bịa ra. Hero có 5 tầng tranh nhau: badge, h1, 2 CTA, form mã mời, trust bar.
  - Sửa: bỏ badge và trust bar, nói "miễn phí" bằng một dòng nhỏ dưới CTA. Form "Có mã mời?" lên làm CTA thứ hai thay cho "Tìm hiểu thêm", vì người được mời là nhóm truy cập landing nhiều nhất.

- [x] **P3-LD-02 · [T1] Chữ gradient trong H1, quầng sáng blur sau mockup** · Trung bình
  - `:270` (`from-rose-500 via-pink-500 to-violet-500 bg-clip-text text-transparent`), `:341` (`from-rose-200/40 via-amber-200/30 to-violet-200/40 blur-xl`).
  - Sửa: phần nhấn mạnh dùng `text-primary`, xóa div aura.

- [x] **P3-LD-03 · [T4] Mockup hero mâu thuẫn số liệu, link giả, chữ 10–11px, toàn màu viết cứng** · Trung bình
  - `:344`, `:349`, `:356`, `:371-384`, `:392`, `:403`, `:407`, `:433`. Ví dụ: ghi "100% rảnh" ngay cạnh "7/8 rảnh"; "Xem chi tiết >" trông như link nhưng không bấm được; card có `hover:scale-[1.01]`; emoji 🌸.
  - Sửa: số liệu phải khớp nhau. Bỏ link giả và hover. Chữ tối thiểu `text-xs`. Dựng mockup từ component thật (`StatusBadge`, `TripCover`, `CountdownLabel`) hoặc ảnh chụp màn hình thật.

- [x] **P3-LD-04 · [T2] Mục #about và #features kể lại cùng nội dung theo cùng một khuôn template** · Cao
  - `:452-507` so với `:513-623` (và #contact). Code: `<Badge>Về Team Trip Planner</Badge><h2>` + 3 card, rồi `<Badge>Tính năng cốt lõi</Badge><h2>` + 4 card
  - Vì sao: khuôn "eyebrow badge + h2 căn giữa + lưới icon-card" lặp 3 lần, ba tính năng được kể hai lần.
  - Sửa: gộp thành một section "Cách nhóm bạn dùng" theo luồng thật: gửi link mời → chấm ngày rảnh → chốt lịch trình → chia tiền. Mỗi bước kèm ảnh hoặc component thật, bố cục xen kẽ trái/phải. Bỏ eyebrow Badge.

- [x] **P3-LD-05 · [T4] Copy sai sự thật và lộ jargon nội bộ** · Cao
  - `:522` (`Thiết kế theo chuẩn Tactile Clay & Pill UI… tối ưu 100% cho điện thoại`), `:604-619` (`Google Drive & MinIO`), `:487`, `:542` (`Sắp xếp phòng ngủ thông minh`), cùng "Single Source of Truth" và "Brush Bar".
  - Vì sao: album chỉ lưu **link** Drive (không có scope Drive, MinIO chỉ chứa cover và avatar). Xếp phòng là thủ công. Tên design system và hạ tầng không có nghĩa gì với người dùng.
  - Sửa: viết lại đúng hành vi thật: "Gom link album Google Drive của cả nhóm, gắn theo từng ngày", "Chia phòng: mỗi người một phòng, không vượt sức chứa". Xóa câu `:522` và các badge công nghệ.

- [x] **P3-LD-06 · [T2/T3] Ô icon gradient trên mọi heading; card tĩnh nhấc lên khi hover; card blur trên video** · Trung bình
  - `:469`, `:482`, `:495`, `:529-531`, `:552-554`, `:575-577`, `:598-600`. Code: `hover:-translate-y-1` + `bg-gradient-to-br from-amber-300 to-orange-400 text-white`
  - Sửa: icon một màu `bg-primary/10 text-primary` (hoặc bỏ nếu đã có ảnh). Bỏ hover trên card không có link. `bg-card` đặc.

- [x] **P3-LD-07 · [T3] Ký tự "✓" làm icon, trộn với lucide; cụm "1 chạm" lặp 5 lần** · Thấp
  - `:546-547`, `:569-570`, `:592-593`, `:615-619`; "1 chạm" ở `:333`, `:547`, `:581`, `:608`, `:616`.
  - Sửa: thống nhất dùng `Check` của lucide (hoặc bỏ pill), viết lại để không lặp.

- [x] **P3-LD-08 · [T4] Số liệu thời gian bịa** · Thấp
  - `:477` ("15 giây chấm ngày rảnh"), `:503` ("ghi lại trong 5 giây"); `JoinPage.tsx:140` ("chỉ mất 30 giây").
  - Sửa: thay bằng mô tả hành động: "Kéo ngón tay qua các ngày để chấm rảnh/bận".

- [x] **P3-LD-09 · [T2/T4] Mục Liên hệ: card lồng card, nội dung giả hoặc lặp, pháp nhân có thể không có thật** · Trung bình
  - `:634-637`, `:644-701`, `:707-757`, `:774`. Ví dụ: "Công Ty TNHH Mai Mối", "Phiên bản 1.0", quote, email lặp 3 lần (`:673`, `:746`, `:752`).
  - Sửa: thu về một khối "Góp ý / báo lỗi" gồm 2 nút Zalo / Gmail và một dòng mailto. Chỉ ghi "TNHH" nếu đúng là pháp nhân đã đăng ký. *(Chủ dự án xác nhận.)*

- [x] **P3-LD-10 · [T5] Form mã mời dùng placeholder thay label, lỗi chỉ báo bằng toast** · Thấp
  - `:298-314`, `:62-70`. Ở 360px input chỉ rộng khoảng 180px nên placeholder bị cắt.
  - Sửa: label nhìn thấy được "Có mã mời?", placeholder "Mã hoặc link mời", lỗi inline có `role="alert"`.

### 3.2 `/login`, `/register`
- [x] **P3-AU-01 · [T4] Không có lối thoát khi quên mật khẩu** · Trung bình
  - `pages/LoginPage.tsx:68-80`. Sửa: dòng "Quên mật khẩu? Liên hệ…" (link `CONTACT_ZALO_URL`), gợi ý đăng nhập Google nếu tài khoản đã liên kết.

- [x] **P3-AU-02 · [T4/T5] Lỗi đăng nhập và đăng ký chỉ báo bằng toast** · Trung bình
  - `pages/LoginPage.tsx:36-40`, `RegisterPage.tsx:60-62` (`toast.error(getErrorMessage(error))`).
  - Sửa: thêm state `formError`, hiện `<p role="alert" className="text-sm text-destructive">` ngay trên nút submit.

- [x] **P3-AU-03 · [T4] Quy tắc username và mật khẩu chỉ hiện sau khi đã nhập sai** · Trung bình
  - `pages/RegisterPage.tsx:27-30`, `:91-121`.
  - Sửa: hint cố định dưới ô: "Không dấu, 3–30 ký tự (a-z, 0-9, . _)", "Ít nhất 8 ký tự". Cân nhắc tự bỏ dấu và chuyển chữ thường khi gõ.

- [x] **P3-AU-04 · [T3] Emoji nhấp nháy trong tiêu đề và toast** · Thấp
  - `LoginPage.tsx:49-52` (✨ `animate-pulse-gentle`), `RegisterPage.tsx:74` (🎉), `:54` (toast 🎉).
  - Sửa: tiêu đề "Đăng nhập" và "Tạo tài khoản", không emoji, không animation.

### 3.3 `/join/:code` (`pages/JoinPage.tsx`)
- [x] **P3-JN-01 · [T4] Ảnh bìa ở trang mời khác ảnh bìa sau khi vào nhóm** · Trung bình
  - `:96` `seed={code.length}`. TripCard và TripDetail dùng `seed={trip.id}`.
  - Sửa: invite preview trả thêm `tripId` (hoặc `coverSeed`), dùng cùng một seed.

- [x] **P3-JN-02 · [T4] Tên chuyến dài bị cắt trong cover `h-44`** · Trung bình
  - `:96-100`. Sửa: `min-h-44`, h1 thêm `line-clamp-3 break-words`.

- [x] **P3-JN-03 · [T4/T3] Lỗi mạng không có nút thử lại; emoji 🥲 bay lơ lửng** · Trung bình
  - `:65-84`, `:71`. Lỗi không phải `INVITE_NOT_FOUND` (mất mạng, 5xx) chỉ có nút "Về trang chủ", nên người được mời mất luôn link.
  - Sửa: thêm `Button onClick={() => preview.refetch()}>Thử lại`, dùng `EmptyState` (P1-43) với icon tĩnh `TicketX`. Với not-found, thêm ô nhập mã mới.

- [x] **P3-JN-04 · [T5] `disabled` trên `Button asChild` bọc `Link` không có tác dụng** · Thấp
  - `:133`, `:136`. Sửa: khi `status === 'loading'`, render `<Button disabled>` thật hoặc Skeleton.

- [x] **P3-JN-05 · [T3] Emoji trong CTA và toast** · Thấp
  - `:128` (`'Tham gia chuyến đi ✨'`), `:31` (`'Vào nhóm thành công! 🎉'`). Sửa: bỏ emoji, nếu cần thì dùng icon `ArrowRight`.

### 3.4 `/verify-email`, `/unsubscribe`
- [x] **P3-EM-01 · [T3/T5] Emoji làm icon trạng thái, không có spinner, không có `aria-live`** · Thấp
  - `pages/VerifyEmailPage.tsx:30-45`, `:51-53` (⏳); `pages/UnsubscribePage.tsx:25-39`, `:48-50` (📭 ✅).
  - Sửa: dùng `Loader2 animate-spin`, `MailCheck`, `MailX`, `MailMinus`, `CheckCircle2`, `AlertCircle`. Bọc tiêu đề và message trong `role="status" aria-live="polite"`.

- [x] **P3-EM-02 · [T4] Hướng dẫn khi lỗi không làm theo được ("Vào Hồ sơ → Thông báo"), có thể ra dấu ".."** · Trung bình
  - `pages/VerifyEmailPage.tsx:44`, `:54-57`. Hồ sơ là dialog không có route, và người mở link trên điện thoại có thể chưa đăng nhập.
  - Sửa: thêm CTA "Gửi lại link xác minh", trỏ tới `/trips?profile=notifications` (cần P3-PF-01), đi qua `loginPath(...)` nếu chưa đăng nhập. Lỗi tách thành một dòng riêng, không nối chuỗi.

- [ ] **P3-EM-03 · [T4] Xác nhận tắt email của một chuyến mà không nói tên chuyến** · Thấp *(làm một phần: người đã đăng nhập thấy tên chuyến; người chưa đăng nhập vẫn thấy câu chung (cần backend đưa tên chuyến vào token hoặc thêm endpoint xem trước công khai))*
  - `pages/UnsubscribePage.tsx:26`, `:78-79` (`'Tắt email của chuyến đi này?'`).
  - Sửa: thêm preview hoặc đưa `tripTitle` vào token để hiện: Tắt email của chuyến "Đà Lạt"?

### 3.5 `/trips`: Dashboard (`pages/DashboardPage.tsx`)
- [x] **P3-DB-01 · [T3] Stagger chạy lại mỗi lần quay về dashboard, thẻ thứ 10 trở đi mất khoảng 1,7s mới hiện** · Trung bình
  - `:90`, `:105` (`stagger-list`). Sửa: bỏ, hoặc chỉ chạy lần đầu trong phiên (theo P0-09).

- [x] **P3-DB-02 · [T4] 50 chuyến dồn chung một lưới, không nhóm, không sắp xếp, "Kỷ niệm" không giới hạn** · Trung bình
  - `:29-30`, `:89-95`. Sửa: sắp ONGOING → UPCOMING (theo `startDate` tăng dần) → PLANNING. Chuyến đang diễn ra làm nổi bật thành một thẻ lớn. Completed hiện 3 thẻ + nút "Xem tất cả (n)".

- [x] **P3-DB-03 · [T5/T2] Hai nút `size="lg"` chia đôi ở 360px, có thể tràn chữ, nặng ngang nhau** · Trung bình
  - `:43-52` (`grid grid-cols-2 … size="lg"`). *(Cần kiểm trên trình duyệt.)*
  - Sửa: "Tạo chuyến đi" là nút chính full-width; "Nhập mã mời" là nút `outline` hoặc `ghost` cỡ default.

- [x] **P3-DB-04 · [T4/T3] Empty state nhắc nhập mã mời nhưng không có nút; emoji 🧳 bay; viền rose viết cứng** · Trung bình
  - `:73-87`. Sửa: dùng `EmptyState` (P1-43), có cả hai CTA ("Tạo chuyến đi", "Nhập mã mời"), icon `Luggage` tĩnh.

- [x] **P3-DB-05 · [T3/T4] Lời chào 👋 nhấp nháy vô hạn, tên dài không truncate** · Thấp
  - `:36-38`. Sửa: bỏ dòng chào, hoặc giữ chữ tĩnh có `truncate`.

### 3.6 `/trips/:id`: khung nội dung và trạng thái của trang chuyến
- [x] **P3-TD-01 · [T3] Ba lớp animation chạy lại mỗi lần đổi tab, trễ cộng dồn khoảng 2–2,5s** · Cao
  - `pages/TripDetailPage.tsx:251-273` + `ui/tabs.tsx:84`. Gốc của các tab: `ExpensesTab.tsx:128`, `ChecklistTab.tsx:104`, `RoomsTab.tsx:80`, `AlbumTab.tsx:107`, `IdeasTab.tsx:28`, `AvailabilityTab`, `ItineraryTab.tsx:172`. Món vừa thêm cũng phải chờ trễ theo `nth-child`, nên toast "Đã thêm" hiện trước khi món đó xuất hiện.
  - Sửa: gỡ `animate-cascade` và `stagger-list` khỏi gốc mọi tab, chỉ giữ fade ở `TabsContent` (≤150ms). Không lồng stagger trong cascade.

- [x] **P3-TD-02 · [T3] Màn lỗi của cả chuyến dùng emoji 🗺️ bay lơ lửng** · Thấp
  - `pages/TripDetailPage.tsx:76`. Sửa: dùng `EmptyState` với icon `MapPinOff` hoặc `Lock` tĩnh. Với `NOT_TRIP_MEMBER`, thêm ô "Nhập mã mời" ngay tại chỗ.

### 3.7 Tab Lịch trình (`components/itinerary/*`)
- [x] **P3-LT-01 · [T3] `.stagger-list` ghi đè transform của dnd-kit, nên khi kéo các thẻ khác không dạt chỗ** · Cao
  - `components/itinerary/ItineraryTab.tsx:242` (`<ol className="grid gap-2.5 stagger-list">`) + `ItemCard.tsx:41` (`style={{ transform: CSS.Transform.toString(transform) }}`). Đã xác nhận trong code: keyframe cuối có `transform` và `fill-mode: both`.
  - Sửa: bỏ `stagger-list` khỏi `<ol>` sortable (hoặc animate `ItemCardBody` bên trong), cộng thêm P0-09.

- [x] **P3-LT-02 · [T3] Cả cụm nội dung ngày cascade lại mỗi lần chạm một viên ngày** · Trung bình
  - `ItineraryTab.tsx:190` (`<div key={day.id} className="grid gap-4 animate-cascade">`), lớp ngoài `:172`.
  - Sửa: bỏ `animate-cascade` ở `:190`. Nếu cần chuyển cảnh thì fade 150ms.

- [x] **P3-LT-03 · [T5] Tay nắm kéo 28×32px, nút ⋮ 34px, hai nút sát nhau** · Cao
  - `ItemCard.tsx:93` (`h-8 w-7 cursor-grab touch-none`), `:54` (`size="icon-sm"`).
  - Vì sao: trên mobile, tay nắm là cách duy nhất để kéo (TouchSensor delay 150ms).
  - Sửa: tay nắm `min-h-11 w-9` (hoặc dùng `touch-target`), menu là `RowMenuButton` (P1-45), `gap-2`.

- [x] **P3-LT-04 · [T3] Hover lift và scale trên thẻ không bấm được, xung đột với kéo thả** · Trung bình
  - `ItemCard.tsx:121-124`, `:140` (`hover:-translate-y-0.5 hover:shadow-clay-card-hover`, `group-hover:scale-105`, `isDragging && 'scale-95'`, `transition-all duration-300`).
  - Sửa: chỉ giữ `transition-shadow`. Hover chỉ dành cho tay nắm và link. `[Đổi SDD UI-3]` (§2.3 quy định hiệu ứng kéo thả: nghiêng, scale-105; có thể giữ riêng cho DragOverlay).

- [x] **P3-LT-05 · [T4] Ghi chú mất xuống dòng, URL dài tràn thẻ, emoji 📝** · Trung bình
  - `ItemCard.tsx:148`, `:164-165`. Sửa: `break-words` cho title và note, `whitespace-pre-line` cho note. 📝 thay bằng `StickyNote` hoặc bỏ.

- [x] **P3-LT-06 · [T1] DayPills: trạng thái được chọn là gradient rose viết cứng** · Trung bình
  - `DayPills.tsx:64`, `:67-68`. Sửa: dùng `SelectablePill` (P1-40).

- [x] **P3-LT-07 · [T3] Viên ngày khi kéo: `animate-pulse` + dashed + ring-offset + `scale-110` + ✨; ring bị cắt** · Trung bình
  - `DayPills.tsx:67-68`, `:94`, `:21-22`. Code: `droppable && 'ring-2 ring-rose-400 ring-offset-2 animate-pulse'`, `isOver && 'scale-110 ring-4'`, `'✨ Thả vào đây'`
  - Sửa: droppable dùng `border-dashed border-primary bg-primary/5`; isOver dùng `bg-primary text-primary-foreground`, không scale. Vùng cuộn thêm `py-2`. Bỏ ✨. `[Đổi SDD UI-3]`

- [x] **P3-LT-08 · [T4] Chuyến 30 ngày: scrollbar bị ẩn, không có fade, không tự cuộn tới ngày đang chọn** · Trung bình
  - `DayPills.tsx:21`, `:61`; toast "Xem" (`ItineraryTab.tsx:145`) đổi ngày nhưng viên ngày đó vẫn nằm khuất.
  - Sửa: `scrollIntoView({ inline: 'center', block: 'nearest' })` khi `selected` đổi, dùng `fade-x`, `min-w-20`. Khi có hơn 10 ngày, thêm nút "Ngày ▾" mở danh sách.

- [x] **P3-LT-09 · [T5] `role="tablist"` tự chế: không có phím mũi tên, không `aria-controls`; dự báo không đọc được; chữ 11px** · Trung bình
  - `DayPills.tsx:22`, `:56-58`, `:75`, `:93`. Sửa: dùng `Tabs` của Radix hoặc tự thêm roving tabindex. Thêm `sr-only` cho `forecast.label`, chữ dùng `text-xs`.

- [ ] **P3-LT-10 · [T2] Thời tiết, gợi ý, dress code, overflow và tổng chi phí đều là khối gradient "to tiếng", đẩy lịch trình xuống dưới fold** · Trung bình *(làm một phần: thời tiết và dress code đã gộp thành một dải `bg-card`; chưa có thao tác chạm để mở chi tiết)*
  - `ItineraryTab.tsx:192`, `:206-216`, `:271`; `DayWeatherCard.tsx:48`; `DressCodeCard.tsx:30-32` (thêm blob blur). Code: `from-sky-50/95 via-card/95 to-amber-50/90` / `from-rose-50/90 via-fuchsia-50/70 to-violet-50/90` / `from-emerald-50/90 via-teal-50/90 to-sky-50/90`
  - Sửa: gộp thời tiết và dress code thành **một dải tóm tắt** nền `bg-card` (icon, nhiệt độ, chip màu), chạm vào thì mở chi tiết. Tổng chi phí là một dòng `text-sm text-muted-foreground` ở cuối, không gradient, không blob.

- [x] **P3-LT-11 · [T1] Cảnh báo, chi phí, lỗi dùng amber/emerald/rose viết cứng** · Trung bình
  - `ItineraryTab.tsx:98`, `:111-112`, `:222-223`, `:271-273`; `ItemCard.tsx:170`. Sửa: dùng token `warning`, `money-*`, `destructive`; error dùng `TabErrorState` (P1-44).

- [x] **P3-LT-12 · [T4] Thời tiết không có skeleton, card hiện muộn đẩy nội dung xuống khoảng 100px** · Thấp
  - `DayWeatherCard.tsx:34`, `:37` (`if (!weather) return null`). Sửa: khi `isPending` và ngày nằm trong 16 ngày dự báo, render `Skeleton` cùng chiều cao.

- [x] **P3-LT-13 · [T5] Link "Ngày này ở nơi khác?" bị giấu trong dòng ghi công nguồn 11px, không có focus style** · Trung bình
  - `DayWeatherCard.tsx:89-102`. Sửa: tách thành `Button variant="ghost" size="sm"` có icon `MapPin` cạnh tên nơi. Dòng ghi công "Open-Meteo.com" giữ `text-xs` (bắt buộc theo CC BY 4.0, không được bỏ).

- [x] **P3-LT-14 · [T4/T5] Nút "Thêm "…" vào checklist" `whitespace-nowrap`, tràn ngang ở 360px, cao 28px** · Trung bình
  - `WeatherAdviceList.tsx:58-76` (`h-7 … text-xs`). Sửa: nhãn ngắn "+ Checklist" (tên món đã có trong câu gợi ý), `h-9`, `max-w-full`.

- [x] **P3-LT-15 · [T1] Mỗi loại gợi ý thời tiết một palette riêng (6 màu)** · Thấp
  - `WeatherAdviceList.tsx:9-16`, `:49` (`rounded-[20px]`); `WeatherIcon.tsx:17-28`; `DayWeatherCard.tsx:65`, `:71`, `:77`.
  - Sửa: một kiểu chung `bg-muted/60 text-foreground`, chỉ icon mang màu. STORM dùng `warning`.

- [x] **P3-LT-16 · [T3/T4] DressCodeCard: ✨ 📌, icon xoay, chip màu không bấm được nhưng phóng to khi hover, chủ đề bị `truncate`** · Thấp
  - `DressCodeCard.tsx:21-24`, `:56`, `:59` (`truncate` cho chủ đề dài tối đa 100 ký tự), `:83`, `:86`, `:103`.
  - Sửa: bỏ emoji và rotate. Chip chỉ cần `ring-1 ring-black/10`. Chủ đề dùng `line-clamp-2 break-words`. Ghi chú ngày dùng icon `Pin`.

- [x] **P3-LT-17 · [T5] Lưới 8 cột màu trong dialog làm mỗi ô còn khoảng 28px; ô được chọn scale đè lên ô bên cạnh** · Trung bình
  - `DressCodeDialog.tsx:135`, `:147-148`. Sửa: `grid-cols-6 sm:grid-cols-9`, ô `min-h-11`. Trạng thái chọn dùng `ring-2 ring-primary` + dấu check, không scale.

- [ ] **P3-LT-18 · [T2] Dialog gộp địa điểm với dress code, toast luôn báo "Đã lưu dress code"** · Thấp *(làm một phần: đã đổi tiêu đề, toast và autofocus ô địa điểm; vẫn chung một hộp thoại)*
  - `DressCodeDialog.tsx:95-96` (tiêu đề có ✨, mô tả "chụp ảnh cho xịn!"), `ItineraryTab.tsx:213`, `:297`.
  - Sửa: tiêu đề "Thông tin ngày", toast "Đã lưu". Mở từ thẻ thời tiết thì autofocus vào ô địa điểm (prop `focus="place"`).

- [x] **P3-LT-19 · [T5] Thông báo kéo thả của dnd-kit đọc bằng tiếng Anh kèm id kỹ thuật** · Thấp
  - `ItineraryTab.tsx:173-179` (không truyền `accessibility`). Sửa: truyền `announcements` và `screenReaderInstructions` bằng tiếng Việt, dùng tên hoạt động.

### 3.8 Tab Ngày rảnh (`components/availability/*`)
- [x] **P3-NR-01 · [T5] Ô lịch là `role="button"` nhưng không focus được, không dùng được bàn phím** · Cao
  - `AvailabilityGrid.tsx:107-127` (không có `tabIndex`/`onKeyDown`).
  - Sửa: hàng của mình render `<button type="button">` thật, Enter hoặc Space tô bằng cọ hiện tại, có focus ring. Ô của người khác dùng `role="img"` hoặc text `sr-only`. Có thể thêm điều hướng bằng phím mũi tên.

- [x] **P3-NR-02 · [T4] 15 thành viên ở 360px: chỉ thấy khoảng 3 cột ngày, header ngày không dính khi cuộn dọc** · Cao
  - `AvailabilityGrid.tsx:48-52` (cột tên `w-32`), `:86`; `AvailabilityTab.tsx:100` (Card `p-1` + CardContent `px-6`).
  - Sửa: trên mobile cột tên chỉ còn avatar và tên viết tắt (`w-14`, tên đầy đủ đặt `sr-only`). `CardContent className="px-0 sm:px-6"`. `thead th` dùng `sticky top-0` trong container `max-h-[70svh] overflow-auto`. Ô `size-9`.

- [x] **P3-NR-03 · [T1] Màu trạng thái viết cứng; "Rảnh" là ✓ trắng trên emerald-400 (khoảng 2:1); "Bận" trùng hue với primary** · Cao
  - `statusStyle.ts:6-24` (`bg-emerald-400 text-white`, `BUSY: bg-rose-200 text-rose-800`); `AvailabilityGrid.tsx:151-153` (rgb inline `rgb(16 185 129 / …)`, chữ trắng khi ratio > 0,5).
  - Sửa: dùng token `--avail-*` (P0-01), kiểm ≥ 3:1 cho ký hiệu và ≥ 4,5:1 cho số. Hàng tổng dùng `color-mix(in oklch, var(--avail-yes) X%, var(--card))` và đổi màu chữ theo ngưỡng tương phản. Ký hiệu dùng icon lucide `Check`, `HelpCircle`, `X`.

- [x] **P3-NR-04 · [T1] Swatch cọ lệch màu ô; cọ đang chọn tô coral thay vì màu trạng thái** · Trung bình
  - `BrushBar.tsx:7-9` (swatch `bg-rose-300`, ô `bg-rose-200`), `:47-49` (`bg-primary`).
  - Sửa: swatch lấy từ `STATUS_CELL`. Cọ đang chọn dùng `ring-2 ring-foreground` + nền màu trạng thái.

- [x] **P3-NR-05 · [T3] Thanh cọ (control chính) nhấp nhô liên tục** · Trung bình
  - `BrushBar.tsx:36` (`sticky bottom-4 … backdrop-blur-md transition-all animate-float-slow`), `:27-29`.
  - Sửa: bỏ `animate-float-slow` và `transition-all`, giữ sticky và bóng. `[Đổi SDD UI-2]` (§2.3 "Floating Pill Dock … nhấp nhô").

- [x] **P3-NR-06 · [T5] "Rảnh tất cả" cao 28px, ghi đè cả hàng ngay lập tức, không có hoàn tác** · Trung bình
  - `BrushBar.tsx:80-88` (`size="xs" … hover:scale-105 active:scale-95`); `AvailabilityTab.tsx:140`.
  - Sửa: dùng `size="sm"` kèm `touch-target`. Toast có action "Hoàn tác" khôi phục snapshot trước đó, hoặc đổi thành "Rảnh các ngày còn trống". Bỏ scale.

- [x] **P3-NR-07 · [T2/T3] Card gợi ý nhấn "tốt nhất" 4–5 lần (🥇 + ⭐ + viền amber + ✨ + Sparkles nhấp nháy); badge absolute đè AvatarGroup** · Trung bình
  - `SuggestionPanel.tsx:30` (`MEDALS = ['🥇','🥈','🥉']`), `:56`, `:64-69`, `:166-178`.
  - Sửa: giữ **một** tín hiệu (Badge inline "Phù hợp nhất"), thứ hạng ghi "1 · 2 · 3". Bỏ emoji, gradient và pulse. Badge không dùng absolute. `[Đổi SDD UI-2]`

- [x] **P3-NR-08 · [T2] Card lồng card, hover lift trên `<li>` không bấm được** · Thấp
  - `SuggestionPanel.tsx:164-166`; `LockedBanner.tsx:67`. Sửa: thẻ con dùng `bg-background/60 border`, không bóng, bỏ `hover:-translate-y-1`.

- [x] **P3-NR-09 · [T5] Nút ± số ngày 34px có `hover:scale-110 active:scale-90` chồng lên hiệu ứng của Button** · Thấp
  - `SuggestionPanel.tsx:78-101`. Sửa: `size="icon"`, bỏ scale.

- [x] **P3-NR-10 · [T3/T4] Header ngày đã chốt nhấp nháy; mô tả "cột tô đậm" sai vì chỉ header được tô** · Thấp
  - `AvailabilityGrid.tsx:62` (`animate-pulse-gentle`); `AvailabilityTab.tsx:109`.
  - Sửa: bỏ pulse. Các `td` trong khoảng đã chốt thêm `bg-primary/10`.

- [x] **P3-NR-11 · [T3] Emoji làm icon và tiêu đề (🗓️ bay, 🎨, "Bạn ✨", 🎉)** · Thấp
  - `AvailabilityTab.tsx:59-60`, `:104`; `AvailabilityGrid.tsx:94`; `LockedBanner.tsx:39`; `SuggestionPanel.tsx:56`.
  - Sửa: dùng `EmptyState` với `CalendarRange`; badge chốt dùng `CalendarCheck`; bỏ 🎨 và ✨.

- [ ] **P3-NR-12 · [T2] Chữ 10–11px dày đặc trong bảng ("+2?" 10px, opacity 90)** · Thấp *(làm một phần: chữ `text-xs`, hàng tổng chỉ còn số rảnh; chi tiết "có thể" mới có trong aria-label và title, chưa có sheet khi chạm)*
  - `AvailabilityGrid.tsx:65`, `:96`, `:163`; `LockedBanner.tsx:69`; `SuggestionPanel.tsx:170`.
  - Sửa: dùng `text-xs`. Hàng tổng chỉ hiện số rảnh; số "có thể" đưa vào sheet khi chạm.

- [x] **P3-NR-13 · [T5] `scrollbar-none` không tồn tại** · Thấp
  - `LockedBanner.tsx:59`. Sửa: dùng utility ở P0-14.

### 3.9 Tab Ý tưởng: Wishlist + Bình chọn (`IdeasTab`, `proposals/*`, `polls/*`)
- [x] **P3-YT-01 · [T5] Nút vote chỉ 26px, là hành động chính; cả hàng lựa chọn không bấm được** · Cao
  - `PollsTab.tsx:238-253` (`size-6.5`). Sửa: cả hàng là `<button role="checkbox" aria-checked>`, vòng tròn chỉ để báo trạng thái, hàng `min-h-12`. Poll đã đóng có nhãn rõ thay vì chỉ `opacity-60`.

- [ ] **P3-YT-02 · [T4] Tên lựa chọn bị `truncate`, ở 360px còn khoảng 100px** · Trung bình *(làm một phần: `line-clamp-2`, AvatarGroup ẩn trên mobile; danh sách người vote mới có trong aria-label và title, chưa có popover)*
  - `PollsTab.tsx:255-283`. Sửa: `line-clamp-2 break-words`. AvatarGroup `hidden sm:flex`; danh sách người vote hiện trong popover khi chạm vào số phiếu.

- [x] **P3-YT-03 · [T5] Xóa lựa chọn: nút X 28px, xóa ngay dù đã có phiếu** · Trung bình
  - `PollsTab.tsx:273-283`. Sửa: chuyển vào menu ⋮, dùng `ConfirmDialog` khi `voteCount > 0` hoặc toast có "Hoàn tác".

- [x] **P3-YT-04 · [T3] Cúp người thắng `animate-bounce` vô hạn** · Trung bình
  - `PollsTab.tsx:256`; `ClosePollDialog.tsx:94`. Sửa: bỏ animation, phân biệt bằng nhãn "Đã chốt" và viền.

- [x] **P3-YT-05 · [T2] Poll: card lồng card, thanh tiến độ gradient có inset shadow tùy ý** · Trung bình
  - `PollsTab.tsx:170` (`rounded-[20px] border-2 border-white/80 … shadow-clay-card`), `:220-236` (`from-rose-100/80 to-rose-200/70 shadow-[inset_…]`).
  - Sửa: hàng dùng `rounded-xl bg-muted/40`, không bóng. Thanh tiến độ phẳng `bg-primary/15` (người thắng `bg-warning/25`). Bỏ hover ở Card và hàng.

- [x] **P3-YT-06 · [T4] Menu poll đang mở có separator thừa ở đầu** · Thấp
  - `PollsTab.tsx:196-206`. Sửa: chỉ render separator cùng "Mở lại".

- [x] **P3-YT-07 · [T4] ClosePollDialog báo nhầm "Chốt ngày đi trước" khi đang tải; liệt kê cả ngày overflow** · Trung bình
  - `ClosePollDialog.tsx:50-51`, `:104`, `:125`, `:160-161`. Sửa: khi `itinerary.isPending` hiện Skeleton; dùng `days.filter((d) => !d.overflow)` (giống `ScheduleProposalDialog.tsx:53`).

- [x] **P3-YT-08 · [T2] Bộ chọn loại hoạt động có 4 bản copy**: xem P1-41 (thay ở 4 file khi component đã có).

- [x] **P3-YT-09 · [T4] Ghi chú đề xuất `line-clamp-2`, không mở rộng được** · Trung bình
  - `ProposalCard.tsx:86`. Sửa: nút "Xem thêm", hoặc chạm card mở sheet chi tiết chỉ đọc, thêm `break-words`.

- [x] **P3-YT-10 · [T5] Nút ⋮ đề xuất 34px; icon `SlidersHorizontal` mơ hồ cho "thêm chi tiết"** · Thấp
  - `ProposalCard.tsx:121`; `ProposalsPanel.tsx:117-126`. Sửa: dùng `RowMenuButton`; thay icon bằng link chữ "Thêm chi tiết…" dưới ô nhập.

- [x] **P3-YT-11 · [T3] Empty state emoji bay (💡, 🗳️), 🎉 trong toast** · Thấp
  - `ProposalsPanel.tsx:141`, `:150`, `:195`; `PollsTab.tsx:92`, `:120`. Sửa: dùng `EmptyState` với `Lightbulb` và `Vote`.

- [x] **P3-YT-12 · [T3] Segmented Wishlist/Bình chọn: tablist tự chế, gradient, cascade chạy lại mỗi lần đổi** · Thấp
  - `IdeasTab.tsx:29-54` (`role="tablist"`, `from-rose-500 to-rose-600`, `<div key={view} className="animate-cascade">`). Sửa: dùng `Tabs`/`TabsList` của Shadcn (bản nhỏ), bỏ cascade ở `:54`.

- [x] **P3-YT-13 · [T4] Skeleton là một khối 256px, không giống layout thật** · Thấp
  - `ProposalsPanel.tsx:51`; `PollsTab.tsx:49`. Sửa: dùng `TabSkeleton variant="form+list"` (P1-44).

### 3.10 Thành viên (`components/MemberList.tsx`)
- [x] **P3-TV-01 · [T4] Một vai trò hai tên: badge ghi "Thành viên", menu và dialog ghi "Biên tập viên"** · Trung bình
  - `MemberList.tsx:140`, `:160`, `:200`; `lib/labels.ts:5` (`EDITOR: 'Thành viên'`). Đã xác nhận.
  - Sửa: mọi chuỗi đều dùng `ROLE_LABEL[...]`, ví dụ `` `Đặt làm ${ROLE_LABEL.EDITOR}` ``, và thống nhất một thuật ngữ.

- [x] **P3-TV-02 · [T2] Mỗi hàng lặp cả badge vai trò lẫn câu mô tả vai trò; 15 hàng thành nhiễu; tên bị bóp còn khoảng 120px** · Trung bình
  - `MemberList.tsx:124-141`. Sửa: bỏ dòng mô tả (gom vào một đoạn giải thích quyền ở đầu card). Chỉ hiện badge cho OWNER và VIEWER. Sắp xếp OWNER → bạn → theo tên.

- [x] **P3-TV-03 · [T1] Badge vai trò viết cứng amber/rose/zinc; EDITOR (phổ biến nhất) mang màu nổi nhất** · Thấp
  - `MemberList.tsx:24-28`. Sửa: OWNER `secondary` + `Crown`, EDITOR không badge, VIEWER `bg-muted`. Bỏ bóng.

- [x] **P3-TV-04 · [T5/T4] Nút ⋮ 32px; OWNER không có lối "rời nhóm" và không được giải thích** · Thấp
  - `MemberList.tsx:146-151`, `:100-111`. Sửa: dùng `RowMenuButton`. Với OWNER, thêm dòng "Muốn rời nhóm? Chuyển quyền trưởng nhóm cho người khác trước."

### 3.11 Tab Chi phí (`components/expenses/*`)
- [x] **P3-CP-01 · [T4] Nút "Trả" và "Đã nhận" vẫn hiện khi đã có lần chuyển PENDING cùng cặp người, có thể trả hoặc tính tiền hai lần** · Cao
  - `ExpensesTab.tsx:163-230`. Đã đối chiếu: `backend/…/expense/ExpenseSummaryBuilder.java:57` chỉ tính CONFIRMED, nên `transfers` vẫn chứa khoản đã báo chuyển. Người nhận bấm "Đã nhận" sẽ tạo thêm một lần CONFIRMED mới, còn lần PENDING vẫn nằm đó. Xác nhận lần PENDING sau đó thì khoản này bị tính hai lần.
  - Sửa: backend trả thêm `pendingAmount` cho mỗi transfer (cách đúng), hoặc FE trừ tổng PENDING theo cặp `(from,to)`. Hết phần còn lại thì đổi nút thành "Đang chờ xác nhận". Người nhận đang có PENDING thì chỉ thấy "Xác nhận".

- [x] **P3-CP-02 · [T4] Số tiền quan trọng nhất bị `truncate` trong lưới 3 cột ở 360px** · Cao
  - `ExpensesTab.tsx:132-139`, `:372-378` (`grid grid-cols-3` + `truncate`). "12.500.000 ₫" hiện thành "12.500.…". Cắt bớt số tiền là lỗi dữ liệu.
  - Sửa: số dư của tôi làm hero (`text-2xl font-bold tabular-nums`: "Bạn cần trả 1.250.000 ₫" + nút "Xem cách trả"). "Tổng chi" và "Bạn đã trả" xuống thành dòng phụ. Không `truncate` số tiền.

- [x] **P3-CP-03 · [T4] Dòng "Số dư từng người" tràn hoặc bóp tên về 0 ở 360px** · Trung bình
  - `ExpensesTab.tsx:319-331` (ô net `w-28`). Sửa: hai tầng: tên + net (`tabular-nums whitespace-nowrap`, không width cố định) ở trên, "đã trả …" `text-xs` ở dưới.

- [x] **P3-CP-04 · [T2] Câu hỏi chính "ai nợ ai" nằm cuối trang, sau toàn bộ danh sách khoản chi** · Trung bình
  - `ExpensesTab.tsx:311-339`. Sửa: thứ tự mới: số dư của tôi → việc cần làm (Trả / Xác nhận) → số dư từng người (thu gọn được) → khoản chi (gộp theo ngày, thu gọn được).

- [x] **P3-CP-05 · [T2] Card lồng card: mỗi dòng thanh toán là một clay card trong Card** · Trung bình
  - `ExpensesTab.tsx:164`, `:201`, `:262`, `:319` (`rounded-[20px] border-2 border-amber-300 bg-amber-50/95 … shadow-clay-card` bên trong `rounded-[28px]`).
  - Sửa: list phẳng `divide-y`. Chỉ dòng "việc của tôi" có nền `bg-primary/5`. Bo góc dùng token.

- [x] **P3-CP-06 · [T1] Màu tiền và trạng thái viết cứng; "nợ" là rose-600 gần trùng màu primary** · Trung bình
  - `ExpensesTab.tsx:138`, `:164-167`, `:202`, `:326`; `ExpenseFormDialog.tsx:267`; `TransferQrDialog.tsx:111`, `:121`. Sửa: token `money-in`, `money-out`, `warning` (P0-01), giữ dấu +/−.

- [x] **P3-CP-07 · [T1] Nền gradient trang trí, mỗi tab một gradient riêng** · Trung bình
  - `ExpensesTab.tsx:130` (`from-emerald-50/90 via-sky-50/70 to-teal-50/90`), `ChecklistTab.tsx:105`, `AlbumTab.tsx:109`. Sửa: `bg-card`, hoặc thống nhất `bg-accent/40`.

- [x] **P3-CP-08 · [T4] Thanh tỷ lệ theo loại chi gần như vô hình, không chú thích, chỉ có `title`** · Trung bình
  - `ExpensesTab.tsx:141-151` (`tone.split(' ')[0]` ra `bg-orange-100`…). Sửa: thay bằng top 3 loại (icon, nhãn, số tiền, %). Nếu giữ thanh thì dùng `--chart-*`, thêm chú thích bằng chữ và `role="img"`.

- [x] **P3-CP-09 · [T4] Xác nhận, Từ chối, Hủy không khóa khi đang gửi; Từ chối và Đã nhận không hỏi lại** · Trung bình
  - `ExpensesTab.tsx:171`, `:175-183`, `:187`, `:218-226`. Sửa: `disabled` theo `isPending`/`variables`. Dùng `ConfirmDialog` có ghi số tiền và tên người. Nút X đổi thành nút chữ "Từ chối".

- [x] **P3-CP-10 · [T4] Lần chuyển đã CONFIRMED chỉ hiện con số đếm, không xem lại hay hủy được** · Trung bình
  - `ExpensesTab.tsx:334-336`. Sửa: mục "Lịch sử chuyển tiền" thu gọn được (từ → đến, số tiền, ngày, nút "Hủy" cho người nhận, vì backend đã cho phép).

- [x] **P3-CP-11 · [T5] Vùng chạm nhỏ: link hóa đơn 16px, nút ⋮ 34px, nút X** · Trung bình
  - `ExpensesTab.tsx:176`, `:277-279` (`hover:scale-110`), `:288`. Sửa: "Xem hóa đơn" chuyển vào menu, hoặc dùng `Button size="icon" variant="ghost"`; menu dùng `RowMenuButton`.

- [x] **P3-CP-12 · [T3] 💡, hover scale trên icon, ô Stat tĩnh nảy lên khi hover** · Thấp
  - `ExpensesTab.tsx:233`, `:263`, `:374`. Sửa: bỏ motion. 💡 thay bằng `Info`, câu gợi ý thành link mở Hồ sơ → Nhận tiền.

- [x] **P3-CP-13 · [T2] Nhãn 11px in hoa màu muted** · Thấp
  - `ExpensesTab.tsx:283`, `:375`. Sửa: `text-xs`, không in hoa.

- [x] **P3-CP-14 · [T4] Chưa có khoản chi mà vẫn hiện ba ô "0 ₫" và "Bạn được nhận 0 ₫"** · Thấp
  - `ExpensesTab.tsx:130-139`. Sửa: ẩn thẻ khi chưa có khoản chi (dùng `EmptyState` + CTA). Khi `net === 0` thì ghi "Bạn đã cân bằng".

- [x] **P3-CP-15 · [T4] QR hiện trên chính điện thoại người trả nên không quét được; không copy được số tiền và nội dung** · Cao
  - `TransferQrDialog.tsx:92-118` (chỉ "Số TK" có nút Copy, ở `:104-112`).
  - Sửa: nút "Lưu ảnh QR" (data URL hoặc `navigator.share` với file) để dùng "Quét từ ảnh" trong app ngân hàng. Thêm nút Copy cho số tiền (chỉ chữ số) và nội dung chuyển khoản. Nội dung thêm `break-all`.

- [x] **P3-CP-16 · [T3] Khung QR phóng to khi hover, viền 4px + ring + bóng hover bật sẵn** · Thấp
  - `TransferQrDialog.tsx:92`. Sửa: `rounded-2xl border bg-white p-3`. `[Đổi SDD UI-4]` (§2.3 "Khung tranh VietQR").

- [x] **P3-CP-17 · [T5] Chip chọn người chia: trạng thái tắt mờ 60% nên tương phản dưới 3:1, cao khoảng 32px, chỉ phân biệt bằng màu** · Trung bình
  - `ExpenseFormDialog.tsx:218-232`, chip loại chi `:159-174`. Sửa: dùng `SelectablePill` (P1-40), chip tắt giữ `text-foreground`, chip bật có icon `Check`, `min-h-11`.

- [x] **P3-CP-18 · [T5] "Chia không đều" là checkbox native 16px; nút gỡ ảnh hóa đơn khoảng 20px** · Trung bình
  - `ExpenseFormDialog.tsx:201-209`, `:284-291`. Sửa: segmented "Chia đều | Tự nhập" (`ToggleGroup`); nút gỡ ảnh ≥ 32px hoặc nút chữ "Bỏ ảnh".

- [x] **P3-CP-19 · [T5] Ô nhập tiền format lại ở mỗi lần gõ, con trỏ nhảy về cuối** · Trung bình
  - `ExpenseFormDialog.tsx:140-142`, `:262-263` (`value={fmt(amount)} onChange={… digitsOnly …}`). Sửa: giữ vị trí con trỏ (đếm số chữ số bên trái caret, rồi `setSelectionRange`), hoặc chỉ format khi `onBlur`. Thêm `inputMode="numeric"`.

- [x] **P3-CP-20 · [T5] Form dài (15 người, tự nhập) mà footer không dính; ô "Người trả" bị khóa không giải thích** · Thấp
  - `ExpenseFormDialog.tsx:180`, `:296-303`. Sửa: dùng footer sticky (P1-09). Dưới select thêm dòng "Chỉ trưởng nhóm ghi hộ được người khác".

### 3.12 Tab Checklist (`components/checklist/*`)
- [x] **P3-CL-01 · [T4] 50 món: món đã xong nằm lẫn với món chưa xong, không thu gọn được** · Trung bình
  - `ChecklistTab.tsx:176-282`. Sửa: trong mỗi nhóm, đưa món chưa xong lên trước, gom món đã xong vào "Đã xong (n)" thu gọn được. Dòng dùng `divide-y`, không bóng riêng từng dòng.

- [x] **P3-CL-02 · [T4] Trên mobile người mang chỉ hiện avatar 1 chữ cái ("Linh" và "Lan" đều ra "L")** · Trung bình
  - `ChecklistTab.tsx:216-225` (`hidden … sm:inline`). Sửa: dòng phụ `text-xs` "Linh mang" hoặc "**Bạn** mang", avatar có `aria-label`.

- [x] **P3-CL-03 · [T1] Nút "Tôi mang" và chip lọc dùng rose và gradient viết cứng** · Trung bình
  - `ChecklistTab.tsx:111`, `:158`, `:182`, `:197`, `:230`. Sửa: "Tôi mang" dùng `variant="outline"` theo token; chip lọc dùng `FilterChips` (P1-42).

- [x] **P3-CL-04 · [T5] Bộ lọc `role="radio"` không có phím mũi tên, cao khoảng 30px**: xem P1-42 (thay ở `:147-165`).

- [x] **P3-CL-05 · [T5] Form thêm món ở 360px: ô nhập còn khoảng 128px** · Thấp
  - `ChecklistTab.tsx:120-144` (`SelectTrigger w-36`). Sửa: dưới `sm` xếp thành 2 hàng, placeholder ngắn lại.

- [x] **P3-CL-06 · [T3] Toast có 🙌; nút ⋮ 34px có viền và bóng** · Thấp
  - `ChecklistTab.tsx:233`, `:244-251`. Sửa: bỏ emoji, dùng `RowMenuButton`.

### 3.13 Tab Phòng (`components/rooms/RoomsTab.tsx`)
- [x] **P3-PH-01 · [T2] Mỗi phòng một CTA rose to bằng nhau; phòng của mình chồng 4 lớp hiệu ứng** · Trung bình
  - `:113-118` (`ring-2 ring-primary border-primary/50 bg-gradient-to-br from-rose-50/50 …`), `:188-203`. Sửa: phòng của mình chỉ cần `border-primary` + badge "Phòng của bạn". Nút vào phòng dùng `outline`. Đã có phòng thì đổi thành link phụ "Chuyển sang đây". Phòng đầy thì ẩn nút.

- [x] **P3-PH-02 · [T1] Badge sức chứa rose/emerald viết cứng; "đầy" không phải lỗi** · Thấp
  - `:127-137`. Sửa: còn chỗ dùng `bg-muted`, đầy dùng `warning-soft`.

- [x] **P3-PH-03 · [T5] Menu từng thành viên trong phòng chỉ 28px** · Trung bình
  - `:291` (`size="icon-xs"`). Sửa: cả dòng là trigger, hoặc dùng `RowMenuButton`.

- [x] **P3-PH-04 · [T5] Pill "Bạn chưa có phòng…" gãy thành 2–3 dòng trong khung `rounded-full`** · Thấp
  - `:81-97`. Sửa: dòng `text-sm` thường, cho phép `flex-wrap`.

- [x] **P3-PH-05 · [T3/T4] Icon bay ở empty state; không có CTA tại chỗ** · Thấp
  - `:101` (`text-rose-300 animate-float-slow`). Sửa: dùng `EmptyState`; khi `canEdit` thì có nút "Thêm phòng".

- [x] **P3-PH-06 · [T4] Form phòng không có nút Hủy; tên trống thì im lặng; lỗi 409 chỉ báo bằng toast** · Thấp
  - `:355`, `:385-389`. Sửa: thêm Hủy, dùng `FormField error` + `getFieldErrors`.

### 3.14 Tab Album (`components/album/AlbumTab.tsx`)
- [x] **P3-AL-01 · [T2] Ảnh (nội dung chính) bị đẩy xuống dưới hai card công cụ** · Trung bình
  - `:108-207`, `:234-245`. Sửa: lưới ảnh lên đầu. Thư mục Drive thu thành một dòng (nút "Mở Drive"). "Thêm ảnh" thành nút mở dialog hoặc sheet.

- [x] **P3-AL-02 · [T1] Nút Drive gradient xanh ngoài palette, card gradient sky/indigo/violet** · Trung bình
  - `:109`, `:113`, `:130` (`bg-gradient-to-r from-blue-500 to-indigo-600 … border-2 border-blue-300`). Sửa: `<Button asChild>` mặc định hoặc `outline`, card dùng `bg-card`.

- [x] **P3-AL-03 · [T3] Ô ảnh hover vừa nhấc, vừa xoay, vừa zoom** · Trung bình
  - `:289`, `:302` (`hover:-translate-y-1.5 hover:rotate-1 …`, `group-hover:scale-108`). Sửa: tối đa `hover:brightness-95`, bọc trong `@media(hover:hover)` và `motion-safe:`. `[Đổi SDD UI-5]` (§ ảnh "nhấc bồng … rotate-1").

- [x] **P3-AL-04 · [T4] 200 ảnh render hết một lúc, poll 15s re-render cả lưới, có `stagger-list`** · Trung bình
  - `:240-244`. Sửa: 24 ảnh + "Xem thêm" (hoặc `content-visibility: auto`), bỏ `stagger-list`. Album dùng `refetchInterval` thưa hơn.

- [x] **P3-AL-05 · [T4] Lớp gradient đen phủ đáy mọi ảnh kể cả khi không có caption; chữ 11px** · Thấp
  - `:307-310`. Sửa: chỉ render khi có `dayIndex` hoặc `caption`, bỏ `rounded-b-[22px]`, dùng `text-xs`.

- [x] **P3-AL-06 · [T5] Nút ⋮ trên ảnh 28px; mọi ảnh có cùng tên truy cập** · Thấp
  - `:299`, `:314-321` (`alt={photo.caption ?? 'Ảnh trong album'}`). Sửa: nút `size-10` có nền rõ; alt dạng "Ảnh {n} · Ngày {d}".

- [x] **P3-AL-07 · [T5] Iframe Drive cao cố định 480px trên mobile, chiếm luôn thao tác cuộn** · Thấp
  - `:144-148` (`h-[480px] rounded-[24px]`). Sửa: `h-[60svh] max-h-[480px]`. Dưới `sm`, ẩn "Xem trong app" và mở Drive ra ngoài.

- [x] **P3-AL-08 · [T3] Emoji 📸 trong empty state, không có CTA** · Thấp
  - `:237`. Sửa: dùng `EmptyState` với icon `Images` + nút "Thêm ảnh".

### 3.15 Dialog tạo / sửa chuyến (`components/TripFormDialog.tsx`)
- [x] **P3-TF-01 · [T3] Emoji ✨ trong tiêu đề** · Thấp
  - `:126` (`'Tạo chuyến đi mới ✨'`). Sửa: bỏ.

- [x] **P3-TF-02 · [T5] "Khoảng ngày dự kiến" và "Ảnh bìa" là `<p>`, không gắn với control; lỗi ngày không có `aria-describedby`; footer không dính** · Thấp
  - `:158-185`, `:198-205`. Sửa: dùng `<fieldset><legend>`, FormField theo P1-33, footer sticky theo P1-09.

### 3.16 Hồ sơ cá nhân (`ProfileDialog`, `BankAccountSection`, `NotificationSection`, `GoogleLinkSection`, `SessionSecuritySection`)
- [x] **P3-PF-01 · [T2/T5] Năm khu chức năng trong một dialog cuộn (cao 3–4 màn hình), nút "Lưu" hồ sơ lửng giữa, card lồng card, không có deep link** · Cao
  - `components/ProfileDialog.tsx:33-42`, `:113-117` (`max-h-[92svh] overflow-y-auto`; mỗi khu `rounded-[24px] border-2 shadow-clay-card` trong dialog `rounded-[32px] shadow-clay-dock`).
  - Vì sao: không biết nút "Lưu" nào lưu phần nào. `VerifyEmailPage` bảo "Vào Hồ sơ → Thông báo" nhưng không có đường dẫn tới đó.
  - Sửa: chia `Tabs` (Hồ sơ · Nhận tiền · Thông báo · Bảo mật), hoặc thành trang `/profile` (bottom sheet trên mobile). Mỗi phần có nút lưu riêng, dùng `divide-y` thay card. Mở được bằng `?profile=notifications`.

- [x] **P3-PF-02 · [T4] Ô URL ảnh đại diện thô lộ ra cạnh nút tải ảnh; không có "Xóa ảnh"** · Thấp
  - `ProfileDialog.tsx:98-107`. Sửa: ẩn sau "Dùng link ảnh" dạng collapsible, thêm nút "Xóa ảnh" để quay về avatar chữ cái.

- [x] **P3-PF-03 · [T5] Chọn ngân hàng trong khoảng 60 mục, không có ô tìm; lỗi tải thì select chỉ trống** · Trung bình
  - `BankAccountSection.tsx:43-54`. Sửa: Combobox có ô tìm theo tên hoặc BIN, ngân hàng phổ biến lên đầu. Khi `isError` hiện thông báo kèm "Thử lại".

- [x] **P3-PF-04 · [T4] Lỗi thiếu trường ngân hàng chỉ báo bằng toast** · Thấp
  - `BankAccountSection.tsx:25-28`. Sửa: lỗi theo từng trường qua `FormField`, focus vào trường lỗi đầu tiên.

- [x] **P3-PF-05 · [T1] Thông báo trạng thái amber/emerald viết cứng** · Thấp
  - `NotificationSection.tsx:66`, `:162`; `GoogleLinkSection.tsx:28`. Sửa: token `warning` và `success`.

- [x] **P3-PF-06 · [T4] Gỡ email thông báo và hủy liên kết Google chạy ngay, không hỏi lại** · Thấp
  - `NotificationSection.tsx:172-185`; `GoogleLinkSection.tsx:32-44`. Sửa: dùng `ConfirmDialog` (như `SessionSecuritySection` đã làm), nút màu `text-destructive`.

---

## Phụ lục: Tóm tắt theo phase

| Phase | Số mục | Mức Cao |
|---|---|---|
| 0: Theme, CSS gốc, token | 16 | P0-01, 02, 03, 05, 09, 12, 13 |
| 1: Component dùng chung | 45 (kể cả 7 component mới) | P1-01, 03, 05, 07, 30 |
| 2: Layout khung | 14 | P2-01 |
| 3: Màn hình (16 nhóm route/feature) | 126 |
| **Tổng** | **201** | | LD-01, LD-04, LD-05, TD-01, LT-01, LT-03, NR-01, NR-02, NR-03, YT-01, CP-01, CP-02, CP-15, PF-01 |

**Mẫu lặp lại nhiều nhất** (sửa gốc ở Phase 0–1, Phase 3 chỉ thay class):
1. Palette viết cứng thay vì token (P0-01).
2. Clay shadow trên mọi phần tử, nên mất phân cấp (P0-05, P1-01, P1-12).
3. Kính mờ là mặc định (P0-13, P1-05).
4. Entrance animation chạy lại mỗi lần render (P0-09).
5. Hover motion trên phần tử không bấm được (P0-10).
6. Emoji dùng làm icon (P1-43 và các mục P3).
7. Vùng chạm dưới 44px (P0-14, P1-03, P1-45).
8. Control tự chế thiếu bàn phím (P1-40 đến P1-42).
9. Lỗi chỉ báo bằng toast (P1-33, P3-AU-02).
10. Chỉ thiết kế cho dữ liệu đẹp (tên dài, 15 người, 200 ảnh, 30 ngày).
