# SDD UI – Phase 0: Design Tokens, Base UI Atoms & Bầu không khí Bay bổng (Tactile Clay & Floating Pill UI)

**Dự án:** Team Trip Planner  
**Chuyên đề:** Thiết kế lại toàn bộ giao diện sang phong cách **Tactile Clay & Pill UI (Mức độ 3D đậm + Bay bổng sống động)**  
**Phạm vi:** Frontend only (`frontend/src/index.css`, `frontend/src/components/ui/*`, `frontend/src/components/AppLayout.tsx`, `frontend/src/components/AuthShell.tsx`)  
**Trạng thái:** Đã hoàn thành (Phase 0)  

---

## 1. Triết lý Thiết kế: 3D Tactile Clay & Floating Pill UI

### 1.1 Khối Đất Sét 3D Phồng Mọng (Claymorphism)
- Bề mặt lì mờ (matte) mềm mại, màu sắc pastel tươi tắn, không chói lóa.
- Hệ thống đổ bóng 3 lớp (**Triple Clay Shadows**):
  - **Viền sáng góc trên-trái (`inset light highlight`)**: Ánh sáng phản quang viền cạnh trên tạo khối phồng 3D căng tròn.
  - **Viền tối góc dưới-phải (`inset inner shadow`)**: Bo cong khối vào trong, tạo chiều sâu thể tích thực tế.
  - **Bóng ngoài lan tỏa (`diffuse outer drop shadow`)**: Đẩy khối tách rời khỏi mặt nền (z-elevation).

### 1.2 Pill UI & Xúc giác Cơ học (Tactile Micro-interactions)
- Toàn bộ các nút bấm, badge, tabs, ô tìm kiếm đều dùng chuẩn viên thuốc `rounded-full`.
- **Cảm giác bấm lún chân thực**:
  - Hover: Nhấc bổng nhẹ nhàng (`-translate-y-1`, tăng bóng ngoài, scale 1.01).
  - Click / Chạm: **Lún sâu rõ rệt** (`translate-y-1`, shadow ngoài xẹp xuống, kích hoạt inset shadow đậm như ấn ngón tay vào khối đất sét dẻo).
  - Nhả phím: Bật nảy trở lại với đường cong đàn hồi (`cubic-bezier(0.34, 1.56, 0.64, 1)`).

### 1.3 Bầu không khí Bay bổng & Họa tiết Chuyển động Đậy nhẹ (Floating Ambient)
- **Họa tiết nền `clay-bg-dots`**: Lưới hạt chấm đất sét mịn màng tạo cảm giác như trang sổ tay scrapbook du lịch.
- **Vật trang trí 3D trôi bồng bềnh (`FloatingBackground`)**:
  - Quả cầu san hô (Coral Orb), viên thuốc tím (Lavender Capsule), viên sỏi bạc hà (Mint Pebble), ngôi sao 4 cánh (Golden Sparkle), đám mây kẹo bông.
  - Các phần tử chuyển động nhấp nhô độc lập bằng các keyframe êm ái (`animate-float-slow`, `animate-drift-sway`, `animate-pulse-gentle`, `animate-spin-slow`).
  - **Đảm bảo trải nghiệm người dùng**: Toàn bộ vật trang trí đều gắn `pointer-events-none select-none z-0`, tuyệt đối không cản trở thao tác click, nhập liệu hay đọc chữ.

---

## 2. Hệ thống Tokens & Keyframes (`src/index.css`)

### 2.1 Bộ Shadow Tokens 3D Clay
- `--shadow-clay-card`: `0 14px 28px -4px rgba(220, 175, 185, 0.28), 0 4px 10px -2px rgba(0, 0, 0, 0.04), inset 2px 3px 6px rgba(255, 255, 255, 0.95), inset -2px -3px 6px rgba(210, 160, 170, 0.1)`
- `--shadow-clay-card-hover`: `0 20px 38px -4px rgba(220, 165, 175, 0.38), 0 6px 14px -2px rgba(0, 0, 0, 0.06), inset 2px 3px 6px rgba(255, 255, 255, 1), inset -2px -3px 6px rgba(210, 160, 170, 0.12)`
- `--shadow-clay-btn-primary`: `0 8px 18px -2px color-mix(in oklch, var(--primary) 45%, transparent), 0 3px 6px -1px rgba(0, 0, 0, 0.08), inset 0 2.5px 3px rgba(255, 255, 255, 0.45), inset 0 -3.5px 4px rgba(0, 0, 0, 0.2)`
- `--shadow-clay-btn-secondary` / Outline: `0 6px 14px -2px rgba(220, 175, 185, 0.3), inset 0 2.5px 3px rgba(255, 255, 255, 0.95), inset 0 -2.5px 3px rgba(190, 145, 155, 0.14)`
- `--shadow-clay-pressed`: `0 2px 4px rgba(0, 0, 0, 0.08), inset 0 3px 6px rgba(0, 0, 0, 0.25)`
- `--shadow-clay-sunken`: `inset 2px 3px 6px rgba(190, 145, 155, 0.18), inset -1px -2px 4px rgba(255, 255, 255, 0.9)`
- `--shadow-clay-dock`: `0 16px 36px -6px rgba(210, 150, 165, 0.35), 0 6px 16px -3px rgba(0, 0, 0, 0.08), inset 0 2px 4px rgba(255, 255, 255, 0.95), inset 0 -2px 4px rgba(190, 140, 150, 0.1)`
- `--shadow-clay-floating`: `0 24px 48px -8px rgba(210, 150, 165, 0.42), 0 8px 18px -4px rgba(0, 0, 0, 0.08), inset 2px 3px 8px rgba(255, 255, 255, 1)`

### 2.2 Keyframes & Animation Utilities
- `@keyframes float-slow` (chu kỳ 8s): Trôi bồng bềnh lên 16px kèm xoay nhẹ 3°.
- `@keyframes float-medium` (chu kỳ 6s): Nhấp nhô 12px.
- `@keyframes float-reverse` (chu kỳ 9s): Nhấp nhô ngược chiều nhịp nhàng.
- `@keyframes drift-sway` (chu kỳ 11s): Trôi nghiêng theo đường lượn sóng.
- `@keyframes pulse-gentle` (chu kỳ 4s): Phập phồng to nhỏ dịu dàng.
- `@keyframes spin-slow` (chu kỳ 32s): Xoay tròn liên tục cho ngôi sao lấp lánh.
- Hỗ trợ chuẩn `prefers-reduced-motion`: Tự động ngắt chuyển động khi người dùng kích hoạt cài đặt giảm chuyển động trên hệ điều hành.

---

## 3. Quy chuẩn Base UI Components (`src/components/ui/`)

| Component | Hình khối & Độ nổi 3D | Cảm giác Xúc giác (Tactile) |
|---|---|---|
| **`Button`** | `rounded-full`, đổ bóng `shadow-clay-btn-*`, có viền highlight cong. | Hover nhấc bổng, click lún phím `translate-y-1 active:shadow-clay-pressed`. |
| **`Card`** | Bo góc ngoại cỡ `rounded-3xl` (~24–28px), đổ bóng `shadow-clay-card`. | Thẻ container múp míp, viền mảnh bảo vệ nét. |
| **`Input` / `Textarea`** | `Input` `rounded-full`, `Textarea` `rounded-2xl`, mặt rãnh chìm `shadow-clay-sunken`. | Gõ phím êm ái, focus sáng viền coral dịu mắt. |
| **`Badge`** | `rounded-full`, phồng nhẹ như hạt kẹo dẻo `shadow-clay-badge`. | Dùng cho trạng thái, đếm ngược, nhãn vai trò. |
| **`Tabs`** | `TabsList` rãnh chìm `rounded-full`, `TabsTrigger` nổi bồng bềnh khi active. | Chuyển tab nảy bật như nhấc phím đàn. |
| **`Dialog`** | Hộp thoại bo góc cực đại `rounded-[32px]`, đổ bóng nổi `shadow-clay-dock`. | Xuất hiện êm dịu trên nền mờ `backdrop-blur-xs`. |
| **`Checkbox`** | Nút bo góc tròn `rounded-lg`, viên sỏi đất sét nảy bật khi tick chọn. | Dấu check đậm nét nảy spring. |
| **`Progress`** | Rãnh trượt chìm `rounded-full`, thanh chỉ báo phồng mọng 3D. | Trực quan hóa tiến độ mượt mà. |
| **`FloatingBackground`** | Lớp trang trí vật lý 3D trôi bồng bềnh, họa tiết chấm pastel. | Tạo sinh khí bay bổng cho toàn bộ ứng dụng. |

---

## 4. Tiêu chí Nghiệm thu Phase 0
1. `npm run build` không lỗi TypeScript/Vite.
2. `npm run lint` đạt 100% sạch sẽ.
3. Không làm thay đổi bất kỳ prop/interface nào của base components.
4. Mọi chuyển động nền đạt 60fps, không gây giật lag trên mobile 375px.
