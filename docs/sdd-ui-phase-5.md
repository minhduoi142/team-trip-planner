# SDD UI – Phase 5: Album Ảnh & Phân chia Phòng (Rooms & Album Bay bổng)

**Dự án:** Team Trip Planner  
**Chuyên đề:** Tactile Clay & Pill UI (Mức độ 3D đậm + Bay bổng sống động)  
**Phụ thuộc:** `docs/sdd-ui-phase-0.md`, `docs/sdd-ui-phase-1.md`  
**Phạm vi:**  
- `frontend/src/components/rooms/RoomsTab.tsx`
- `frontend/src/components/album/AlbumTab.tsx`
- Khung xem trước chia sẻ mạng xã hội (`lib/covers.ts` & `InviteShare.tsx`)

---

## 1. Mục tiêu & Trải nghiệm Bay bổng
Hoàn thiện hai trải nghiệm gắn kết cuối cùng của chuyến đi: **Chỗ ở tiện nghi** và **Kỷ niệm trọn vẹn**:
- **Phân chia Phòng (`RoomsTab`)**: Mỗi phòng nghỉ mô phỏng như một **ngôi nhà tí hon 3D** ấm cúng, sức chứa hiển thị dạng badge viên thuốc, khay người chưa có phòng dạng rãnh trượt chìm.
- **Album Ảnh Google Drive (`AlbumTab`)**: Lưới ảnh kỷ niệm bo cong mềm mại, nghiêng góc nghệ thuật nhẹ khi hover, khung nhúng Drive như một màn hình tivi nhỏ xinh xắn.

---

## 2. Chi tiết Thiết kế & Thay đổi Giao diện

### 2.1 Tab Phân chia Phòng Nghỉ (`RoomsTab`)
- **Thẻ Phòng ("Ngôi nhà nhỏ")**:
  - Thẻ Clay trắng phồng lớn (`rounded-3xl`, `shadow-clay-card`).
  - Tiêu đề phòng (vd "Phòng 201 - View Biển 🌊") kèm badge sức chứa dạng viên thuốc (vd "2/3 người", khi đầy đổi sang màu xanh mint "Đã đủ").
  - Danh sách thành viên trong phòng: Các avatar bong bóng xếp quây quần ấm cúng.
  - Nút **"Vào phòng này"**: Nút Pill 3D màu coral, bấm lún phím thân thiện.
  - Menu chuyển phòng / rời phòng dạng popup tròn gọn gàng.
- **Khay "Chưa có phòng"**:
  - Nằm ở đáy tab dưới dạng một **rãnh đất sét chìm (Sunken tray)** `shadow-clay-sunken`.
  - Liệt kê các avatar thành viên còn bơ vơ với nút "Xếp vào..." dạng pill mini.
- **Nút "Thêm phòng"**: Nút viên thuốc lớn cho trưởng nhóm (OWNER/EDITOR).

### 2.2 Tab Album Kỷ niệm Google Drive (`AlbumTab`)
- **Khung Liên kết Drive**:
  - Nút lớn **"Mở trên Google Drive"** dạng pill 3D màu xanh Google nổi bật.
  - Khung nhúng xem trực tiếp (`embeddedfolderview` iframe) bo cong viền `rounded-2xl` có bóng chìm bao quanh.
- **Bộ lọc ảnh theo ngày**:
  - Thanh cuộn ngang các viên nang lọc ("Tất cả", "Ngày 1", "Ngày 2"...).
- **Lưới Ảnh Kỷ Niệm**:
  - Grid 2 cột trên điện thoại, 4 cột trên desktop.
  - Từng ảnh được bo cong góc `rounded-2xl`, khi rê chuột nhấc bồng nhẹ nhàng (`hover:-translate-y-1.5 hover:rotate-1`), bấm vào phóng to mở Drive ở tab mới.
  - Ô "Thêm ảnh từ Drive": Textarea dạng rãnh chìm rộng rãi, nút "Lưu ảnh" dạng pill primary.

---

## 3. Tiêu chí Nghiệm thu Phase 5
1. Hiển thị mượt mà danh sách phòng và thao tác chuyển phòng tức thì.
2. Iframe và ảnh Drive tải ổn định, không tràn layout trên màn hình hẹp (375px).
3. Chạy `npm run build` và `npm run lint` đạt 100% không lỗi.
