# SDD UI – Phase 1: Auth & Không gian Chuyến đi (Dashboard & Header Bay bổng)

> **Cập nhật 26/11/2026:** nhiều hiệu ứng trong tài liệu này (nhấc/nảy khi hover, nhấp nhô, gradient, emoji, bóng clay) đã được bỏ hoặc giảm theo `docs/ui-slop-audit.md` (các mục gắn nhãn `[Đổi SDD UI-1]`). Khi hai tài liệu khác nhau, theo audit.

**Dự án:** Team Trip Planner  
**Chuyên đề:** Tactile Clay & Pill UI (Mức độ 3D đậm + Bay bổng sống động)  
**Phụ thuộc:** `docs/sdd-ui-phase-0.md` (Base UI Atoms & Floating Background)  
**Phạm vi:**  
- `frontend/src/components/AuthShell.tsx`
- `frontend/src/pages/LoginPage.tsx`, `RegisterPage.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/components/TripCard.tsx`
- `frontend/src/components/TripCover.tsx`
- `frontend/src/components/TripFormDialog.tsx`
- `frontend/src/components/JoinCodeDialog.tsx`
- `frontend/src/components/CountdownLabel.tsx`
- `frontend/src/components/StatusBadge.tsx`
- `frontend/src/components/InviteShare.tsx`
- `frontend/src/components/MemberList.tsx`
- `frontend/src/components/BrandLogo.tsx`
- `frontend/src/components/ProfileDialog.tsx`

---

## 1. Mục tiêu & Bầu không khí Bay bổng
Biến không gian nhập môn và điều hướng chuyến đi thành một chuyến hành trình sống động:
- **Nền trang trí bay bổng (`FloatingBackground`)**: Được tích hợp sẵn vào `AuthShell` và `AppLayout`, các quả cầu đất sét pastel và ngôi sao lấp lánh trôi bồng bềnh phía sau mọi nội dung.
- **Logo thương hiệu (`BrandLogo`)**: Chiếc máy bay giấy nghiêng cánh bồng bềnh (`animate-float-slow`), khi rê chuột sẽ nảy bật xoay nhẹ.
- **Thẻ Chuyến đi (`TripCard`)**: Khối đất sét múp míp với góc bo `rounded-[28px]`, khi rê chuột có hiệu ứng nâng bổng (`hover:-translate-y-2 hover:shadow-clay-card-hover`), đếm ngược ngày đi và huy hiệu trạng thái nổi bồng bềnh trên ảnh bìa.

---

## 2. Chi tiết Thiết kế & Thay đổi Giao diện

### 2.1 Màn hình Xác thực (`LoginPage`, `RegisterPage`, `AuthShell`)
- Khung `AuthShell`: Thẻ Clay trắng phồng lớn (`rounded-[32px]`, `shadow-clay-card`), viền sáng ngoài, đặt giữa không gian các khối đất sét pastel đang trôi nhấp nhô.
- Nút "Đăng nhập với Google": Thiết kế dạng Pill button lớn (`h-12 rounded-full`), đổ bóng 3D, bấm lún phím rõ rệt.
- Các trường nhập liệu: Rãnh chìm clay `shadow-clay-sunken`, icon mập mạp ở đầu.

### 2.2 Dashboard & Thẻ Chuyến đi (`TripCard`)
- **`TripCard`**:
  - Khối thẻ bo góc ngoại cỡ `rounded-[28px]` với hiệu ứng nâng bổng khi hover (`hover:-translate-y-2 hover:shadow-clay-card-hover`).
  - Lớp ảnh bìa `TripCover` bo tròn hài hòa bên trong thẻ (`rounded-t-[26px]`), lớp gradient tối êm dịu bảo đảm chữ trắng luôn nổi bật.
  - **`StatusBadge`**: Dạng viên nang nổi (`rounded-full`, bóng clay badge) gắn ở góc trên trái ảnh bìa.
  - **`CountdownLabel`**: Viên nang nhỏ gọn màu kem/cam với icon đồng hồ, hiển thị trạng thái "Ngày mai lên đường! 🎉" hoặc "Còn n ngày".
  - **Nhóm Avatar thành viên (`AvatarGroup`)**: Các avatar bong bóng nổi xếp chồng, có viền trắng 3D ngăn cách rõ nét.
- **Thanh Header Dashboard**:
  - Nút "+ Tạo chuyến đi" (Primary Pill 3D màu coral, bấm lún phím) và "Nhập mã mời" (Outline Pill 3D màu kem).

### 2.3 Khung Chi tiết Chuyến đi (`TripDetailPage` - Phần Header)
- **`InviteShare`**:
  - Hộp chứa link dạng rãnh trượt chìm, nút "Sao chép" và "Chia sẻ" là 2 nút viên thuốc nổi bật.
- **`MemberList`**:
  - Mỗi thành viên là một hàng bo góc mềm, avatar dạng bubble 3D, chip phân quyền OWNER/EDITOR dạng pill pastel.
- **Thanh điều hướng Tab chuyến đi**:
  - Khay viên nang (Pill dock) cuộn ngang mượt mà, tab đang chọn nổi cao lơ lửng.

---

## 3. Tiêu chí Nghiệm thu Phase 1
1. Hiển thị chuẩn nét trên mobile 375px (nút bấm ngón tay dễ chạm $\ge 44$px).
2. Tương thích toàn diện với `ImageUploadButton` (MinIO upload) cho ảnh bìa và avatar.
3. Chạy `npm run build` và `npm run lint` đạt 100% không lỗi.
