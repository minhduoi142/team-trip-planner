# SDD – Ví giấy tờ chuyến đi

**Dự án:** Team Trip Planner
**Phụ thuộc:** MinIO (`docs/sdd-media-upload.md`), tab "Chuẩn bị" (`docs/sdd-packing-list.md`), lịch trình theo ngày (Phase 3)
**Trạng thái:** Đã triển khai (29/11/2026). Người dùng đã duyệt cả 4 mặc định ở mục 1.2; xem "Ghi chú khi triển khai" ở cuối

---

## 1. Mục tiêu & Phạm vi

### 1.1 Mục tiêu
Lúc ra sân bay hay nhận phòng, cả nhóm hay phải lục tin nhắn Zalo để tìm mã đặt chỗ, ảnh vé, số điện thoại chủ homestay. Tính năng này gom tất cả vào **một ví giấy tờ** của chuyến:

1. Mỗi giấy tờ có: loại, tên, **mã đặt chỗ** (bấm là copy), **thời gian** (giờ bay, giờ nhận/trả phòng), địa điểm, **người liên hệ + số điện thoại** (bấm là gọi), ghi chú, và **1 file đính kèm** (ảnh hoặc PDF).
2. **Hai mức hiển thị:**
   - **Cả nhóm:** đặt phòng, vé đoàn, vé tham quan.
   - **Chỉ mình tôi:** vé riêng, bảo hiểm, ảnh CCCD/hộ chiếu.
3. File lưu ở **bucket MinIO riêng tư**, chỉ tải được qua backend sau khi kiểm quyền (xem 2.2).
4. Trong tab Lịch trình, ngày nào có giấy tờ (theo thời gian) thì hiện một dòng nhỏ "Giấy tờ hôm nay: Vé máy bay VJ123 · Nhận phòng homestay", bấm vào mở đúng giấy tờ đó.

### 1.2 Quyết định cần bạn duyệt
| # | Mặc định mình đề xuất |
|---|---|
| 1 | Đặt trong tab **"Chuẩn bị"**, thêm mục thứ ba **"Giấy tờ"** cạnh "Hành lý của tôi / Đồ chung". Không thêm tab mới vì thanh tab đã dài. |
| 2 | Mức hiển thị mặc định là **"Cả nhóm"**, riêng loại **Giấy tờ tùy thân** và **Bảo hiểm** mặc định **"Chỉ mình tôi"**. Đổi được khi tạo hoặc sửa. |
| 3 | Sửa và xóa: giấy tờ **"Cả nhóm"** thì người tạo hoặc OWNER; **"Chỉ mình tôi"** thì chỉ người tạo, không ai khác thấy (kể cả OWNER, giống hành lý). |
| 4 | **Bucket MinIO riêng tư mới** (`trip-planner-private`, không bật đọc công khai). Phải sửa `docker-compose.yml`, `docker-compose.prod.yml` và thêm biến `MINIO_PRIVATE_BUCKET`. Lần deploy tới, container `minio-init` sẽ tự tạo bucket này. |

### 1.3 Ngoài phạm vi
- **Xem khi mất mạng** (PWA/offline). FE có nút **"Lưu về máy"** cho từng file để chủ động tải trước.
- Nhiều file trong một giấy tờ: một PDF có thể nhiều trang; vé khứ hồi thì tạo hai giấy tờ.
- Đọc mã đặt chỗ từ ảnh (OCR), nhập vé từ email.
- Nhắc giờ bay qua email.

---

## 2. Dữ liệu & lưu trữ

### 2.1 Migration `V15__trip_documents.sql`
```sql
CREATE TABLE trip_documents (
    id             BIGINT        NOT NULL AUTO_INCREMENT,
    trip_id        BIGINT        NOT NULL,
    kind           VARCHAR(20)   NOT NULL,
    title          VARCHAR(150)  NOT NULL,
    booking_code   VARCHAR(50)   NULL,
    starts_at      DATETIME      NULL,      -- giờ địa phương nơi đến (không múi giờ), vd giờ bay / nhận phòng
    ends_at        DATETIME      NULL,      -- giờ hạ cánh / trả phòng
    place          VARCHAR(150)  NULL,
    contact_name   VARCHAR(100)  NULL,
    contact_phone  VARCHAR(20)   NULL,
    note           VARCHAR(500)  NULL,
    visibility     VARCHAR(10)   NOT NULL,  -- SHARED | PRIVATE
    file_key       VARCHAR(200)  NULL,      -- object key trong bucket RIÊNG TƯ; null = không có file
    file_type      VARCHAR(50)   NULL,
    file_name      VARCHAR(150)  NULL,
    file_size      INT           NULL,
    created_by     BIGINT        NULL,
    created_at     DATETIME(6)   NOT NULL,
    updated_at     DATETIME(6)   NOT NULL,
    CONSTRAINT pk_trip_documents PRIMARY KEY (id),
    CONSTRAINT fk_documents_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_documents_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_documents_kind CHECK (kind IN
        ('FLIGHT', 'BUS_TRAIN', 'STAY', 'TICKET', 'INSURANCE', 'ID', 'OTHER')),
    CONSTRAINT chk_documents_visibility CHECK (visibility IN ('SHARED', 'PRIVATE')),
    CONSTRAINT chk_documents_file CHECK ((file_key IS NULL AND file_type IS NULL AND file_name IS NULL AND file_size IS NULL)
        OR (file_key IS NOT NULL AND file_type IS NOT NULL AND file_name IS NOT NULL AND file_size IS NOT NULL)),
    CONSTRAINT chk_documents_time CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at),
    INDEX idx_documents_trip (trip_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
```
- **BCNF:** khóa là `id`. Bốn cột file mô tả đúng một file của giấy tờ (đủ cả bốn hoặc không có).
- **`PRIVATE` mà `created_by` NULL** (người tạo đã xóa tài khoản): không ai thấy nữa. Xóa tài khoản thì service dọn các dòng này (xem 2.3).
- **Không lưu `trip_day_id`:** ngày nào được suy ra từ `starts_at` và ngày bắt đầu chuyến. Lưu thêm thì là phụ thuộc bắc cầu, và sẽ sai khi đổi ngày chốt.

### 2.2 File riêng tư
- **Lưu trữ:**
  - Bucket mới `MINIO_PRIVATE_BUCKET` (mặc định `trip-planner-private`). `minio-init` tạo bucket bằng `mc mb --ignore-existing`, **không** gọi `mc anonymous set`.
  - Key: `documents/{tripId}/{uuid}.{ext}`, không lưu URL công khai nào.
- **`StorageService`** thêm 3 hàm làm việc với bucket riêng tư:
  - `putPrivate(key, bytes, type)`
  - `getPrivate(key)`, trả bytes và content type
  - `deletePrivate(key)`
- **Loại file:** JPG/PNG/WebP/**PDF**, kiểm bằng magic bytes (`ImageType` thêm nhận dạng PDF `%PDF-`), tối đa 10 MB. Ảnh được FE nén như upload hiện có; PDF giữ nguyên.
- **Tải file:** `GET /documents/{id}/file` kiểm quyền rồi stream về, kèm header:
  - `Content-Type`
  - `Content-Disposition: inline; filename*=UTF-8''…`
  - `Cache-Control: private, no-store`
  - `X-Content-Type-Options: nosniff`
- **Phía FE:** token chỉ nằm trong bộ nhớ, nên `<img src>` không tự gửi được. FE tải file bằng axios dưới dạng blob rồi dùng `URL.createObjectURL`, có thu hồi URL khi đóng.

### 2.3 Chỗ phải sửa thêm
- **`TripMemberService.removeMembership`:** xóa các giấy tờ `PRIVATE` của người đó trong chuyến, kèm file. Giấy tờ `SHARED` họ tạo thì giữ lại (`created_by` vẫn trỏ tới user).
- **`TripService.delete`:** lấy danh sách `file_key` của chuyến trước khi xóa; dòng thì đi theo CASCADE. Sau khi commit thì xóa object, lỗi chỉ ghi log.
- **Xóa giấy tờ hoặc thay file:** xóa object cũ sau khi commit (`TransactionSynchronization.afterCommit`), lỗi chỉ ghi log.
- **`IntegrationTest`:** mock `StorageService` sẵn ở lớp nền (test media hiện tự mock riêng).

---

## 3. Backend – package `com.tripplanner.document`

### 3.1 Endpoint (prefix `/api/v1`)
| Method | Endpoint | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/trips/{tripId}/documents` | VIEWER+ | giấy tờ SHARED + PRIVATE của chính mình |
| POST | `/trips/{tripId}/documents` | VIEWER+ | 201, JSON |
| PUT | `/documents/{id}` | xem 1.2 mục 3 | gửi đủ trường |
| DELETE | `/documents/{id}` | xem 1.2 mục 3 | |
| PUT | `/documents/{id}/file` | như sửa | multipart `file`; thay file cũ |
| DELETE | `/documents/{id}/file` | như sửa | bỏ file |
| GET | `/documents/{id}/file` | ai **xem** được giấy tờ | stream file |

- Giấy tờ PRIVATE của người khác: mọi endpoint trả **404** `DOCUMENT_NOT_FOUND`, không lộ là có tồn tại.
- Các lệnh ghi trả về **toàn bộ** `DocumentListResponse`.

### 3.2 DTO (`DocumentDtos`)
```text
DocumentRequest(kind*, title* ≤150, bookingCode ≤50, startsAt, endsAt (≥ startsAt), place ≤150,
                contactName ≤100, contactPhone ≤20 (chữ số, khoảng trắng, + - . ( )), note ≤500, visibility*)
DocumentResponse(id, kind, title, bookingCode, startsAt, endsAt, place, contactName, contactPhone, note,
                 visibility, file: FileInfo | null, createdByName, mine, canEdit, updatedAt)
FileInfo(type, name, size)       -- không có URL; FE gọi GET /documents/{id}/file
DocumentListResponse(documents)  -- có giờ trước, theo starts_at tăng dần; không giờ xếp sau, theo created_at
```

### 3.3 Mã lỗi mới (thêm cả vào `frontend/src/types/api.ts`)
| Code | HTTP | Thông báo |
|---|---|---|
| `DOCUMENT_NOT_FOUND` | 404 | Không tìm thấy giấy tờ |
| `UNSUPPORTED_DOCUMENT_TYPE` | 415 | Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc file PDF |

`FILE_TOO_LARGE` và `STORAGE_UNAVAILABLE` dùng lại mã đã có.

### 3.4 Cấu hình
- `app.storage.private-bucket: ${MINIO_PRIVATE_BUCKET:trip-planner-private}`.
- Ghi mẫu vào `.env.example`, `.env.prod.example`, `backend/.env.example`.
- Thêm vào `minio-init` của cả hai file compose.

---

## 4. Frontend

### 4.1 File
- `types/document.ts`, `api/document.ts`
- `hooks/useDocuments.ts`: key `tripKeys.documents(tripId)` dưới `detail`, poll 60 giây; `useDocumentFile(id)` tải blob khi cần, không poll
- `components/documents/DocumentsPanel.tsx`, `DocumentCard.tsx`, `DocumentFormDialog.tsx`, `DocumentViewer.tsx`
- `PrepareTab` thêm mục "Giấy tờ" (`?view=docs`)
- `ItineraryTab` thêm dòng "Giấy tờ hôm nay" (dùng chung query)

### 4.2 Giao diện
- **Danh sách:** nhóm theo ngày ("T5 04/12", "Chưa có giờ"). Mỗi thẻ gồm:
  - biểu tượng loại, tên, giờ ("08:00 → 09:05"), địa điểm
  - **mã đặt chỗ** chữ đậm, có nút copy
  - nút **Gọi** (`tel:`) khi có số điện thoại
  - nhãn **"Chỉ mình tôi"** có biểu tượng ổ khóa với giấy tờ riêng
  - ô xem trước nhỏ nếu là ảnh, hoặc biểu tượng PDF
- **Bấm vào file:** mở `DocumentViewer`. Ảnh xem toàn màn hình (zoom bằng trình duyệt); PDF mở ở tab mới bằng blob URL. Có nút **"Lưu về máy"**.
- **Form:**
  - loại (chip), tên, mã đặt chỗ, giờ bắt đầu / kết thúc (`datetime-local`), địa điểm, người liên hệ, số điện thoại, ghi chú
  - **"Ai thấy"**: Cả nhóm / Chỉ mình tôi, mặc định theo 1.2 mục 2
  - tải file lên (ảnh hoặc PDF)
  - gợi ý nhãn theo loại, ví dụ Máy bay: "Giờ cất cánh / Giờ hạ cánh"; Chỗ ở: "Nhận phòng / Trả phòng"
- **Dòng trong Lịch trình:** chỉ hiện ở ngày có giấy tờ.

---

## 5. Kiểm thử
| Loại | Nội dung |
|---|---|
| Unit `ImageTypeTest` | nhận dạng PDF; file giả đuôi `.pdf` nhưng là HTML thì bị từ chối |
| Integration `DocumentIntegrationTest` | Thêm/sửa/xóa giấy tờ SHARED; EDITOR không phải người tạo sửa → 403, OWNER được |
| Integration | PRIVATE: người khác (kể cả OWNER) không thấy trong danh sách, GET/PUT/DELETE/file → 404 |
| Integration | Upload PDF/ảnh → `file` có trong response; GET file trả đúng bytes + `Cache-Control: private, no-store`; file 11 MB → 413; HTML → 415; thay file → object cũ bị xóa sau commit |
| Integration | `endsAt < startsAt` → 400; số điện thoại có chữ cái → 400 |
| Integration | Loại thành viên → giấy tờ PRIVATE của họ mất, SHARED còn; xóa chuyến → 204 và object được xóa |
| Thủ công | Mở PDF và ảnh trên điện thoại thật; nút Gọi; "Lưu về máy" |

---

## Ghi chú khi triển khai (29/11/2026)
**Backend** (test 296, 1 skip, có cả test tích hợp trên MySQL):
- Loại file nằm ở `DocumentEnums.FileType` (JPG/PNG/WebP/PDF), **không** sửa `ImageType`, để upload ảnh bìa/avatar không vô tình nhận PDF.
- `MinioStorageService` thêm `putPrivate` / `getPrivate` / `deletePrivate`. Lần ghi đầu tiên tự tạo bucket riêng tư nếu chưa có (bucket mới của MinIO mặc định là riêng tư), nên máy dev chưa chạy lại `minio-init` vẫn dùng được.
- Thay file: đăng ký `afterCompletion` **ngay sau khi tải lên**. Commit thì xóa object cũ; rollback thì xóa object vừa tải. Xóa giấy tờ, bỏ file, loại thành viên và xóa chuyến đều xóa object sau khi commit.
- **Giờ địa phương:** `starts_at` / `ends_at` dùng `@JdbcTypeCode(SqlTypes.LOCAL_DATE_TIME)`. Không có annotation này thì `hibernate.jdbc.time_zone=UTC` đổi 08:00 thành 01:00 theo múi giờ của JVM. Có test kiểm giá trị thô trong DB.
- `TripMemberService.removeMembership` gọi `DocumentService.deletePrivateOfMember`; `TripService.delete` gọi `deleteFilesOfTripAfterCommit`.

**Frontend:**
- `PrepareTab` thêm mục "Giấy tờ" (`?view=docs`, `?doc=` để cuộn tới và tô viền). Trên màn nhỏ ẩn icon của 3 nút để vừa 360px.
- `DayDocuments` ở Lịch trình: giấy tờ bắt đầu **hoặc kết thúc** trong ngày (trả phòng cũng hiện).
- File tải qua axios thành Blob → `useMemo(URL.createObjectURL)`, thu hồi khi đóng. Query `document-file` có `gcTime` 60 giây, không giữ vé/CCCD lâu trong bộ nhớ.
- Ảnh được nén như upload thường; PDF gửi nguyên, chặn trên 10 MB ngay ở client.

**Đã kiểm với MinIO thật (Docker local):**
- Tải PDF và PNG lên, tải về đúng từng byte.
- Linh tải file riêng của Mai → 404.
- **Truy cập ẩn danh** `http://localhost:9000/trip-planner-private/<key>` → **403**; liệt kê bucket → **403**. Đối chứng: object ở bucket công khai → 200.
- Xóa giấy tờ thì object biến mất khỏi bucket.
- Chụp màn hình ở 360px với 2 vai trò: Linh không thấy CCCD của Mai; ảnh xem trong ứng dụng; chip ở Lịch trình nhảy đúng giấy tờ.

**Chưa kiểm chứng:**
- Mở PDF và nút "Gọi" trên điện thoại thật.
- Production: `minio-init` mới tạo bucket riêng tư, nginx không proxy `/trip-planner-private/`. Location `/trip-planner/` của nginx không khớp đường dẫn này, cần kiểm lại sau khi deploy.

**Lỗi cũ phát hiện thêm (không sửa đợt này):** các cột `TIME` cũ (ví dụ `itinerary_items.start_time`) bị lưu lệch múi giờ, vì `LocalTime` đổi theo ngày 1/1/1970, lúc đó Asia/Ho_Chi_Minh là UTC+8. Ví dụ 08:00 được lưu thành 00:00. App đọc ghi qua cùng một đường nên vẫn hiển thị đúng, kể cả email; chỉ sai nếu đổi múi giờ của JVM hoặc đọc database bằng tay. Muốn sửa thì cần migration dữ liệu cùng với annotation như trên.

