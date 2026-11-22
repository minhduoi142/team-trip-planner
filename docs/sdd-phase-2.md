# SDD – PHASE 2: Lịch rảnh & Chốt ngày

**Dự án:** Team Trip Planner
**Phụ thuộc:** Phase 1 (auth, trips, trip_members, `TripAccessService`)
**Thời lượng dự kiến:** 1 ngày làm tập trung
**Trạng thái:** Đã triển khai (xem "Ghi chú contract đã chốt" ở cuối file)

---

## 1. Mục tiêu & Phạm vi

### 1.1 Mục tiêu
Kết thúc Phase 2:
1. Mỗi thành viên khai **Rảnh / Có thể / Bận** cho từng ngày trong khoảng ngày dự kiến của chuyến đi, thao tác bằng chạm hoặc kéo trên điện thoại.
2. Cả nhóm xem **bảng lịch rảnh** của mọi người, kèm thống kê từng ngày.
3. Owner/Editor đặt **số ngày muốn đi**. Hệ thống gợi ý **Top 3 khoảng ngày liên tiếp** có nhiều người rảnh nhất.
4. Owner **chốt ngày** (thường bấm từ gợi ý). Hệ thống đặt `start_date`/`end_date` và tự sinh các bản ghi `trip_days`. Trạng thái chuyến đổi sang "Sắp khởi hành" và đếm ngược chuyển sang ngày chính thức.
5. Owner có thể **mở lại khảo sát** để chốt ngày khác.

### 1.2 Quyết định đã chốt với người dùng
| # | Quyết định |
|---|---|
| 1 | Khoảng khảo sát = **khoảng ngày dự kiến** của trip (`planned_start_date` → `planned_end_date`). Chưa có thì nhắc Owner/Editor nhập trước. Tối đa **62 ngày** |
| 2 | Độ dài chuyến để gợi ý do **Owner/Editor nhập** (1–14 ngày, mặc định 3). Đổi là gợi ý tính lại ngay |
| 3 | Xếp hạng: **Rảnh = 1 điểm, Có thể = 0,5 điểm**. Người chưa khai không được tính |
| 4 | **Cho mở lại** sau khi chốt: xóa `trip_days`. Từ Phase 3, ngày đã có lịch trình thì chặn |

### 1.3 Ngoài phạm vi
- Ghi chú lý do bận cho từng ngày (để sau nếu cần).
- Chọn theo buổi hoặc theo giờ (đã chốt: chỉ theo ngày).
- Thông báo hoặc nhắc người chưa khai lịch.
- Nội dung từng ngày đi (lịch trình, dress code): Phase 3.

---

## 2. Thiết kế Cơ sở dữ liệu

### 2.1 Migration `V2__availability_trip_days.sql`
```sql
ALTER TABLE trips
    ADD COLUMN trip_length_days TINYINT NULL AFTER end_date,
    ADD CONSTRAINT chk_trips_length CHECK (trip_length_days IS NULL OR trip_length_days BETWEEN 1 AND 14);

-- Mỗi thành viên có tối đa 1 trạng thái cho mỗi ngày. Không có dòng = chưa khai.
CREATE TABLE member_availabilities (
    trip_id     BIGINT      NOT NULL,
    user_id     BIGINT      NOT NULL,
    avail_date  DATE        NOT NULL,
    status      VARCHAR(10) NOT NULL,
    updated_at  DATETIME(6) NOT NULL,
    CONSTRAINT pk_member_availabilities PRIMARY KEY (trip_id, user_id, avail_date),
    -- FK tổ hợp: chỉ thành viên của trip mới khai được. Rời nhóm thì lịch rảnh bị xóa theo.
    CONSTRAINT fk_availability_member FOREIGN KEY (trip_id, user_id)
        REFERENCES trip_members (trip_id, user_id) ON DELETE CASCADE,
    CONSTRAINT chk_availability_status CHECK (status IN ('AVAILABLE', 'MAYBE', 'BUSY'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE trip_days (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    trip_id      BIGINT       NOT NULL,
    day_index    SMALLINT     NOT NULL,   -- 1, 2, 3...
    actual_date  DATE         NOT NULL,
    note         VARCHAR(500) NULL,
    CONSTRAINT pk_trip_days PRIMARY KEY (id),
    CONSTRAINT fk_trip_days_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT uq_trip_days_index UNIQUE (trip_id, day_index),
    CONSTRAINT uq_trip_days_date UNIQUE (trip_id, actual_date),
    CONSTRAINT chk_trip_days_index CHECK (day_index >= 1)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
```

### 2.2 Ghi chú thiết kế
- **BCNF:**
  - `member_availabilities` dùng PK tự nhiên `(trip_id, user_id, avail_date)`, không có id thừa. `status` phụ thuộc toàn bộ khóa.
  - `trip_days` có hai khóa ứng viên là `(trip_id, day_index)` và `(trip_id, actual_date)`. Mọi phụ thuộc hàm trong bảng đều có vế trái là khóa.
  - Bất biến `actual_date = trips.start_date + (day_index - 1)` chỉ được ghi ở hai thao tác chốt và mở lại, trong cùng một transaction.
- **Trạng thái "đã chốt"** = `trips.start_date IS NOT NULL`. Không thêm cột cờ, vì trạng thái này suy ra được.
- **Xóa:**
  - Xóa thành viên → lịch rảnh của người đó bị xóa theo (CASCADE từ `trip_members`).
  - Xóa trip → `trip_days` bị xóa theo (CASCADE). Lịch rảnh bị xóa theo các dòng `trip_members` mà ứng dụng đã xóa trước.
  - Hai bảng mới không có generated column, nên dùng CASCADE được (khác `trip_members`, xem ghi chú Phase 1).
- **Dữ liệu ngoài khoảng:** khi khoảng dự kiến bị thu hẹp, các dòng lịch rảnh nằm ngoài khoảng mới được **giữ nguyên nhưng bỏ qua** khi trả ma trận và tính gợi ý. Mở rộng lại khoảng thì chúng hiện ra lại.
- **Giới hạn 62 ngày:** kiểm tra ở `TripService` (tạo/sửa trip), trả `INVALID_DATE_RANGE`.
- **JPA:**
  - `MemberAvailability` dùng `@EmbeddedId (tripId, userId, availDate)`, implement `Persistable` giống `TripMember`, cột status dùng `@JdbcTypeCode(SqlTypes.VARCHAR)`.
  - `TripDay` là `@ManyToOne(LAZY) Trip`.

---

## 3. Thuật toán gợi ý ngày (`AvailabilitySuggester`, class thuần, không phụ thuộc Spring)

**Input:**
- Danh sách ngày trong khoảng khảo sát, chỉ lấy các ngày **≥ hôm nay** (giờ VN).
- `L` = số ngày muốn đi.
- Ma trận `status[member][date]`.
- Tổng số thành viên `N`.

**Với mỗi cửa sổ `L` ngày liên tiếp** (trượt từng ngày), xét từng thành viên:
- **Rảnh trọn:** cả `L` ngày đều `AVAILABLE`.
- **Có thể:** cả `L` ngày đều thuộc `{AVAILABLE, MAYBE}` và có ít nhất 1 ngày `MAYBE`.
- **Không đi được:** có ngày `BUSY` **hoặc chưa khai**.

**Điểm** `score = 2 × rảnhTrọn + 1 × cóThể` (dùng số nguyên, tương đương Rảnh 1 điểm, Có thể 0,5 điểm).

**Xếp hạng:** `score` giảm dần → `rảnhTrọn` giảm dần → ngày bắt đầu sớm hơn.

**Chọn Top 3 không chồng nhau:** đi lần lượt theo thứ tự xếp hạng, bỏ cửa sổ nào giao với cửa sổ đã chọn. Nhờ vậy không ra 3 gợi ý gần như trùng nhau (10–12, 11–13, 12–14).

**Loại bỏ:**
- Cửa sổ có `score = 0`.
- Nếu số ngày còn lại < `L` thì trả danh sách rỗng, kèm `reason = "RANGE_TOO_SHORT"`.

**Output mỗi gợi ý:** `startDate`, `endDate`, `availableCount`, `maybeCount`, `totalMembers`, `availableUserIds`, `maybeUserIds`, `unavailableUserIds`. Ba danh sách id để UI hiện được câu kiểu "Thiếu: Ngọc, Thảo".

Độ phức tạp `O(D × N × L)`, tối đa 62 × 15 × 14 ≈ 13 nghìn phép so sánh, không cần tối ưu.

---

## 4. Đặc tả API (base `/api/v1`)

### 4.1 Bảng endpoint
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/trips/{id}/availabilities` | thành viên | Ma trận lịch rảnh, thống kê theo ngày, gợi ý |
| PUT | `/trips/{id}/availabilities` | **mọi thành viên (cả VIEWER)** | Cập nhật hàng loạt lịch của **chính mình** |
| PATCH | `/trips/{id}/trip-length` | OWNER, EDITOR | Đặt số ngày muốn đi `{ "days": 3 }` |
| PATCH | `/trips/{id}/lock-date` | OWNER | Chốt ngày `{ "startDate", "endDate" }`, sinh `trip_days` |
| DELETE | `/trips/{id}/lock-date` | OWNER | Mở lại khảo sát: xóa ngày chính thức và `trip_days` |
| GET | `/trips/{id}/days` | thành viên | Danh sách ngày đi (rỗng nếu chưa chốt) |

VIEWER vẫn khai được lịch rảnh vì đó là thông tin về chính họ. "Chỉ xem" chỉ giới hạn việc sửa nội dung chung của chuyến.

### 4.2 Contract
```jsonc
// GET /trips/{id}/availabilities → 200
{
  "rangeStart": "2027-01-01",          // null nếu trip chưa có khoảng dự kiến
  "rangeEnd": "2027-01-11",
  "tripLengthDays": 3,                 // giá trị đã lưu, null → dùng mặc định 3
  "effectiveLengthDays": 3,
  "locked": false,
  "startDate": null, "endDate": null,
  "members": [ { "userId": 1, "displayName": "Linh", "avatarUrl": null, "respondedDays": 11 } ],
  "entries": [ { "userId": 1, "date": "2027-01-01", "status": "AVAILABLE" } ],   // chỉ ngày trong khoảng
  "days": [ { "date": "2027-01-01", "available": 7, "maybe": 1, "busy": 1, "unknown": 1 } ],
  "suggestions": [
    { "startDate": "2027-01-04", "endDate": "2027-01-06", "availableCount": 8, "maybeCount": 1,
      "totalMembers": 10, "availableUserIds": [1,2], "maybeUserIds": [3], "unavailableUserIds": [4] }
  ],
  "suggestionNote": null               // "NO_RANGE" | "LOCKED" | "NO_RESPONSES" | "RANGE_TOO_SHORT" | "NO_MATCH" | null
}

// PUT /trips/{id}/availabilities  (tối đa 62 phần tử; status null = xóa, về "chưa khai")
{ "entries": [ { "date": "2027-01-04", "status": "AVAILABLE" }, { "date": "2027-01-05", "status": null } ] }
// → 200: trả lại toàn bộ ma trận như GET (FE thay cache luôn, không phải gọi thêm)

// PATCH /trips/{id}/trip-length  { "days": 3 }  → 200 ma trận (gợi ý đã tính lại)

// PATCH /trips/{id}/lock-date  { "startDate": "2027-01-04", "endDate": "2027-01-06" }
// → 200 TripDetailResponse (status UPCOMING/ONGOING, startDate/endDate đã có)

// DELETE /trips/{id}/lock-date → 200 TripDetailResponse (status PLANNING)

// GET /trips/{id}/days → 200
[ { "id": 11, "dayIndex": 1, "date": "2027-01-04", "note": null } ]
```

### 4.3 Quy tắc & lỗi mới (`ErrorCode`, đồng bộ `frontend/src/types/api.ts`)
| HTTP | code | Khi nào |
|---|---|---|
| 409 | `NO_PLANNED_RANGE` | PUT lịch rảnh khi trip chưa có khoảng dự kiến |
| 400 | `DATE_OUT_OF_RANGE` | PUT có ngày nằm ngoài khoảng dự kiến |
| 409 | `AVAILABILITY_LOCKED` | PUT lịch rảnh hoặc đổi số ngày khi đã chốt |
| 400 | `INVALID_TRIP_LENGTH` | `days` ngoài khoảng 1–14 |
| 409 | `ALREADY_LOCKED` | Chốt khi đã chốt (phải mở lại trước) |
| 409 | `NOT_LOCKED` | Mở lại khi chưa chốt |
| 400 | `INVALID_DATE_RANGE` | Chốt với `endDate < startDate`, quá 30 ngày, hoặc ngày bắt đầu ở quá khứ. Khoảng dự kiến > 62 ngày |

- Chốt ngày **không bắt buộc nằm trong khoảng khảo sát**, vì Owner có thể chủ động chọn ngày khác.
- Chốt và mở lại chạy trong **1 transaction**:
  - Chốt: set `start_date`/`end_date`, rồi insert `trip_days` với `day_index` từ 1..N.
  - Mở lại: xóa `trip_days`, rồi set `start_date`/`end_date` = NULL. Giữ nguyên lịch rảnh để khảo sát tiếp.
- Sửa khoảng dự kiến khi đã chốt vẫn được, không ảnh hưởng ngày chính thức.

---

## 5. Backend: cấu trúc code
```
com.tripplanner.availability/
  AvailabilityStatus (enum), MemberAvailabilityId, MemberAvailability, MemberAvailabilityRepository,
  AvailabilitySuggester (thuần), AvailabilityService, AvailabilityController, dto/
com.tripplanner.tripday/
  TripDay, TripDayRepository, TripDayService (lock/unlock), TripDayController, dto/
```
- Quyền kiểm tra qua `TripAccessService.require(...)`.
- PUT lịch rảnh: load các dòng hiện có của user trong các ngày được gửi lên. Status null thì xóa, có status thì upsert (sửa entity có sẵn hoặc `save` entity mới).
- Ma trận: 1 query thành viên (đã có `findAllWithUserByTripId`), 1 query lịch rảnh theo `trip_id` và khoảng ngày. Không có N+1.
- **Seed (`DevDataSeeder`):** thêm bước riêng, idempotent: nếu trip "Đà Lạt" chưa có lịch rảnh thì sinh lịch cho 5 thành viên sao cho có 1 khoảng 3 ngày rõ ràng đẹp nhất, để test gợi ý ngay.

---

## 6. Frontend

### 6.1 Tab "Lịch rảnh" (bật trong `TripDetailPage`)
**Chưa có khoảng dự kiến:** hiện trạng thái trống "Chưa có khoảng ngày dự kiến". OWNER/EDITOR có nút "Đặt ngày dự kiến" mở `TripFormDialog`.

**Khi chưa chốt**, từ trên xuống:
1. **Gợi ý ngày đẹp nhất ✨**
   - Bộ chọn "Đi mấy ngày?" dạng stepper − 3 +, chỉ OWNER/EDITOR sửa được.
   - Tối đa 3 thẻ gợi ý, mỗi thẻ có:
     - khoảng ngày kèm thứ, ví dụ "T6 04/01 – CN 06/01"
     - "**8/10** rảnh · 1 có thể"
     - avatar xếp chồng của người rảnh, dòng "Thiếu: Ngọc, Thảo"
     - OWNER có thêm nút **"Chốt ngày này"** (có hộp xác nhận)
   - Không có gợi ý thì hiện lý do theo `suggestionNote`, ví dụ "Chưa ai khai lịch, khai trước nhé!"
2. **Bảng lịch rảnh**
   - Cột đầu (tên thành viên) **dính trái**. Các cột ngày **cuộn ngang**. Hàng tiêu đề ghi thứ (T2…CN) và `dd/MM`. Cuối tuần tô nền nhạt.
   - Hàng của **mình** nằm trên cùng và sửa được. Các hàng khác chỉ xem.
   - Ô màu: Rảnh = xanh lá, Có thể = vàng, Bận = đỏ nhạt, Chưa khai = xám viền nét đứt. Mỗi ô có ký hiệu ✓ ? ✕ để người mù màu vẫn phân biệt được.
   - Hàng cuối là **thống kê theo ngày**: số người rảnh, nền đậm dần theo tỷ lệ.
3. **Thanh "cọ vẽ"** (dính dưới đáy màn hình trên mobile): Rảnh / Có thể / Bận / Xóa. Chọn cọ rồi **chạm hoặc kéo** qua các ô trong hàng của mình (pointer events, `touch-action: none` trên hàng của mình). Có nút nhanh "Rảnh tất cả".
4. **Lưu tự động:** gom thay đổi, gửi PUT sau 600 ms kể từ thao tác cuối. Ô đổi màu ngay (optimistic). Lỗi thì hiện toast và trả về dữ liệu server. Có chỉ báo "Đang lưu… / Đã lưu".

**Khi đã chốt:**
- Banner "🎉 Đã chốt: T6 04/01 – CN 06/01 (3 ngày)" kèm danh sách các ngày đi (Ngày 1, Ngày 2…).
- Bảng lịch rảnh chuyển sang chỉ xem, cột của các ngày đã chốt được viền nổi bật.
- OWNER có nút "Mở lại khảo sát" (có hộp xác nhận).

### 6.2 Khác
- `types/availability.ts`, `api/availability.ts`, `hooks/useAvailability.ts` theo đúng quy ước Phase 1.
- Chốt hoặc mở lại xong thì invalidate cả chi tiết trip, danh sách trip và ma trận. Countdown cùng trạng thái cập nhật ngay.
- Dashboard không đổi gì (trạng thái và đếm ngược đã dựa trên `startDate`).

---

## 7. Kiểm thử
| Loại | Nội dung |
|---|---|
| Unit `AvailabilitySuggesterTest` | Rảnh trọn / Có thể / chưa khai = không đi được; điểm nửa cho MAYBE; thứ tự hòa; Top 3 không chồng nhau; bỏ ngày quá khứ; khoảng ngắn hơn L; không ai khai |
| Integration | PUT rồi GET ma trận; status null xóa dòng; ngày ngoài khoảng → 400; chưa có khoảng → 409; VIEWER khai được lịch của mình; EDITOR đổi số ngày được nhưng chốt bị 403; chốt sinh đúng N `trip_days` và trip chuyển `UPCOMING`; PUT sau khi chốt → 409; mở lại xóa `trip_days` nhưng giữ lịch rảnh; xóa thành viên thì lịch rảnh của họ bị xóa theo |
| FE | `npm run build` + `npm run lint`. Test tay: chạm và kéo trên DevTools 375px, cuộn ngang bảng 15 người × 30 ngày |

## 8. Tiêu chí nghiệm thu
- [ ] Đăng nhập `linh` → Đà Lạt → tab Lịch rảnh thấy bảng của 5 người (dữ liệu seed) và 3 gợi ý.
- [ ] Đăng nhập `ngoc` (VIEWER) tô được lịch của mình. Lưu tự động, tải lại trang vẫn còn.
- [ ] Đổi "Đi mấy ngày?" thì gợi ý thay đổi theo.
- [ ] `linh` bấm "Chốt ngày này" → trip chuyển "Sắp khởi hành", đếm ngược theo ngày chính thức, `GET /days` trả đủ số ngày.
- [ ] Mở lại khảo sát → về "Đang chốt lịch", bảng sửa được, lịch rảnh còn nguyên.
- [ ] Toàn bộ test BE pass, FE build và lint pass, `CLAUDE.md` đã cập nhật.

---

## 9. Ghi chú contract đã chốt khi triển khai
- `suggestionNote` có thêm 2 giá trị:
  - `LOCKED`: đã chốt ngày, không tính gợi ý.
  - `NO_MATCH`: có người khai lịch nhưng không cửa sổ nào đạt điểm > 0.
- Khoảng khảo sát bị cắt ở tối đa 62 ngày tính từ `plannedStartDate`, để an toàn với dữ liệu cũ. Tạo hoặc sửa trip với khoảng > 62 ngày bị trả `INVALID_DATE_RANGE`.
- `UpdateAvailabilityRequest.entries`: tối thiểu 1, tối đa 62 phần tử. Ngày trùng nhau trong cùng request thì lấy giá trị sau cùng.
- `PATCH /trip-length` khi đã chốt ngày trả `AVAILABILITY_LOCKED`.
- Mã lỗi `DATE_OUT_OF_RANGE` và `INVALID_TRIP_LENGTH` có HTTP 400. Các mã còn lại của bảng 4.3 có HTTP 409.
- FE gửi PUT lịch rảnh **tuần tự** (`useAvailabilityEditor`): không gửi PUT mới khi PUT trước chưa xong, để response cũ không ghi đè dữ liệu mới.
