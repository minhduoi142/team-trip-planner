# SDD UI – Phase 4: Bình chọn & Chi tiêu Nhóm (Polls & Expenses + VietQR Bay bổng)

**Dự án:** Team Trip Planner  
**Chuyên đề:** Tactile Clay & Pill UI (Mức độ 3D đậm + Bay bổng sống động)  
**Phụ thuộc:** `docs/sdd-ui-phase-0.md`, `docs/sdd-ui-phase-1.md`  
**Phạm vi:**  
- `frontend/src/components/polls/PollsTab.tsx`
- `frontend/src/components/polls/ClosePollDialog.tsx`
- `frontend/src/components/expenses/ExpensesTab.tsx`
- `frontend/src/components/expenses/ExpenseFormDialog.tsx`
- `frontend/src/components/expenses/TransferQrDialog.tsx`
- `frontend/src/components/BankAccountSection.tsx`

---

## 1. Mục tiêu & Trải nghiệm Bay bổng
Giải quyết hai vấn đề nhạy cảm nhất của mọi chuyến đi: **Biểu quyết dân chủ** và **Chia tiền sòng phẳng minh bạch**:
- **Bình chọn (`PollsTab`)**: Các thanh tỷ lệ phiếu bầu mềm dẻo như thạch 3D, cúp vàng 🏆 lấp lánh nổi bật ở phương án thắng cuộc.
- **Chi tiêu (`ExpensesTab`)**: 3 khối capsule hiển thị tình trạng ví tiền (Bạn đã trả / Cần trả / Được nhận), danh sách gợi ý chuyển khoản rõ ràng.
- **Mã QR VietQR (`TransferQrDialog`)**: Khung tranh đất sét để bàn sang trọng, nút copy số tài khoản một chạm nảy bật.

---

## 2. Chi tiết Thiết kế & Thay đổi Giao diện

### 2.1 Tab Bình chọn Dân chủ (`PollsTab`)
- Thẻ bình chọn Clay trắng phồng lớn (`rounded-3xl`).
- Mỗi lựa chọn bình chọn:
  - Nút tick vote dạng viên sỏi 3D nảy đàn hồi khi bấm.
  - Thanh hiển thị tỷ lệ phần trăm: Rãnh chìm bo cong, dải màu bên trong phồng 3D, avatar người vote xếp chồng ở đuôi thanh.
  - Lựa chọn thắng cuộc: Huy hiệu cúp 🏆 3D phát sáng vàng nhạt kèm hiệu ứng nảy nhẹ.
- Dialog chốt bình chọn: Nút xác nhận chuyển thẳng thành hoạt động lịch trình dạng pill lớn.

### 2.2 Tab Chi tiêu & Bảng Cân đối Ví (`ExpensesTab`)
- **Thẻ Tổng quan Ví tiền**:
  - Chia làm 3 khối viên nang nổi bồng bềnh:
    - *Tổng chi chuyến đi*: Khối màu kem trung tính.
    - *Bạn đã chi*: Khối màu xanh mint dịu.
    - *Số dư của bạn (Cần trả hoặc Được nhận)*: Khối màu cam san hô hoặc xanh lục, số tiền định dạng to rõ ràng `1.250.000 ₫`.
- **Danh sách Chuyển khoản Quyết toán**:
  - Dòng chuyển khoản cho chính mình có nút **"Hiện QR"** nổi bật (Pill button màu coral 3D).
  - Trạng thái "Chờ xác nhận" có 2 nút Xác nhận (xanh) và Từ chối (đỏ nhạt) dạng viên kẹo mini.

### 2.3 Khung Tranh Chuyển khoản VietQR (`TransferQrDialog`)
- **Khung QR Đất Sét**:
  - Mã QR được đặt trong một khung viền trắng múp míp (`rounded-[28px]`, `shadow-clay-card`), có viền ánh sáng nổi bồng bềnh.
- **Thông tin nhận tiền**:
  - Ngân hàng, Số tài khoản, Tên chủ thẻ đặt trong một rãnh chìm sạch sẽ.
  - Nút **"Sao chép STK"** dạng pill chip nảy đàn hồi, copy xong đổi thành "Đã chép ✓".
- **Nút "Tôi đã chuyển"**:
  - Nút bấm Primary 3D kích thước lớn ở đáy dialog, bấm lún phím dứt khoát.

---

## 3. Tiêu chí Nghiệm thu Phase 4
1. Dialog VietQR hiển thị sắc nét, quét mã thành công trên ứng dụng ngân hàng di động.
2. Form chia không đều (`ExpenseFormDialog`) tính toán chính xác, các ô nhập tiền định dạng chuẩn tiếng Việt.
3. Chạy `npm run build` và `npm run lint` đạt 100% không lỗi.
