# SDD – Upload ảnh từ thiết bị (MinIO)

**Dự án:** Team Trip Planner
**Vị trí trong lộ trình:** bổ sung sau Phase 3, trước Phase 4
**Phụ thuộc:** Phase 1 (auth, `avatarUrl`, `coverImageUrl`), Phase 3 (`dressImageUrl`)
**Thời lượng dự kiến:** khoảng nửa ngày
**Trạng thái:** Đã triển khai (xem mục 10)

---

## 1. Mục tiêu & Phạm vi

### 1.1 Mục tiêu
Ba chỗ đang có ô "dán link ảnh" có thêm nút **"Tải ảnh từ máy"**. Ảnh được lưu vào **MinIO**, một kho lưu trữ chuẩn S3.
| Chỗ | Trường hiện có |
|---|---|
| Ảnh bìa chuyến đi | `trips.cover_image_url` |
| Ảnh đại diện | `users.avatar_url` |
| Ảnh mẫu dress code | `trip_days.dress_image_url` |

### 1.2 Quyết định đã chốt với người dùng
| # | Quyết định |
|---|---|
| 1 | Ảnh **public-read**, tên file là **UUID ngẫu nhiên**. Ai có đúng link thì xem được, giống chế độ "ai có link" của Drive. URL cố định, dùng thẳng trong `<img>` |
| 2 | **Album Phase 5 vẫn dùng link Google Drive.** MinIO chỉ dùng cho 3 chỗ ở trên |
| 3 | MinIO local chạy bằng **Docker Compose** |
| 4 | Production lưu ở đâu (R2 / S3 / tự host MinIO) **quyết định ở Phase 5**. Code chỉ dùng API chuẩn S3 |

### 1.3 Thay đổi so với quyết định cũ
SDD Phase 1 ghi *"Ảnh bìa: dán URL hoặc preset, không upload (zero-storage)"*. Quyết định này được **thay thế một phần**: server bắt đầu lưu ảnh nhỏ (đã nén). Video và ảnh gốc dung lượng lớn vẫn để ở Drive.

### 1.4 Ngoài phạm vi
- Tự dọn ảnh không còn được dùng (ví dụ ảnh bìa cũ sau khi thay). Bảng `media_files` vẫn ghi lại đủ thông tin để Phase 5 làm job dọn nếu cần.
- Upload video, upload nhiều file một lúc, album.
- Presigned URL, tức là trình duyệt upload thẳng lên MinIO.
- Cắt hoặc crop ảnh trên giao diện.

---

## 2. Kiến trúc
```
[Trình duyệt]
  chọn ảnh → nén ở client (canvas: tối đa 1920px, WebP/JPEG ~85%)
  → POST /api/v1/media (multipart) ───▶ [Spring Boot]
                                          kiểm tra auth, magic bytes, ≤ 10 MB
                                          đặt key = {purpose}/{yyyy}/{MM}/{uuid}.{ext}
                                          putObject ───▶ [MinIO bucket "trip-planner", anonymous download]
                                          lưu metadata vào media_files
  ◀── { id, url } ─────────────────────────┘
  điền url vào ô ảnh của form → lưu form như hiện tại (API cũ không đổi)

<img src="{MINIO_PUBLIC_URL}/trip-planner/cover/2026/11/3f2c….webp">  ← trình duyệt tải thẳng từ MinIO
```
- **API cũ giữ nguyên.** Các trường vẫn lưu URL dạng chuỗi. Validation `^https?://` hiện tại đã chấp nhận URL của MinIO.
- **Nén ở client:** ảnh điện thoại 5–8 MB còn khoảng 200–400 KB, upload nhanh trên 4G. Ảnh HEIC của iPhone được Safari tự đổi sang JPEG khi chọn file. Nén bằng code tự viết (`createImageBitmap` + canvas), không thêm thư viện.
- **Lớp `StorageService` (interface)** + `MinioStorageService` (dùng thư viện `io.minio:minio`). Interface này để test thay bằng bản giả, và để Phase 5 có thể đổi sang R2/S3 chỉ bằng cấu hình.

---

## 3. Cơ sở dữ liệu – `V4__media_files.sql`
```sql
CREATE TABLE media_files (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    object_key    VARCHAR(200) NOT NULL,      -- vd 'cover/2026/11/3f2c...e1.webp'
    purpose       VARCHAR(20)  NOT NULL,
    content_type  VARCHAR(50)  NOT NULL,
    size_bytes    INT          NOT NULL,
    width         INT          NULL,
    height        INT          NULL,
    uploaded_by   BIGINT       NULL,
    created_at    DATETIME(6)  NOT NULL,
    CONSTRAINT pk_media_files PRIMARY KEY (id),
    CONSTRAINT uq_media_files_key UNIQUE (object_key),
    CONSTRAINT fk_media_files_user FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_media_purpose CHECK (purpose IN ('TRIP_COVER', 'AVATAR', 'DRESS_CODE')),
    CONSTRAINT chk_media_size CHECK (size_bytes > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
```
- **Không lưu URL đầy đủ.** URL được tính `= MINIO_PUBLIC_URL + "/" + bucket + "/" + object_key`, nên đổi domain hay chuyển sang R2 không phải sửa dữ liệu. Thiết kế đạt BCNF.
- Bảng chỉ dùng để **theo dõi** (ai upload, dung lượng bao nhiêu, phục vụ việc dọn sau này). Các bảng nghiệp vụ không tham chiếu tới bảng này.

---

## 4. API
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/v1/media` | đã đăng nhập | `multipart/form-data`: `file` (bắt buộc), `purpose` = `TRIP_COVER` \| `AVATAR` \| `DRESS_CODE` |

```jsonc
// 201
{ "id": 12, "url": "http://localhost:9000/trip-planner/cover/2026/11/3f2c…e1.webp",
  "contentType": "image/webp", "sizeBytes": 245812, "width": 1920, "height": 1080 }
```

**Kiểm tra phía server:**
- Loại file xác định theo **magic bytes**, không tin `Content-Type` hay đuôi file: JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`.
- Kích thước tối đa **10 MB**: `spring.servlet.multipart.max-file-size=10MB`, `max-request-size=11MB`.
- `width`/`height` đọc bằng `ImageIO` cho JPEG/PNG. Với WebP thì để null, vì `ImageIO` mặc định không đọc được WebP.

**Lỗi mới** (thêm vào `ErrorCode` và `frontend/src/types/api.ts`):
| HTTP | code | Khi nào |
|---|---|---|
| 413 | `FILE_TOO_LARGE` | Lớn hơn 10 MB (bắt `MaxUploadSizeExceededException`) |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Không phải JPEG/PNG/WebP |
| 400 | `VALIDATION_ERROR` | Thiếu file, file rỗng, hoặc `purpose` sai |
| 503 | `STORAGE_UNAVAILABLE` | MinIO không kết nối được. Phần còn lại của app vẫn chạy bình thường |

---

## 5. Cấu hình & chạy local

### 5.1 `docker-compose.yml` (thư mục gốc repo)
- `minio`: image `minio/minio` (ghim version cụ thể), cổng `9000` (API) và `9001` (console quản lý), volume `minio-data`.
- `minio-init`: image `minio/mc`, chạy một lần để tạo bucket `trip-planner` và bật `anonymous download`.
- Tài khoản root lấy từ `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` trong file `.env` ở thư mục gốc (gitignore). Có `.env.example` mẫu.

Lệnh: `docker compose up -d`. Console quản lý: http://localhost:9001.

### 5.2 `backend/.env` thêm
```
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=...          # dev dùng luôn root user; production tạo user riêng chỉ có quyền ghi bucket
MINIO_SECRET_KEY=...
MINIO_BUCKET=trip-planner
MINIO_PUBLIC_URL=http://localhost:9000   # địa chỉ trình duyệt dùng để tải ảnh
```
Cấu hình được map vào `app.storage.*` trong `application.yml`. Giá trị bí mật chỉ nằm ở `.env`.

> Muốn xem ảnh trên **điện thoại thật trong cùng mạng LAN** thì `MINIO_PUBLIC_URL` phải là IP LAN của máy (vd `http://192.168.1.10:9000`), không dùng `localhost` được.

---

## 6. Frontend
- **`lib/imageCompress.ts`:** `compressImage(file, { maxSize: 1920, quality: 0.85 })` trả về `Blob` WebP, hoặc JPEG nếu trình duyệt không hỗ trợ WebP. Ảnh nhỏ sẵn (dưới 300 KB và dưới 1920px) thì gửi nguyên.
- **`api/media.ts` + `hooks/useUploadImage.ts`:** upload qua axios kèm `onUploadProgress`.
- **`components/ImageUploadButton.tsx`:** nút "Tải ảnh từ máy" + input ẩn `accept="image/*"`, hiện % tiến độ, báo lỗi bằng toast. Upload xong thì gọi `onUploaded(url)`.
- **Gắn vào:**
  - `CoverPicker`: nút upload nằm cạnh ô dán link, ảnh upload hiện ngay ở khung xem trước.
  - `ProfileDialog`: bấm vào avatar để đổi ảnh.
  - `DressCodeDialog`: nút upload ảnh mẫu.

---

## 7. Kiểm thử
| Loại | Nội dung |
|---|---|
| Unit `ImageTypeDetectorTest` | Nhận đúng JPEG/PNG/WebP. Từ chối file giả đuôi `.jpg`, PDF, file rỗng |
| Integration `MediaIntegrationTest` | Dùng `StorageService` giả (`@MockitoBean`): upload thành công trả URL đúng định dạng và ghi `media_files`; 415; 413; chưa đăng nhập 401; MinIO lỗi → 503 |
| Integration MinIO thật | `MinioStorageServiceIT`: put + tải lại qua URL public. **Chỉ chạy khi có `MINIO_TEST_ENDPOINT`** (giống `TEST_DB_URL`) |
| FE | build + lint. Test tay: upload ảnh điện thoại 5 MB → file trong MinIO khoảng vài trăm KB |

## 8. Tài liệu sẽ cập nhật khi triển khai
| File | Thay đổi |
|---|---|
| `docs/sdd-phase-1.md` | Ghi chú: quyết định "không upload" được thay một phần bởi SDD này |
| `CLAUDE.md` | Thêm lớp lưu file MinIO, lệnh `docker compose up -d`, biến `MINIO_*`, quy tắc "URL tính từ key, không lưu URL" |
| `AGENT_RULE.md` | Dòng giới thiệu: thêm "ảnh bìa/avatar/dress code lưu MinIO" (album vẫn là Drive) |
| `backend/.env.example`, `.env.example` (gốc) | Biến `MINIO_*` |

## 9. Tiêu chí nghiệm thu
- [ ] `docker compose up -d` chạy MinIO, bucket `trip-planner` được tạo tự động, console mở được.
- [ ] Ở cả 3 chỗ: tạo/sửa chuyến đi → "Tải ảnh từ máy" → chọn ảnh điện thoại → thấy ảnh bìa mới, tải lại trang vẫn còn.
- [ ] Gửi file PDF đổi đuôi thành `.jpg` → báo "Chỉ hỗ trợ ảnh JPG, PNG, WebP".
- [ ] Tắt MinIO → upload báo lỗi rõ ràng, các chức năng khác vẫn chạy bình thường.
- [ ] Test BE pass, FE build và lint pass.

---

## 10. Ghi chú đã chốt khi triển khai
- **Image MinIO:** MinIO đã ngừng phát hành image Docker công khai (Docker Hub gỡ `minio/minio`/`minio/mc`, quay.io trả 401). Người dùng chọn **dùng image có sẵn trên máy**. `docker-compose.yml` ghim `minio/minio:RELEASE.2025-09-07T16-13-09Z` (đã `docker tag` từ `latest` có sẵn) với `pull_policy: never`. `minio-init` dùng chính image đó vì image có kèm `mc`. Máy mới phải tự có image (`docker save`/`docker load`) hoặc build từ source. Production chọn ở Phase 5.
- **SDK:** `io.minio:minio` **8.6.0** (dòng 8.x API ổn định). OkHttp 5 publish artifact `okhttp` dạng Kotlin multiplatform, mà với Maven thì đó chỉ là **jar rỗng**. Vì vậy pom **loại `okhttp`** và thêm `com.squareup.okhttp3:okhttp-jvm` cùng phiên bản (5.1.0). Khi nâng MinIO SDK, phải nâng `okhttp.jvm.version` theo.
- Thiếu file hoặc `purpose` sai trả `VALIDATION_ERROR` (controller nhận `@RequestParam(required = false)` rồi kiểm tra ở service). Chưa cấu hình `MINIO_ENDPOINT` thì upload trả 503 `STORAGE_UNAVAILABLE`, app vẫn khởi động bình thường.
- Giới hạn 10 MB được kiểm ở **cả hai nơi**: servlet multipart (413 qua `handleMaxUploadSizeExceededException`) và `MediaService`, vì MockMvc không đi qua giới hạn của servlet.
- Object được lưu với `Cache-Control: public, max-age=31536000, immutable` (key chứa UUID nên nội dung không bao giờ đổi).
- Test với MinIO thật nằm ở `MinioStorageServiceRealTest`. Nó chỉ chạy khi có `MINIO_TEST_ENDPOINT`, `MINIO_TEST_ACCESS_KEY`, `MINIO_TEST_SECRET_KEY` (bucket mặc định `trip-planner`).
- **FE:** `api/media.ts` phải ghi đè `Content-Type: multipart/form-data`, vì axios instance mặc định là JSON và axios 1.x sẽ tự chuyển `FormData` thành JSON. Safari không mã hóa được WebP nên hàm nén tự chuyển sang JPEG (lót nền trắng).
