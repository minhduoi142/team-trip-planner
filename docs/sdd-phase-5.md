# SDD – PHASE 5: Album Drive, Chia phòng & Xem trước khi share link

**Dự án:** Team Trip Planner
**Phụ thuộc:** Phase 1 (trip, mã mời, `drive_folder_url`), Phase 3 (`trip_days`)
**Thời lượng dự kiến:** 1 ngày làm tập trung
**Trạng thái:** Đã triển khai (xem mục 9)

---

## 1. Mục tiêu & Phạm vi

### 1.1 Mục tiêu
1. **Album:**
   - Trưởng nhóm hoặc thành viên gắn **link thư mục Google Drive chung** của chuyến. App có nút "Mở trên Google Drive" và **xem thư mục ngay trong app** (iframe chế độ lưới).
   - Mọi người **dán link ảnh/video Drive**, được một hoặc nhiều link cùng lúc. Các link hiện thành **lưới ảnh nổi bật** (thumbnail), có chú thích, **gắn được với một ngày đi**, và lọc được theo ngày.
2. **Chia phòng:**
   - Tạo các phòng (tên, sức chứa, ghi chú) dùng cho cả chuyến. Mỗi người ở **tối đa 1 phòng**.
   - Ai cũng tự bấm **"Vào phòng này"** được. EDITOR+ xếp hoặc chuyển phòng hộ người khác.
3. **Xem trước khi share link:**
   - Link mời mới có dạng `…/share/{mã}`. Khi dán vào Zalo/Messenger/Facebook, link hiện **tiêu đề, mô tả và ảnh bìa** của chuyến. Người bấm vào được chuyển tiếp tới trang tham gia `/join/{mã}`.

### 1.2 Quyết định đã chốt với người dùng
| # | Quyết định |
|---|---|
| 1 | Album **giữ link Drive** (đã chốt từ đầu): có cả **link thư mục chung** lẫn **lưới ảnh nổi bật dán link**. Không upload ảnh album vào MinIO |
| 2 | Chia phòng: **1 bộ phòng cho cả chuyến** |
| 3 | **Chưa deploy**, chỉ chạy local. Khi deploy sau này: ảnh upload lưu ở **MinIO cùng hosting** (ghi nhận, chưa làm) |

### 1.3 Ngoài phạm vi
- **Deploy production:** khi nào deploy sẽ viết SDD riêng. Đã có sẵn `backend/Dockerfile`.
- Gọi Google Drive API: không xin quyền Drive, nên **không tự liệt kê file** trong thư mục, mọi người phải dán link.
- Bình luận hay thả cảm xúc dưới ảnh.
- Kéo thả xếp phòng (dùng nút bấm là đủ).

### 1.4 Lưu ý: xem trước link chỉ hoạt động khi đã deploy
Zalo/Messenger/Facebook tải thông tin xem trước từ **máy chủ của họ**, nên không đọc được `localhost`. Ở local chỉ kiểm tra được nội dung HTML và ảnh bằng `curl` hoặc trình duyệt. Hiệu ứng thật chỉ có khi đã deploy lên một tên miền công khai.

---

## 2. Cơ sở dữ liệu – `V6__album_rooms.sql`

```sql
-- ---------- Album: ảnh/video nổi bật = link Drive (chỉ lưu id file, URL suy ra)
CREATE TABLE album_photos (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    trip_id        BIGINT       NOT NULL,
    drive_file_id  VARCHAR(100) NOT NULL,
    caption        VARCHAR(300) NULL,
    added_by       BIGINT       NULL,
    created_at     DATETIME(6)  NOT NULL,
    CONSTRAINT pk_album_photos PRIMARY KEY (id),
    CONSTRAINT fk_album_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_album_added_by FOREIGN KEY (added_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT uq_album_file UNIQUE (trip_id, drive_file_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin;  -- id Drive phân biệt hoa thường

-- Gắn ảnh với 1 ngày đi (tùy chọn). Tách bảng: nếu đặt trip_day_id trong album_photos thì
-- trip_day_id → trip_id là phụ thuộc bắc cầu (vi phạm BCNF).
CREATE TABLE album_photo_days (
    photo_id     BIGINT NOT NULL,
    trip_day_id  BIGINT NOT NULL,
    CONSTRAINT pk_album_photo_days PRIMARY KEY (photo_id),
    CONSTRAINT fk_photo_days_photo FOREIGN KEY (photo_id) REFERENCES album_photos (id) ON DELETE CASCADE,
    CONSTRAINT fk_photo_days_day FOREIGN KEY (trip_day_id) REFERENCES trip_days (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------- Chia phòng (1 bộ phòng cho cả chuyến)
CREATE TABLE trip_rooms (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    trip_id     BIGINT       NOT NULL,
    name        VARCHAR(100) NOT NULL,
    capacity    TINYINT      NULL,            -- NULL = không giới hạn
    note        VARCHAR(300) NULL,
    created_at  DATETIME(6)  NOT NULL,
    CONSTRAINT pk_trip_rooms PRIMARY KEY (id),
    CONSTRAINT fk_rooms_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT uq_rooms_name UNIQUE (trip_id, name),
    CONSTRAINT chk_rooms_capacity CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 30)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- BCNF: (room_id, user_id), không lưu trip_id (suy ra qua room). "Mỗi người tối đa 1 phòng/chuyến"
-- và "phải là thành viên" do service kiểm tra trong cùng transaction.
CREATE TABLE room_assignments (
    room_id      BIGINT      NOT NULL,
    user_id      BIGINT      NOT NULL,
    assigned_at  DATETIME(6) NOT NULL,
    CONSTRAINT pk_room_assignments PRIMARY KEY (room_id, user_id),
    CONSTRAINT fk_assign_room FOREIGN KEY (room_id) REFERENCES trip_rooms (id) ON DELETE CASCADE,
    CONSTRAINT fk_assign_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
```

### 2.1 Ghi chú thiết kế
- **Chỉ lưu `drive_file_id`.** Mọi URL đều suy ra từ id:
  - xem: `https://drive.google.com/file/d/{id}/view`
  - thumbnail: `https://drive.google.com/thumbnail?id={id}&sz=w800`
  - thư mục nhúng: `https://drive.google.com/embeddedfolderview?id={folderId}#grid`
- `trips.drive_folder_url` (có từ V1) vẫn lưu nguyên link người dùng dán. Server kiểm tra link phải là link thư mục Drive.
- **Ràng buộc do service kiểm tra** (không đặt ở DB, để giữ BCNF):
  - ngày gắn với ảnh phải thuộc cùng chuyến;
  - mỗi người tối đa 1 phòng trong 1 chuyến;
  - không vượt sức chứa phòng;
  - người được xếp phòng phải là thành viên.
- **Xóa thành viên:** `TripMemberService.removeMembership` xóa xếp phòng của người đó trong chuyến. Ảnh họ đã thêm vẫn **giữ lại** (`added_by` giữ nguyên, ảnh là kỷ niệm chung).
- **Xóa trip:** album, phòng và xếp phòng tự xóa theo bằng CASCADE, không cần sửa `TripService.delete`.

---

## 3. Đọc link Drive (`DriveLinks`, class thuần, có unit test)
| Dạng link | Kết quả |
|---|---|
| `https://drive.google.com/file/d/{ID}/view?usp=sharing` | file `{ID}` |
| `https://drive.google.com/open?id={ID}` | file `{ID}` |
| `https://drive.google.com/uc?id={ID}&export=download` | file `{ID}` |
| `https://drive.google.com/thumbnail?id={ID}…` | file `{ID}` |
| `https://drive.google.com/drive/folders/{ID}?usp=…` (kể cả có `/u/0/`) | thư mục `{ID}` |
| Link khác (Google Photos, ảnh ngoài…) | lỗi `INVALID_DRIVE_LINK` |

- Id hợp lệ: `[A-Za-z0-9_-]{10,100}`.
- Dán nhiều link một lần (mỗi dòng một link, tối đa 50): link sai thì **bỏ qua và báo lại**, link trùng (đã có trong album) cũng bỏ qua.

---

## 4. Đặc tả API (base `/api/v1`)

### 4.1 Album
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/trips/{id}/album` | thành viên | `{ folderUrl, folderId, photos[...] }`, ảnh mới nhất trước |
| PUT | `/trips/{id}/album/folder` | EDITOR+ | `{ "url": "https://drive.google.com/drive/folders/…" }`. Gửi `url` rỗng thì gỡ link |
| POST | `/trips/{id}/album/photos` | **mọi thành viên** | `{ links: string[], dayId?: number, caption?: string }`. Trả `{ album, added, skipped: [{ link, reason }] }` |
| PATCH | `/album-photos/{photoId}` | người thêm / EDITOR+ | `{ caption, dayId }` (null = bỏ gắn ngày) |
| DELETE | `/album-photos/{photoId}` | người thêm / EDITOR+ | Xóa khỏi album (file trên Drive không bị ảnh hưởng) |

```jsonc
// GET /trips/{id}/album
{ "folderUrl": "https://drive.google.com/drive/folders/1AbC…", "folderId": "1AbC…",
  "photos": [ { "id": 5, "driveFileId": "1XyZ…", "viewUrl": "https://drive.google.com/file/d/1XyZ…/view",
                "thumbnailUrl": "https://drive.google.com/thumbnail?id=1XyZ…&sz=w800",
                "caption": "Hoàng hôn Sunset Town", "dayId": 21, "dayIndex": 1,
                "addedByName": "Mai", "createdAt": "…", "canEdit": true } ] }
```

### 4.2 Chia phòng
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/trips/{id}/rooms` | thành viên | `{ rooms[{ id, name, capacity, note, members[] }], unassigned[] }` |
| POST | `/trips/{id}/rooms` | EDITOR+ | `{ name, capacity?, note? }` |
| PUT | `/rooms/{roomId}` | EDITOR+ | Sửa. Không được giảm sức chứa xuống dưới số người đang ở |
| DELETE | `/rooms/{roomId}` | EDITOR+ | Xóa phòng. Người trong phòng về "chưa có phòng" |
| PUT | `/rooms/{roomId}/members/{userId}` | **chính mình** / EDITOR+ | Vào phòng. Đang ở phòng khác cùng chuyến thì **tự chuyển** sang |
| DELETE | `/rooms/{roomId}/members/{userId}` | chính mình / EDITOR+ | Ra khỏi phòng |

Mọi thao tác ghi đều trả lại toàn bộ `RoomListResponse`.

### 4.3 Xem trước khi share link (không qua `/api`, public)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/share/{code}` | Trang HTML có thẻ Open Graph + Twitter Card, tự chuyển tới `{FRONTEND_URL}/join/{code}` (bằng `meta refresh` và JS) |
| GET | `/share/{code}/cover.png` | Ảnh 1200×630. Ảnh bìa là URL http(s) thì **chuyển hướng (302)** tới ảnh đó. Ảnh bìa dạng preset hoặc chưa có thì **vẽ ảnh gradient** đúng màu preset (Java2D, không vẽ chữ để không phụ thuộc font tiếng Việt trên server) |

- Thẻ OG:
  - `og:title` = tên chuyến.
  - `og:description` = "{điểm đến} · {khoảng ngày / "Đang chốt lịch"} · Cùng {n} người lên kế hoạch".
  - `og:image` = `{PUBLIC_BASE_URL}/share/{code}/cover.png`.
- Mọi giá trị đưa vào HTML đều được **escape**.
- Mã mời sai thì trả 404, kèm trang HTML có nút về trang chủ.
- **Cấu hình mới:**
  - `app.frontend-url` (`FRONTEND_URL`, mặc định `http://localhost:5173`).
  - `app.public-base-url` (`PUBLIC_BASE_URL`, mặc định `http://localhost:8080`).
- **FE:** `InviteShare` copy/chia sẻ link `{VITE_SHARE_BASE_URL}/share/{code}`. Biến này mặc định là origin của API, ví dụ `http://localhost:8080`. Ô hiển thị vẫn ghi mã mời như cũ.

### 4.4 Lỗi mới (`ErrorCode` + `frontend/src/types/api.ts`)
| HTTP | code | Khi nào |
|---|---|---|
| 404 | `PHOTO_NOT_FOUND`, `ROOM_NOT_FOUND` | Không tồn tại |
| 400 | `INVALID_DRIVE_LINK` | Link thư mục hoặc link ảnh không phải Drive |
| 409 | `ROOM_FULL` | Phòng đủ người, hoặc giảm sức chứa xuống dưới số người đang ở |
| 409 | `DUPLICATE_ROOM` | Trùng tên phòng trong chuyến |

---

## 5. Backend: cấu trúc
```
album/   AlbumPhoto, AlbumPhotoDay, repositories, DriveLinks (thuần), AlbumService, AlbumController, dto/
room/    TripRoom, RoomAssignment(+Id), repositories, RoomService, RoomController, dto/
share/   SharePageController (HTML + cover.png), CoverImageRenderer (Java2D gradient, có test kích thước PNG)
```
- `SecurityConfig` cho phép `GET /share/**` không cần token.
- `TripDetailResponse` thêm `driveFolderUrl` (đã có cột từ V1).
- **Seeder:**
  - Phú Quốc có 2 phòng ("Phòng 1 – giường đôi" sức chứa 2, "Phòng 2" sức chứa 2), đã xếp `mai` và `linh` vào phòng 1.
  - Album **để trống**, vì không thể tạo id Drive giả mà vẫn xem được.

---

## 6. Frontend
- **Tab "Album"** (bỏ nhãn "Sắp có"):
  - **Khung thư mục Drive:** có nút **"Mở trên Google Drive"** và **"Xem trong app"** (iframe `embeddedfolderview`, cao khoảng 480px). EDITOR+ có nút "Gắn/Đổi link thư mục". Chưa có link thì hiện hướng dẫn: *Tạo thư mục trên Drive → Chia sẻ "Bất kỳ ai có đường liên kết" → dán link*.
  - **Ô "Thêm ảnh từ Drive":** textarea dán nhiều link, chọn ngày (không bắt buộc), chú thích. Thêm xong báo "Đã thêm X ảnh, bỏ qua Y link (lý do)".
  - **Bộ lọc ngày** (Tất cả · Ngày 1 · Ngày 2…) và **lưới ảnh** (2 cột trên điện thoại, 4 cột trên desktop).
    - Thumbnail lấy từ Drive. Ảnh lỗi (file không chia sẻ công khai) hiện ô "Không xem trước được, bấm để mở trên Drive".
    - Bấm ảnh để mở Drive ở tab mới. Menu ⋯ có Sửa chú thích/ngày và Xóa.
- **Tab "Phòng"** (mới):
  - Mỗi phòng là một thẻ: tên, sức chứa (vd "2/3 người"), ghi chú, avatar thành viên trong phòng.
  - Nút **"Vào phòng này"** cho mình. EDITOR+ có menu trên từng người: Chuyển sang phòng… / Ra khỏi phòng.
  - Mục **"Chưa có phòng"** liệt kê những người chưa được xếp. EDITOR+ có nút "Xếp vào…".
  - EDITOR+ có nút "Thêm phòng" và sửa/xóa phòng.
- **`InviteShare`:** link copy/chia sẻ đổi sang `/share/{code}`. Ghi chú nhỏ: "Dán vào Zalo/Messenger sẽ hiện ảnh bìa (khi app đã đưa lên mạng)".
- Thêm `.env.example`: `VITE_SHARE_BASE_URL`.

---

## 7. Kiểm thử
| Loại | Nội dung |
|---|---|
| Unit `DriveLinksTest` | Đủ các dạng link ở mục 3. Link sai. Link thư mục và link file không lẫn nhau |
| Unit `CoverImageRendererTest` | PNG 1200×630 đọc lại được bằng ImageIO, đúng màu đặc trưng của preset |
| Integration album | Gắn/gỡ link thư mục (link file → 400). Dán nhiều link (sai/trùng thì bỏ qua và báo lý do). VIEWER thêm được, xóa ảnh người khác thì 403. Gắn ngày thuộc trip khác → `DAY_NOT_FOUND`. Lọc theo ngày qua `dayId` |
| Integration phòng | Tạo phòng, trùng tên → 409. Tự vào phòng. Vào phòng khác thì tự chuyển. Phòng đầy → 409. VIEWER xếp người khác → 403. Giảm sức chứa dưới số người → 409. Xóa phòng → người về chưa có phòng. Xóa thành viên → mất xếp phòng |
| Integration share | `GET /share/{code}` có `og:title`/`og:image`, tên có ký tự `<script>` thì bị escape. Mã sai → 404. `cover.png` của preset → `image/png`. Cover URL → 302 |
| FE | build + lint. Test tay: dán link Drive thật (file chia sẻ công khai) |

## 8. Tiêu chí nghiệm thu
- [ ] Tab Album: gắn link thư mục Drive thật → "Xem trong app" hiện lưới file. Dán 2–3 link ảnh Drive thật → thấy thumbnail, lọc theo ngày được.
- [ ] Tab Phòng (Phú Quốc): `thao` bấm "Vào phòng 2". Phòng 1 đã đủ 2 người nên `thao` không vào phòng 1 được.
- [ ] Mở `http://localhost:8080/share/PHUQUOC27` → trình duyệt chuyển sang trang tham gia. View-source thấy thẻ OG. `/share/DALAT2027/cover.png` ra ảnh gradient tím.
- [ ] Test BE pass, FE build và lint pass, `CLAUDE.md` cập nhật (hết "Sắp có", ghi chú deploy để sau).

---

## 9. Ghi chú contract đã chốt khi triển khai
- `AlbumResponse` có thêm `folderEmbedUrl` (URL iframe `embeddedfolderview`, null nếu chưa gắn thư mục), để FE không phải tự ghép.
- `album_photos` dùng collation `utf8mb4_bin`, vì id Drive phân biệt hoa/thường. Đã kiểm trên MySQL: 2 id chỉ khác hoa/thường được lưu thành 2 dòng riêng.
- **Dán nhiều link:** dòng trống bị bỏ qua và không bị báo lỗi. Lý do bỏ qua chỉ có 2 loại: `INVALID` và `DUPLICATE` (trùng với ảnh đã có, hoặc trùng ngay trong lần dán đó).
- **FE tách link** theo khoảng trắng, xuống dòng hoặc dấu phẩy, tối đa 50 link mỗi lần.
- **Xóa thành viên** giờ xóa thêm xếp phòng của người đó (`deleteAllForMemberInTrip`). Ảnh họ đã thêm vẫn được giữ.
- **Trang `/share/{code}`:**
  - `Cache-Control` 5 phút, ảnh bìa 1 giờ. Mã mời không phân biệt hoa/thường.
  - Giá trị trong HTML được escape bằng `HtmlUtils`. URL chuyển hướng trong `<script>` được escape riêng.
  - Ẩn khỏi Swagger (`@Hidden`).
- **Kiểm tra trên DB dev:** V6 chạy xong. `/share/PHUQUOC27` có đủ thẻ OG, mô tả "Phú Quốc · 04/12/2026 – 07/12/2026 · Cùng 3 người lên kế hoạch". `cover.png` của Đà Lạt ra đúng gradient lavender.
- **Chưa kiểm chứng:**
  - thumbnail của link Drive thật (cần file thật của người dùng);
  - xem trước trên Zalo/Messenger (cần deploy công khai).
