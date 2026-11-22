# SDD UI – Phase 2: Khảo sát Lịch rảnh (Availability Matrix & Floating BrushBar)

**Dự án:** Team Trip Planner  
**Chuyên đề:** Tactile Clay & Pill UI (Mức độ 3D đậm + Bay bổng sống động)  
**Phụ thuộc:** `docs/sdd-ui-phase-0.md`, `docs/sdd-ui-phase-1.md`  
**Phạm vi:**  
- `frontend/src/components/availability/AvailabilityTab.tsx`
- `frontend/src/components/availability/SuggestionPanel.tsx`
- `frontend/src/components/availability/AvailabilityGrid.tsx`
- `frontend/src/components/availability/BrushBar.tsx`
- `frontend/src/components/availability/LockedBanner.tsx`
- `frontend/src/components/availability/statusStyle.ts`

---

## 1. Mục tiêu & Trải nghiệm Bay bổng
Biến trải nghiệm tìm ngày đi chơi chung vốn khô khan thành một bảng lắp ghép tương tác vui vẻ:
- **Gợi ý ngày đẹp nhất ✨ (`SuggestionPanel`)**: Hiển thị như các tấm thẻ khen thưởng phồng 3D, phương án số 1 có hiệu ứng ánh sáng dịu nhấp nhô, bộ chọn "Đi mấy ngày?" dạng nút bấm tactile nảy đàn hồi.
- **Bảng ma trận (`AvailabilityGrid`)**: Từng ô lịch rảnh mô phỏng như những **viên sỏi màu đất sét gắn nổi**, phản hồi lập tức khi chạm hoặc quét cọ.
- **Thanh cọ vẽ Lơ lửng (`BrushBar`)**: Biến thành một **thanh dock viên thuốc bồng bềnh (Floating Pill Dock)** cố định đáy màn hình, chuyển động nhấp nhô nhẹ (`animate-float-slow`), mô phỏng như khay màu vẽ vật lý.

---

## 2. Chi tiết Thiết kế & Thay đổi Giao diện

### 2.1 Bộ Gợi ý Ngày Đẹp Nhất (`SuggestionPanel`)
- **Bộ đếm số ngày "− n ngày +"**:
  - Cụm điều khiển dạng viên nang: Nút trừ và cộng là 2 nút tròn 3D nảy đàn hồi, số ngày hiển thị to rõ ở giữa.
- **Thẻ gợi ý ngày đi**:
  - Thẻ Clay trắng phồng, viền highlight ánh vàng ấm áp cho phương án Top 1.
  - Tỷ lệ "8/10 rảnh" dạng badge pill xanh lá nổi.
  - Nút **"Chốt ngày này"** (dành cho OWNER): Nút Primary 3D kích thước lớn, hiệu ứng nâng bổng và rung nảy nhẹ khi rê chuột.

### 2.2 Bảng Lịch Rảnh (`AvailabilityGrid`)
- **Cột thành viên cố định bên trái**: Cố định (sticky) với bề mặt mềm mại, avatar bong bóng nổi.
- **Các ô trạng thái lịch**:
  - Kích thước ô tối ưu chạm ngón tay ($\ge 36 \times 36$px).
  - Trạng thái **Rảnh (✓)**: Viên sỏi xanh ngọc pastel, nổi 3D (`shadow-clay-badge`, viền sáng).
  - Trạng thái **Có thể (?)**: Viên sỏi vàng chanh dịu, nổi 3D.
  - Trạng thái **Bận (✕)**: Viên sỏi đỏ cam san hô nhạt.
  - Trạng thái **Chưa khai**: Rãnh chìm nét đứt mềm mại.
  - Hàng của chính mình: Viền sáng nổi bật, con trỏ dạng cọ vẽ, chạm/quét mượt mà không bị giật lag.
- **Hàng Thống kê theo ngày**:
  - Hiển thị tỷ lệ người rảnh dưới dạng viên nang màu xanh đậm dần theo tỷ lệ phần trăm.

### 2.3 Thanh Cọ Vẽ Lơ Lửng Bay Bổng (`BrushBar`)
- **Vị trí**: Nằm lơ lửng cách đáy màn hình 16px (trên mobile), có lớp bóng đổ 3D sâu (`shadow-clay-dock`).
- **Hình khối & Chuyển động**: Khay viên nang lớn (`rounded-full`), chuyển động nhấp nhô bồng bềnh nhẹ nhàng (`animate-float-slow`).
- **Các đầu cọ**:
  - Cọ Rảnh, Có thể, Bận, Xóa: Các nút tròn dạng pill.
  - Cọ đang chọn: Phồng to và lún sâu (`scale-105`, viền sáng nổi bật).
  - Nút nhanh "Rảnh tất cả": Pill chip nhỏ gắn ở mép khay.

### 2.4 Banner Đã Chốt (`LockedBanner`)
- Chiếc huy hiệu dạng thanh dài bo tròn mềm mại ăn mừng ngày chốt (`rounded-2xl`, màu gradient pastel ấm).
- Nút "Mở lại khảo sát" dạng pill outline 3D nhỏ gọn.

---

## 3. Tiêu chí Nghiệm thu Phase 2
1. Thao tác vẽ liên tục bằng ngón tay mượt mà 60fps trên mobile.
2. Dock cọ vẽ lơ lửng êm ái, không che khuất nội dung quan trọng khi cuộn trang.
3. Chạy `npm run build` và `npm run lint` đạt 100% không lỗi.
