# SDD UI – Phase 3: Lịch trình & Chuẩn bị (Itinerary Timeline & Checklist Bay bổng)

> **Cập nhật 26/11/2026:** nhiều hiệu ứng trong tài liệu này (nhấc/nảy khi hover, nhấp nhô, gradient, emoji, bóng clay) đã được bỏ hoặc giảm theo `docs/ui-slop-audit.md` (các mục gắn nhãn `[Đổi SDD UI-3]`). Khi hai tài liệu khác nhau, theo audit.

**Dự án:** Team Trip Planner  
**Chuyên đề:** Tactile Clay & Pill UI (Mức độ 3D đậm + Bay bổng sống động)  
**Phụ thuộc:** `docs/sdd-ui-phase-0.md`, `docs/sdd-ui-phase-1.md`  
**Phạm vi:**  
- `frontend/src/components/itinerary/ItineraryTab.tsx`
- `frontend/src/components/itinerary/DayPills.tsx`
- `frontend/src/components/itinerary/DressCodeCard.tsx`
- `frontend/src/components/itinerary/DressCodeDialog.tsx`
- `frontend/src/components/itinerary/ItemCard.tsx`
- `frontend/src/components/itinerary/ItemFormDialog.tsx`
- `frontend/src/components/checklist/ChecklistTab.tsx`
- `frontend/src/components/checklist/ChecklistItemDialog.tsx`

---

## 1. Mục tiêu & Trải nghiệm Bay bổng
Lịch trình và khâu chuẩn bị đồ đạc là linh hồn của chuyến đi:
- **Thanh chọn ngày (`DayPills`)**: Dải cuộn các "viên kẹo" ngày đi. Viên ngày đang chọn nổi cao và có hiệu ứng bồng bềnh nhẹ. Khi kéo một hoạt động, các viên ngày khác lập tức trở thành **vùng hứng chìm (sunken drop target)** nhấp nháy phát sáng.
- **Thẻ Dress Code (`DressCodeCard`)**: Hiển thị bảng màu trang phục như những viên ngọc tròn 3D lấp lánh kèm ảnh mẫu bo cong mềm mại.
- **Dòng thời gian hoạt động (`ItemCard`)**: Các thẻ hoạt động nổi 3D. Khi kéo thả (`@dnd-kit`), thẻ nhấc bổng lên khỏi mặt phẳng, nghiêng nhẹ theo cử động tay kèm bóng đổ dài sống động (`shadow-2xl`).
- **Checklist Chuẩn bị đồ đạc (`ChecklistTab`)**: Checkbox viên sỏi đất sét nảy spring, thanh tiến độ rãnh chìm 3D.

---

## 2. Chi tiết Thiết kế & Thay đổi Giao diện

### 2.1 Thanh Chọn Ngày (`DayPills`)
- Dải cuộn ngang không lộ thanh cuộn (`scrollbar-none`).
- Từng viên ngày ("Ngày 1 · T6 04/01"):
  - Bình thường: Viên thuốc clay màu nhạt, bo tròn `rounded-full`.
  - Đang chọn: Phồng to 3D, nổi cao với bóng `shadow-clay-btn-primary`, chữ trắng nổi bật.
  - Khi đang kéo hoạt động khác: Chuyển thành rãnh chìm với viền nét đứt phát sáng, khi rê chuột vào sẽ nở rộng sẵn sàng đón nhận item.

### 2.2 Thẻ Dress Code (`DressCodeCard` & `DressCodeDialog`)
- Thẻ clay bo tròn `rounded-3xl`, viền sáng bóng.
- Chấm màu trang phục: Biến thành các **hạt cúc áo / viên ngọc tròn 3D** có ánh sáng lấp lánh nhẹ.
- Ảnh mẫu dress code (từ máy hoặc URL): Khung ảnh bo cong góc `rounded-2xl`, có nút phóng to xem chi tiết.
- Dialog chọn màu: Bảng chọn màu cố định hiển thị dạng các viên bi màu 3D nảy bật khi ấn chọn.

### 2.3 Thẻ Hoạt động Lịch trình (`ItemCard` & Dnd-kit)
- Thẻ hoạt động: Bo góc `rounded-2xl`, màu sắc nhẹ nhàng, cột giờ bên trái là một pill chip màu tương phản.
- Nút tay cầm kéo thả (`drag handle`): Icon 6 chấm mập mạp, chạm giữ trên điện thoại có phản hồi trực quan.
- **Hiệu ứng kéo thả vật lý bay bổng**:
  - Khi nhấc thẻ: Thẻ nghiêng nhẹ ~2.5 độ, phồng to `scale-105`, đổ bóng 3D dài xuống nền (`shadow-2xl`).
  - Vị trí trống chừa ra một rãnh đất sét chìm (`shadow-clay-sunken`).

### 2.4 Tab Chuẩn bị Đồ đạc (`ChecklistTab`)
- **Thanh tiến độ ("5/12 món")**: Rãnh chìm `rounded-full`, thanh chỉ báo màu xanh mint phồng mọng 3D.
- **Bộ lọc (Tất cả · Của tôi · Chưa ai nhận)**: Segmented control dạng viên thuốc nổi.
- **Mục đồ đạc**:
  - Checkbox đất sét hình viên sỏi tròn mềm mại: Khi tick chọn, dấu check nảy bật (`animate-spring`).
  - Nút "Tôi mang": Pill button nhỏ nhắn xinh xắn.
  - Ô thêm nhanh đồ đạc ở đầu: Rãnh chìm clay, gõ Enter thêm ngay với hiệu ứng trượt êm ái.

---

## 3. Tiêu chí Nghiệm thu Phase 3
1. Kéo thả hoạt động trong ngày và giữa các ngày (`DayPills`) trơn tru, không giật lag.
2. Checkbox phản hồi ngay lập tức (optimistic update).
3. Chạy `npm run build` và `npm run lint` đạt 100% không lỗi.
