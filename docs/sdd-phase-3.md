# SDD – PHASE 3: Lịch trình, Dress code & Checklist

**Dự án:** Team Trip Planner
**Phụ thuộc:** Phase 1 (trips, members, quyền), Phase 2 (`trip_days`, chốt/mở lại ngày)
**Thời lượng dự kiến:** 1–1,5 ngày làm tập trung
**Trạng thái:** Đã triển khai (xem mục 10)

---

## 1. Mục tiêu & Phạm vi

### 1.1 Mục tiêu
1. Mỗi ngày đi có **lịch trình** gồm các hoạt động: giờ, tên, loại, địa điểm + link Google Maps, ghi chú chuẩn bị, chi phí dự kiến. Thêm, sửa, xóa, **kéo thả đổi thứ tự**, chuyển hoạt động sang ngày khác.
2. Mỗi ngày có **dress code**: chủ đề, tối đa 4 màu, ảnh mẫu, ghi chú. Cộng thêm ghi chú chung cho ngày.
3. **Checklist chuẩn bị** chung cho cả nhóm, chia theo nhóm đồ. Mỗi món giao cho 1 người, hoặc ai đó tự bấm "Tôi mang". Người mang tick khi đã chuẩn bị xong.
4. Tổng chi phí dự kiến theo ngày và cho cả chuyến.

### 1.2 Quyết định đã chốt với người dùng
| # | Quyết định |
|---|---|
| 1 | Giờ **không bắt buộc**. Thứ tự do **kéo thả** quyết định. Thêm hoạt động có giờ, hoặc sửa giờ, thì **tự chèn đúng vị trí theo giờ**. Thứ tự giờ bị lệch thì chỉ **cảnh báo nhẹ** |
| 2 | Mở lại khảo sát **giữ lịch trình theo Ngày 1, 2…**. Chốt ngày mới thì "Ngày 1" chuyển sang ngày thực mới. Chuyến ngắn lại thì các ngày thừa còn nội dung được giữ ở mục **"Chưa xếp ngày"** để chuyển hoạt động sang ngày khác |
| 3 | Checklist **chung + nhận món**, chia nhóm, có bộ lọc "Món của tôi" |
| 4 | **Chưa deploy.** Chỉ chuẩn bị sẵn `Dockerfile` cho backend. Deploy để Phase 5 |

### 1.3 Ngoài phạm vi
- Chọn tọa độ trên bản đồ: chỉ lưu tên địa điểm + link Google Maps. Spec gốc có `latitude`/`longitude`, bỏ để làm nhanh.
- Bình chọn địa điểm, chi tiêu thực tế: Phase 4.
- Checklist cá nhân riêng tư.

---

## 2. Thay đổi so với Phase 2 (do quyết định #2)
| Trước (Phase 2) | Sau (Phase 3) |
|---|---|
| `trip_days.actual_date` lưu cứng, `UNIQUE(trip_id, actual_date)` | **Bỏ cột**. Ngày được tính `= trips.start_date + (day_index - 1)` khi đã chốt, `null` khi chưa chốt |
| Mở lại khảo sát xóa `trip_days` | Mở lại **giữ** `trip_days` và mọi nội dung. Chỉ xóa `start_date`/`end_date` |
| Chốt luôn tạo `trip_days` mới | Chốt N ngày: **tạo thêm** các ngày 1..N còn thiếu. Các ngày có `day_index > N` mà **không có nội dung** thì bị xóa, còn nội dung thì giữ lại (gọi là ngày "thừa") |
| `TripDayResponse.date` luôn có | `date` có thể `null`, thêm `overflow: boolean` |

**Ngày thừa** = `day_index > số ngày của chuyến đã chốt`. Hiển thị ở mục "Chưa xếp ngày". Xóa được khi không cần nữa.

---

## 3. Thiết kế Cơ sở dữ liệu

### 3.1 Migration `V3__itinerary_dresscode_checklist.sql`
```sql
-- 1) trip_days: ngày thực là dữ liệu suy ra → bỏ actual_date; thêm dress code
ALTER TABLE trip_days
    DROP INDEX uq_trip_days_date,
    DROP COLUMN actual_date,
    ADD COLUMN dress_theme     VARCHAR(100)  NULL,
    ADD COLUMN dress_note      VARCHAR(500)  NULL,
    ADD COLUMN dress_image_url VARCHAR(2000) NULL;

-- Bảng màu dress code (tối đa 4 màu/ngày, kiểm ở service). 1NF: mỗi màu 1 dòng.
CREATE TABLE trip_day_dress_colors (
    trip_day_id BIGINT      NOT NULL,
    color_key   VARCHAR(20) NOT NULL,         -- khóa trong bảng màu cố định ở FE/BE, vd 'white', 'pastel-pink'
    CONSTRAINT pk_dress_colors PRIMARY KEY (trip_day_id, color_key),
    CONSTRAINT fk_dress_colors_day FOREIGN KEY (trip_day_id) REFERENCES trip_days (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- 2) Lịch trình: chỉ tham chiếu trip_day_id (KHÔNG có trip_id, tránh phụ thuộc bắc cầu)
CREATE TABLE itinerary_items (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    trip_day_id     BIGINT        NOT NULL,
    title           VARCHAR(150)  NOT NULL,
    category        VARCHAR(20)   NOT NULL,
    start_time      TIME          NULL,
    end_time        TIME          NULL,
    location_name   VARCHAR(200)  NULL,
    maps_url        VARCHAR(2000) NULL,
    note            VARCHAR(1000) NULL,
    estimated_cost  BIGINT        NULL,       -- VND
    sort_order      INT           NOT NULL,
    created_by      BIGINT        NULL,
    created_at      DATETIME(6)   NOT NULL,
    updated_at      DATETIME(6)   NOT NULL,
    CONSTRAINT pk_itinerary_items PRIMARY KEY (id),
    CONSTRAINT fk_items_day FOREIGN KEY (trip_day_id) REFERENCES trip_days (id) ON DELETE CASCADE,
    CONSTRAINT fk_items_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_items_category CHECK (category IN
        ('FOOD', 'SIGHTSEEING', 'TRANSPORT', 'STAY', 'SHOPPING', 'ACTIVITY', 'OTHER')),
    CONSTRAINT chk_items_time CHECK (end_time IS NULL OR start_time IS NOT NULL),
    CONSTRAINT chk_items_cost CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    INDEX idx_items_day_order (trip_day_id, sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- 3) Checklist: assignee phải là thành viên của chính trip đó → FK tổ hợp
CREATE TABLE trip_checklists (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    trip_id     BIGINT       NOT NULL,
    category    VARCHAR(20)  NOT NULL,
    item_name   VARCHAR(150) NOT NULL,
    quantity    SMALLINT     NOT NULL DEFAULT 1,
    assignee_id BIGINT       NULL,
    is_checked  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  DATETIME(6)  NOT NULL,
    CONSTRAINT pk_trip_checklists PRIMARY KEY (id),
    CONSTRAINT fk_checklist_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    -- Không CASCADE/SET NULL được (SET NULL sẽ null cả trip_id) → ứng dụng tự bỏ giao món trước khi xóa thành viên
    CONSTRAINT fk_checklist_assignee FOREIGN KEY (trip_id, assignee_id)
        REFERENCES trip_members (trip_id, user_id),
    CONSTRAINT chk_checklist_category CHECK (category IN
        ('SHARED', 'FOOD', 'MEDICAL', 'ELECTRONICS', 'PHOTO', 'OTHER')),
    CONSTRAINT chk_checklist_quantity CHECK (quantity BETWEEN 1 AND 99)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- 4) Bổ sung trip_days cho các trip đã chốt nhưng chưa có ngày (vd: dữ liệu seed cũ)
INSERT INTO trip_days (trip_id, day_index)
WITH RECURSIVE seq (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 30)
SELECT t.id, seq.n
FROM trips t JOIN seq ON seq.n <= DATEDIFF(t.end_date, t.start_date) + 1
WHERE t.start_date IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM trip_days d WHERE d.trip_id = t.id);
```

### 3.2 Ghi chú thiết kế
- **BCNF:**
  - `itinerary_items` không lưu `trip_id`. Trip được lấy qua `trip_day_id`.
  - Ngày thực của `trip_days` không còn được lưu, vì nó suy ra từ `trips.start_date`. Bỏ cột giúp loại bỏ dư thừa giữa hai bảng.
  - Màu dress code được tách thành bảng riêng, đạt 1NF.
- **Thứ tự lịch trình:** `sort_order` không có UNIQUE, vì khi sắp xếp lại, MySQL kiểm tra ràng buộc trên từng dòng và sẽ báo trùng giữa chừng. Server luôn **đánh số lại 0..n-1** sau mỗi thao tác.
- **Xóa:**
  - Xóa trip: `trip_days` → items/màu bị xóa theo (CASCADE), `trip_checklists` bị xóa theo (CASCADE).
  - FK tổ hợp `fk_checklist_assignee` không có CASCADE, nên `TripService.delete` phải **xóa checklist trước khi xóa thành viên**.
  - `TripMemberService.removeMember`: **bỏ giao** các món của người đó (`assignee_id = NULL`) trước khi xóa membership.
- **Kiểu dữ liệu:**
  - `TIME` map sang `LocalTime`. JSON dùng `"HH:mm"`.
  - Chi phí là `BIGINT` VND (`Long`), không dùng số thập phân.

---

## 4. Logic chèn theo giờ (`ItineraryOrdering`, class thuần, có unit test)
**Input:** danh sách item hiện có của ngày (theo `sort_order`) + item cần đặt (có thể đã có trong danh sách).

**Cách đặt:**
- Item **không có giờ:** khi thêm mới thì đặt cuối. Khi sửa thì giữ vị trí cũ.
- Item **có giờ:** gỡ item ra khỏi danh sách, rồi chèn vào **ngay trước item có giờ đầu tiên mà `start_time` lớn hơn** giờ của nó. Không có item nào như vậy thì **đặt cuối danh sách**. *(Đã chỉnh khi implement: quy tắc cũ "đặt ngay sau item có giờ cuối cùng" chèn 14:00 lên trước "Cafe (không giờ)" và làm sai chính ví dụ bên dưới.)*
- Các item không có giờ giữ nguyên vị trí tương đối với nhau.

**Output:** danh sách mới, được đánh số lại `sort_order` từ 0..n-1.

**Ví dụ:** `[07:00 Ăn sáng, Cafe (không giờ), 14:00 Hồ Xuân Hương]`, thêm `09:00 Chợ Đà Lạt` → `[07:00, Cafe, 09:00, 14:00]`.

**Cảnh báo lệch giờ (FE):** nếu tồn tại i < j, cả hai đều có giờ, mà `start(i) > start(j)`, thì hiện badge "Giờ chưa theo thứ tự".

---

## 5. Đặc tả API (base `/api/v1`)

### 5.1 Lịch trình & dress code
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/trips/{id}/itinerary` | thành viên | Toàn bộ các ngày + dress code + items + tổng chi phí |
| POST | `/trip-days/{dayId}/items` | EDITOR+ | Thêm hoạt động (tự chèn theo giờ) |
| PUT | `/itinerary-items/{itemId}` | EDITOR+ | Sửa hoạt động. Đổi giờ thì tự chèn lại |
| DELETE | `/itinerary-items/{itemId}` | EDITOR+ | Xóa hoạt động |
| PUT | `/trip-days/{dayId}/items/order` | EDITOR+ | Đặt thứ tự mới cho các item **trong ngày** (kéo thả trong ngày) |
| POST | `/itinerary-items/{itemId}/move` | EDITOR+ | Chuyển item sang ngày khác cùng trip `{ "dayId": 12 }`. Server tự chèn theo giờ (mục 4). Dùng cho kéo thả **giữa các ngày** và menu "Chuyển sang ngày…" |
| PUT | `/trip-days/{dayId}` | EDITOR+ | Sửa ghi chú ngày + dress code |
| DELETE | `/trip-days/{dayId}` | EDITOR+ | Xóa **ngày thừa** cùng toàn bộ nội dung của nó |

`/trips/{id}/days` của Phase 2 vẫn giữ, response thêm `overflow`, và `date` có thể null.

```jsonc
// GET /trips/{id}/itinerary → 200
{
  "locked": true, "startDate": "2027-01-04", "endDate": "2027-01-06", "tripDays": 3,
  "totalCost": 4500000,
  "days": [
    { "id": 11, "dayIndex": 1, "date": "2027-01-04", "overflow": false,
      "note": "Ngày di chuyển",
      "dress": { "theme": "Trắng tinh khôi", "note": "Váy trắng + mũ cói", "imageUrl": null,
                 "colors": ["white", "beige"] },
      "totalCost": 1500000,
      "items": [
        { "id": 101, "dayId": 11, "title": "Ăn sáng bánh căn", "category": "FOOD",
          "startTime": "07:00", "endTime": "08:00", "locationName": "Bánh căn Nhà Chung",
          "mapsUrl": null, "note": null, "estimatedCost": 300000, "sortOrder": 0,
          "createdByName": "Linh" } ] }
  ]
}

// POST /trip-days/{dayId}/items, PUT /itinerary-items/{id}
{ "title": "Chợ Đà Lạt", "category": "SHOPPING", "startTime": "09:00", "endTime": null,
  "locationName": "Chợ Đà Lạt", "mapsUrl": null, "note": "Mang túi vải", "estimatedCost": 200000 }
// → 200/201: ItineraryResponse (toàn bộ, như GET) để FE thay cache 1 lần

// PUT /trip-days/{dayId}/items/order   { "itemIds": [103, 101, 102] }
// itemIds phải là ĐÚNG tập item hiện có của ngày (không thiếu, không thừa, không trùng)
// → 200 ItineraryResponse

// POST /itinerary-items/{itemId}/move   { "dayId": 12 }   → 200 ItineraryResponse

// PUT /trip-days/{dayId}
{ "note": "Ngày di chuyển", "dressTheme": "Trắng tinh khôi", "dressNote": "Váy trắng + mũ cói",
  "dressImageUrl": null, "dressColors": ["white", "beige"] }   // tối đa 4 màu, key thuộc bảng màu
```

**Validation:**
- `title`: 1–150 ký tự.
- `startTime`/`endTime`: định dạng `HH:mm`. Có `endTime` thì phải có `startTime`.
- `estimatedCost`: 0..1.000.000.000.
- `mapsUrl`, `dressImageUrl`: http(s).
- `note`: tối đa 1000 ký tự.
- **Bảng màu cố định:** `white, black, beige, brown, pastel-pink, hot-pink, red, orange, yellow, mint, green, sky, navy, lavender, purple, denim`.

### 5.2 Checklist
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/trips/{id}/checklist` | thành viên | Danh sách + thống kê |
| POST | `/trips/{id}/checklist` | EDITOR+ | Thêm món `{ itemName, category, quantity, assigneeId? }` |
| PUT | `/checklist-items/{id}` | EDITOR+ | Sửa (kể cả đổi người mang) |
| DELETE | `/checklist-items/{id}` | EDITOR+ | Xóa |
| POST | `/checklist-items/{id}/claim` | **mọi thành viên** | "Tôi mang". Chỉ được khi món chưa có ai nhận |
| DELETE | `/checklist-items/{id}/claim` | người đang mang | Bỏ nhận (về chưa ai nhận, bỏ tick) |
| PATCH | `/checklist-items/{id}/check` | người mang hoặc EDITOR+ | `{ "checked": true }` |

```jsonc
// GET /trips/{id}/checklist → 200 (sắp theo category, rồi theo created_at)
{ "total": 12, "checked": 5, "unassigned": 3,
  "items": [ { "id": 7, "category": "PHOTO", "itemName": "Chân máy", "quantity": 1,
               "assignee": { "userId": 2, "displayName": "Mai", "avatarUrl": null },
               "checked": false, "createdAt": "..." } ] }
// Các thao tác ghi đều trả lại toàn bộ ChecklistResponse.
```

VIEWER vẫn nhận món và tick được món của mình, giống cách VIEWER khai lịch rảnh ở Phase 2, vì đây là việc của chính họ.

### 5.3 Lỗi mới (`ErrorCode` + `frontend/src/types/api.ts`)
| HTTP | code | Khi nào |
|---|---|---|
| 404 | `DAY_NOT_FOUND`, `ITEM_NOT_FOUND`, `CHECKLIST_ITEM_NOT_FOUND` | Không tồn tại. Thuộc trip mà mình không phải thành viên thì vẫn trả 403 qua `TripAccessService` |
| 400 | `INVALID_ORDER` | `itemIds` không khớp đúng tập item của ngày (thiếu/thừa/trùng). Move sang ngày của trip khác |
| 400 | `INVALID_DRESS_COLOR` | Màu không thuộc bảng màu, hoặc quá 4 màu |
| 400 | `ASSIGNEE_NOT_MEMBER` | Giao món cho người không trong nhóm |
| 409 | `ALREADY_CLAIMED` | Nhận món đã có người nhận |
| 409 | `DAY_NOT_OVERFLOW` | Xóa một ngày không phải ngày thừa |

Kiểm tra quyền với tài nguyên con (day, item, checklist item): tra ra `trip_id` qua join, rồi gọi `TripAccessService.require(tripId, …)`.

---

## 6. Backend: cấu trúc code
```
tripday/      (mở rộng) TripDay + dress fields, TripDayDressColor (@EmbeddedId), DressColor (enum key↔giá trị),
              TripDayService.lock/unlock sửa theo mục 2, DayDetail update/delete overflow
itinerary/    ItineraryItem, ItineraryCategory, ItineraryItemRepository, ItineraryOrdering (thuần),
              ItineraryService, ItineraryController, dto/
checklist/    ChecklistItem, ChecklistCategory, ChecklistRepository, ChecklistService, ChecklistController, dto/
```
- **GET itinerary:** 1 query days, 1 query items `WHERE trip_day_id IN (...)`, 1 query màu. Không có N+1.
- Sửa `TripService.delete` và `TripMemberService.removeMember` như mục 3.2.
- Sửa các test Phase 2 bị ảnh hưởng: mở lại khảo sát giờ **giữ** `trip_days`.
- **Seeder:** bước idempotent mới. Phú Quốc (đã chốt) có lịch trình 3–4 ngày kèm dress code. Đà Lạt có checklist khoảng 10 món, một phần đã có người nhận và tick.
- **`backend/Dockerfile`** (multi-stage: Maven build → JRE 21 slim) + `.dockerignore`. Chỉ chuẩn bị, chưa deploy. Docker Desktop đang tắt nên **chưa build thử image được**.

---

## 7. Frontend

### 7.1 Tab "Lịch trình"
- **Chưa từng chốt** (không có ngày nào): hiện trạng thái trống "Chốt ngày ở tab Lịch rảnh để bắt đầu lên lịch trình".
- **Thanh chọn ngày** cuộn ngang: các viên "Ngày 1 · T6 04/01". Chưa chốt thì không ghi ngày thực. Ngày thừa xếp cuối, có nhãn "Chưa xếp ngày".
- **Thẻ dress code** của ngày đang chọn:
  - Chủ đề, các chấm màu, ảnh mẫu (bấm để xem lớn), ghi chú.
  - EDITOR+ có nút sửa, mở dialog: chọn tối đa 4 màu từ bảng màu, dán link ảnh.
  - Ngày chưa có dress code thì hiện gợi ý "Thêm dress code cho ngày này ✨".
- **Timeline dọc** các hoạt động. Mỗi thẻ có:
  - cột giờ bên trái, icon theo loại, tên
  - địa điểm (bấm mở Google Maps; không có `mapsUrl` thì mở trang tìm kiếm theo tên)
  - chi phí, ghi chú
  - **tay kéo** (`@dnd-kit/sortable`, hỗ trợ chạm giữ trên điện thoại) và menu ⋯: Sửa / Chuyển sang ngày… / Xóa
- **Kéo thả giữa các ngày:** khi đang kéo một hoạt động, các viên ngày ở thanh chọn ngày trở thành vùng thả (sáng lên khi kéo tới). Thả vào viên "Ngày X" thì gọi `move`, rồi toast "Đã chuyển sang Ngày X" kèm nút **Xem**. Thả trong danh sách thì sắp xếp lại trong ngày.
- **Thanh tổng:** tổng chi phí của ngày và của cả chuyến. Kèm badge cảnh báo khi giờ chưa theo thứ tự.
- **Dialog thêm/sửa hoạt động:** chọn loại bằng chip có icon, giờ dùng `input type=time`, chi phí có ô nhập số kèm định dạng hiển thị `1.500.000 ₫`.
- VIEWER chỉ xem: ẩn tay kéo và các nút sửa.

### 7.2 Tab "Chuẩn bị" (checklist)
- **Thanh tiến độ** "5/12 món đã sẵn sàng".
- **Bộ lọc:** Tất cả · Của tôi · Chưa ai nhận.
- **Nhóm theo loại:** Đồ dùng chung 🎒, Ăn uống 🍜, Y tế 💊, Điện tử 🔌, Chụp ảnh 📸, Khác. Mỗi dòng gồm:
  - checkbox, chỉ bật khi được phép tick
  - tên món, số lượng ×n
  - avatar người mang, hoặc nút **"Tôi mang"** nếu chưa ai nhận
  - món của mình có nút "Bỏ nhận"
- **Ô thêm nhanh** ở đầu (EDITOR+): tên món + chọn loại + Enter.
- Thao tác tick hiển thị kết quả ngay, chưa chờ server (optimistic).

### 7.3 Khác
- Đổi tên các tab: **Tổng quan · Lịch rảnh · Lịch trình · Chuẩn bị**, còn **Chi tiêu · Album** để "Sắp có".
- Thư viện mới: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`. Component Shadcn mới: `checkbox`, `progress`.
- Thêm `types/itinerary.ts`, `types/checklist.ts`, `api/…`, `hooks/…` theo đúng quy ước.

---

## 8. Kiểm thử
| Loại | Nội dung |
|---|---|
| Unit `ItineraryOrderingTest` | Thêm không giờ → cuối. Thêm có giờ vào giữa. Không có item nào có giờ → lên đầu. Sửa giờ → di chuyển. Item không giờ giữ vị trí tương đối |
| Integration lịch trình | CRUD + tự chèn. Reorder trong ngày. Move sang ngày khác (chèn theo giờ). `INVALID_ORDER` (reorder thiếu item, move sang trip khác). VIEWER bị 403. Tổng chi phí đúng |
| Integration chốt/mở lại | Mở lại giữ ngày + items. Chốt lại 2 ngày khi trước đó có 3 → ngày 3 còn items thành ngày thừa, ngày trống bị xóa. Xóa ngày thừa. `DAY_NOT_OVERFLOW` |
| Integration dress code | Lưu và đọc màu. `INVALID_DRESS_COLOR` |
| Integration checklist | Tạo/giao món. Nhận món (VIEWER được). `ALREADY_CLAIMED`. Tick bởi người mang / EDITOR / người khác (403). Xóa thành viên thì món của họ về chưa ai nhận. Xóa trip có checklist |
| Migration | V3 chạy trên DB dev có sẵn dữ liệu Phase 2 (backfill `trip_days` cho Phú Quốc, Sa Pa) |
| FE | build + lint. Test tay kéo thả bằng chạm trên 375px |

## 9. Tiêu chí nghiệm thu
- [ ] `linh` → Phú Quốc → tab Lịch trình thấy các ngày có hoạt động và dress code (seed). Thêm "09:00 …" thì tự nằm đúng chỗ. Kéo thả đổi thứ tự được, tải lại vẫn giữ.
- [ ] Chuyển 1 hoạt động sang ngày khác bằng cách kéo thả lên viên ngày, và bằng menu.
- [ ] Mở lại khảo sát rồi chốt khoảng ngắn hơn → hoạt động của ngày bị dư nằm ở "Chưa xếp ngày", chuyển hoặc xóa được.
- [ ] `ngoc` (VIEWER) xem lịch trình được nhưng không sửa được. Ở tab Chuẩn bị, bấm "Tôi mang" và tick món của mình được.
- [ ] Test BE pass, FE build và lint pass, `CLAUDE.md` + SDD Phase 2 được cập nhật theo thay đổi ở mục 2.

---

## 10. Ghi chú contract đã chốt khi triển khai
- **Quy tắc chèn theo giờ:** item có giờ chèn trước item có giờ muộn hơn đầu tiên, không có thì **đặt cuối** (đã sửa ở mục 4).
- **Kéo thả giữa các ngày:** dùng `POST /itinerary-items/{id}/move`. `PUT /trip-days/{dayId}/items/order` chỉ sắp xếp trong ngày, `itemIds` phải khớp đúng tập item của ngày.
- `ItineraryDayResponse` có thêm `timeOrderBroken`, do server tính, để FE hiện cảnh báo. `ItineraryResponse.tripDays` là null khi chưa chốt.
- **Ngày thừa:** `date = null` và `overflow = true`. Khi chưa chốt thì mọi ngày đều có `date = null` và `overflow = false`.
- Có `endTime` mà thiếu `startTime` thì trả `VALIDATION_ERROR` (không kèm `fieldErrors`). Giờ sai định dạng thì trả 400 `BAD_REQUEST`.
- `estimatedCost` được hiển thị là chi phí **mỗi người**. Tổng ngày và tổng chuyến = tổng của các item.
- **Checklist:** đổi người mang thì `checked` về false. Bỏ nhận cũng bỏ tick. Xóa thành viên thì các món của người đó được bỏ giao và bỏ tick.
- Item có `created_by` dùng `ON DELETE SET NULL`. Response trả `createdByName`.
- Đã thêm `backend/Dockerfile` (multi-stage, JRE 21, user không phải root) + `.dockerignore`. **Chưa build thử**, vì Docker Desktop đang tắt.
