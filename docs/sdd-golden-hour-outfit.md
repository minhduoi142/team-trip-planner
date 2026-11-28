# SDD – Giờ vàng chụp ảnh & Outfit từng ngày

**Dự án:** Team Trip Planner
**Phụ thuộc:** Thời tiết W1/W2 (`docs/sdd-weather.md`: tọa độ chuyến, vị trí riêng từng ngày, `GET /trips/{id}/weather`), dress code (Phase 3), MinIO (`docs/sdd-media-upload.md`)
**Trạng thái:** Đã triển khai (29/11/2026), xem "Ghi chú khi triển khai" ở cuối

Hai tính năng độc lập, làm chung một đợt:
- **Phần A – Giờ vàng:** mỗi ngày đã chốt có giờ mặt trời mọc/lặn và khung "giờ vàng" để chụp ảnh. Hoạt động nằm trong giờ vàng có nhãn riêng. **Không cần migration.**
- **Phần B – Outfit từng ngày:** mỗi thành viên đăng outfit dự định cho từng ngày (ảnh, tông màu, ghi chú), cả nhóm xem để phối đồ và tránh đụng đồ. Migration `V12`.

---

## Phần A – Giờ vàng chụp ảnh

### A.1 Mục tiêu & quyết định
- Với mỗi "Ngày N" **có ngày thực** (đã chốt, không phải ngày thừa) và **có vị trí hiệu lực** (của ngày hoặc của chuyến), trả về:
  - giờ mặt trời mọc và lặn
  - giờ vàng sáng và giờ vàng chiều
- **Tự tính bằng công thức thiên văn** (thuật toán vị trí mặt trời của NOAA, sai số khoảng ±2 phút), không gọi API. Nhờ vậy:
  - có cho **mọi ngày**, kể cả chuyến còn mấy tháng nữa (dự báo thời tiết chỉ có 16 ngày)
  - không phụ thuộc Open-Meteo còn sống hay không
- **Định nghĩa giờ vàng** (theo cách dân chụp ảnh hay dùng): mặt trời ở độ cao từ **−4° đến +6°**.
  - Giờ vàng sáng: từ lúc mặt trời ở −4° (trước khi mọc) đến lúc lên +6°.
  - Giờ vàng chiều: từ lúc mặt trời xuống +6° đến lúc ở −4° (sau khi lặn).
- **Ngoài phạm vi:**
  - giờ xanh (blue hour)
  - hướng mặt trời (góc phương vị)
  - giờ vàng trong email đếm ngược (có thể thêm sau)

### A.2 Múi giờ của địa điểm
Công thức cho ra giờ UTC. Để hiện giờ địa phương cần múi giờ của tọa độ, và hiện **không lưu múi giờ** ở đâu cả.
- `TimezoneResolver` (package `weather`) hỏi Open-Meteo: `GET {forecast-url}?latitude&longitude&timezone=auto&forecast_days=1&daily=sunrise`, rồi đọc trường `timezone` (ví dụ `Asia/Tokyo`) thành `ZoneId`.
- **Cache trong bộ nhớ** theo tọa độ làm tròn 2 chữ số: TTL 30 ngày (múi giờ gần như không đổi), cache lỗi 2 phút, tối đa 300 khóa. Dùng lại `WeatherCache`.
- **Dự phòng khi gọi lỗi hoặc khi `WEATHER_ENABLED=false`:** tọa độ nằm trong khung Việt Nam (vĩ độ 8–23,5, kinh độ 102–109,6) thì dùng `Asia/Ho_Chi_Minh`. Ngoài khung đó thì không có giờ vàng cho ngày đó (`sun = null`).
- **Thay đổi so với `sdd-weather.md`:** trước đây provider chỉ được gọi khi có ngày nằm trong 16 ngày tới. Nay có thêm **một lần gọi múi giờ cho mỗi địa điểm mới ngoài Việt Nam**, kể cả chuyến còn xa. Địa điểm trong Việt Nam lần đầu vẫn gọi, nhưng lỗi thì dùng ngay giá trị dự phòng.

### A.3 Lớp tính toán – `SunTimes` (pure, unit test)
```text
SunTimes.of(LocalDate date, double lat, double lon, ZoneId zone) → Optional<Sun>
Sun(LocalTime sunrise, LocalTime sunset,
    LocalTime morningGoldenStart, LocalTime morningGoldenEnd,
    LocalTime eveningGoldenStart, LocalTime eveningGoldenEnd)
```
- Mọc/lặn tính tại thiên đỉnh 90,833° (có khúc xạ khí quyển và bán kính đĩa mặt trời). Độ cao +6° và −4° tương ứng thiên đỉnh 84° và 94°.
- Vùng cực, mặt trời không mọc hoặc không lặn trong ngày, thì trả `Optional.empty()`.
- Thời điểm nào không xác định được (mặt trời không lên tới +6°) thì giờ vàng đó lấy theo mọc/lặn.
- Giờ được làm tròn tới phút.

### A.4 API – mở rộng `GET /trips/{id}/weather` (không thêm endpoint)
`DayWeatherResponse` thêm trường `sun`:
```text
SunResponse(sunrise "HH:mm", sunset "HH:mm",
            morningGoldenStart, morningGoldenEnd, eveningGoldenStart, eveningGoldenEnd,
            timezone "Asia/Ho_Chi_Minh")
```
- Trường `sun` có giá trị khi ngày có `date` và vị trí, **bất kể** `status`. `status` có thể là FORECAST, TOO_FAR hoặc UNAVAILABLE.
- Ngày đã qua (`PAST`) không có `sun`: chỉ phí công tính.
- `timezone` cho FE biết giờ này là giờ địa phương của điểm đến. Nếu khác `Asia/Ho_Chi_Minh` thì FE ghi thêm "giờ địa phương".
- `tripWeatherForSystem` (email đếm ngược) cũng có `sun`, nhưng template email chưa dùng.

### A.5 Frontend
- `types/weather.ts`: thêm `SunResponse`; `DayWeatherResponse.sun: SunResponse | null`.
- **`SunTimesRow`** đặt trong dải tóm tắt của ngày, ngay dưới phần thời tiết. Hiện cả khi thời tiết ở trạng thái "Dự báo có từ …":
  - Dòng 1: biểu tượng mặt trời mọc `05:49` · biểu tượng mặt trời lặn `17:18`
  - Dòng 2: **Giờ vàng** sáng `05:27–06:15` · chiều `16:52–17:40`
  - Múi giờ khác Việt Nam thì thêm chữ nhỏ "(giờ địa phương)".
- **Nhãn "Giờ vàng" trên hoạt động:** `ItemCard` hiện chip nhỏ có biểu tượng mặt trời khi `startTime` rơi vào một trong hai khung giờ vàng, nới rộng 15 phút về phía trước để kịp ra chỗ chụp. Hoạt động không có giờ thì không có nhãn.
- **Gợi ý khi thêm hoạt động:** trong `ItemFormDialog`, dưới ô giờ bắt đầu, hiện một dòng gợi ý "Giờ vàng chiều 16:52–17:40", bấm vào thì điền `16:50`. Chỉ hiện khi ngày có `sun`.

### A.6 Kiểm thử
| Loại | Nội dung |
|---|---|
| Unit `SunTimesTest` | Đà Lạt, Hà Nội, Tokyo ngày 29–30/11/2026 khớp số liệu Open-Meteo trong ±2 phút (mọc/lặn); thứ tự `morningGoldenStart < sunrise < morningGoldenEnd < eveningGoldenStart < sunset < eveningGoldenEnd`; vùng cực mùa đông và mùa hè → empty; ngày đổi giờ mùa hè ở châu Âu đúng giờ địa phương |
| Unit `TimezoneResolverTest` | Đọc `timezone`; gọi lỗi → dự phòng Việt Nam trong khung và null ngoài khung; cache: hai lần hỏi chỉ gọi một lần; `WEATHER_ENABLED=false` không gọi mạng |
| Integration `WeatherIntegrationTest` | Ngày TOO_FAR vẫn có `sun`; ngày PAST, NO_DATE, NO_LOCATION thì `sun` null; ngày có vị trí riêng tính theo vị trí riêng |

---

## Phần B – Outfit từng ngày

### B.1 Mục tiêu & quyết định
- Dress code hiện là **một** chủ đề chung cho mỗi ngày (do EDITOR+ đặt). Phần B thêm **outfit của từng người**, mỗi người một bộ cho mỗi ngày:
  - 1–4 ảnh (ảnh bộ đồ, ảnh mẫu trên mạng, ảnh chụp gương…)
  - tối đa 3 tông màu chính, lấy từ **bảng màu dress code** đã có
  - ghi chú ngắn, ví dụ "váy trắng + mũ cói, có thể đổi sang áo be"
- **Mọi thành viên** (kể cả VIEWER) đều đăng và sửa outfit **của mình** được. **OWNER** gỡ được outfit của người khác (kiểm duyệt). Không ai sửa outfit của người khác.
- Cả nhóm xem outfit của nhau, không có chế độ riêng tư.
- Có ở **mọi ngày**, kể cả trước khi chốt ngày (Ngày 1, Ngày 2… đã tồn tại) và ngày thừa.
- **Gợi ý phối đồ tính trên FE, không lưu:**
  - **Đúng tông dress code:** outfit có ít nhất một màu trùng màu dress code của ngày → dấu "Hợp tông".
  - **Trùng màu:** hai người trở lên chọn cùng một màu → dòng "Lan, Mai cùng mặc Trắng". Đây chỉ là thông tin, không phải cảnh báo: nhóm có thể cố ý mặc đồng phục.
- **Ngoài phạm vi:** bình luận/thả tim outfit, tủ đồ cá nhân dùng lại giữa các chuyến, tự đưa đồ vào checklist.

### B.2 Cơ sở dữ liệu – `V12__day_outfits.sql`
```sql
-- Outfit của 1 người cho 1 ngày. Không lưu trip_id (suy ra qua trip_days → phụ thuộc bắc cầu, như poll_votes);
-- "phải là thành viên" do service kiểm tra.
CREATE TABLE day_outfits (
    trip_day_id  BIGINT       NOT NULL,
    user_id      BIGINT       NOT NULL,
    note         VARCHAR(300) NULL,
    updated_at   DATETIME(6)  NOT NULL,
    CONSTRAINT pk_day_outfits PRIMARY KEY (trip_day_id, user_id),
    CONSTRAINT fk_outfits_day FOREIGN KEY (trip_day_id) REFERENCES trip_days (id) ON DELETE CASCADE,
    CONSTRAINT fk_outfits_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 1..4 ảnh, theo thứ tự
CREATE TABLE day_outfit_photos (
    trip_day_id  BIGINT        NOT NULL,
    user_id      BIGINT        NOT NULL,
    position     TINYINT       NOT NULL,      -- 0..3
    image_url    VARCHAR(2000) NOT NULL,
    CONSTRAINT pk_outfit_photos PRIMARY KEY (trip_day_id, user_id, position),
    CONSTRAINT fk_outfit_photos FOREIGN KEY (trip_day_id, user_id)
        REFERENCES day_outfits (trip_day_id, user_id) ON DELETE CASCADE,
    CONSTRAINT chk_outfit_photo_pos CHECK (position BETWEEN 0 AND 3)
);

-- Tối đa 3 tông màu, key thuộc bảng màu dress code (TripDayDressColor.PALETTE)
CREATE TABLE day_outfit_colors (
    trip_day_id  BIGINT      NOT NULL,
    user_id      BIGINT      NOT NULL,
    color_key    VARCHAR(20) NOT NULL,
    CONSTRAINT pk_outfit_colors PRIMARY KEY (trip_day_id, user_id, color_key),
    CONSTRAINT fk_outfit_colors FOREIGN KEY (trip_day_id, user_id)
        REFERENCES day_outfits (trip_day_id, user_id) ON DELETE CASCADE
);

-- Ảnh outfit tải lên MinIO
ALTER TABLE media_files DROP CHECK chk_media_purpose,
    ADD CONSTRAINT chk_media_purpose CHECK (purpose IN ('TRIP_COVER', 'AVATAR', 'DRESS_CODE', 'RECEIPT', 'OUTFIT'));
```
**BCNF:**
- Khóa của `day_outfits` là `(trip_day_id, user_id)`.
- Ảnh và màu là thuộc tính đa trị nên tách bảng (giống `trip_day_dress_colors`).
- Số ảnh tối đa (4) và số màu tối đa (3) do service kiểm. Riêng vị trí ảnh 0..3 có thêm CHECK ở DB.
- Outfit không có ảnh nào vẫn hợp lệ nếu có màu hoặc ghi chú. Outfit **rỗng hoàn toàn** thì không lưu (xem B.4).

### B.3 Backend – package `com.tripplanner.outfit`
| Method | Endpoint | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/trips/{tripId}/outfits` | VIEWER+ | outfit của mọi ngày |
| PUT | `/trip-days/{dayId}/outfits/me` | VIEWER+ | tạo hoặc thay outfit của mình (gửi đủ trường) |
| DELETE | `/trip-days/{dayId}/outfits/me` | VIEWER+ | idempotent |
| DELETE | `/trip-days/{dayId}/outfits/{userId}` | OWNER | gỡ outfit người khác |

Mọi endpoint trả về **toàn bộ** `OutfitBoardResponse`. Quyền kiểm qua `TripAccessService`, `tripId` của ngày lấy bằng `TripDayRepository` (projection `findTripIdByDayId` đã có hoặc thêm).

**DTO (`OutfitDtos`):**
```text
OutfitRequest(photoUrls: List<String> 0..4, mỗi link ≤2000 và bắt đầu http(s)://,
              colors: List<String> 0..3 key thuộc PALETTE, không trùng,
              note ≤300)
OutfitResponse(userId, displayName, avatarUrl, photoUrls, colors, note, updatedAt, mine, canDelete)
DayOutfitsResponse(dayId, dayIndex, outfits)       -- outfit của mình đứng đầu, rồi theo updatedAt mới nhất
OutfitBoardResponse(days)                          -- mọi ngày theo dayIndex, kể cả ngày chưa có outfit
```
`canDelete` = của mình, hoặc mình là OWNER.

### B.4 Quy tắc ghi (`OutfitService`, `@Transactional`)
- `PUT`: kiểm ngày thuộc chuyến và người gọi là thành viên.
  - Ảnh, màu và ghi chú **đều rỗng** → 400 `VALIDATION_ERROR` "Thêm ít nhất 1 ảnh, 1 màu hoặc ghi chú". Muốn gỡ outfit thì dùng DELETE.
  - Màu ngoài bảng màu → 400 `INVALID_DRESS_COLOR` (mã lỗi đã có).
  - Ghi: upsert `day_outfits`, xóa rồi chèn lại ảnh (theo thứ tự gửi lên) và màu.
- `DELETE …/{userId}` khi người gọi không phải OWNER → 403. Chưa có outfit thì vẫn 200, trả bảng hiện tại.
- Không có mã lỗi mới.

### B.5 Chỗ phải sửa thêm
- `TripMemberService.removeMembership`: xóa outfit của người đó trong mọi ngày của chuyến (`deleteAllForMemberInTrip`), vì khóa ngoại tới `users` chỉ cascade khi xóa hẳn user. Như `proposalVoteRepository`.
- `TripService.delete`: không sửa. `day_outfits` cascade theo `trip_days`, mà `trip_days` cascade theo trip.
- `TripDayService.hasContent`: tính cả outfit. Rút ngắn chuyến thì ngày có outfit thành **ngày thừa** chứ không bị xóa. `ItineraryService.deleteOverflowDay` vẫn xóa được (cascade).
- `MediaPurpose`: thêm `OUTFIT("outfit")`. FE `types/media.ts` thêm `'OUTFIT'`.
- `IntegrationTest.cleanDatabase`: không cần thêm (cascade từ `trip_days`). Kiểm lại khi viết test.
- `DevDataSeeder`: bước idempotent "outfit mẫu cho Phú Quốc Ngày 1", 2–3 người có màu và ghi chú, **không** có ảnh (seeder không upload ảnh).

### B.6 Frontend
**File:**
- `types/outfit.ts`, `api/outfit.ts`
- `hooks/useOutfits.ts`: key `tripKeys.outfits(tripId)` nằm dưới `detail`, `refetchInterval: 60_000`. Mutation ghi response vào cache và có `cancelQueries`.
- `components/outfits/OutfitStrip.tsx`, `OutfitDialog.tsx`, `OutfitEditor.tsx`

**`OutfitStrip`** nằm trong dải tóm tắt của ngày, ngay dưới dress code. Chỉ một hàng ngang:
- Tiêu đề "Outfit của nhóm · 3/6 người".
- Một dải cuộn ngang gồm các ô 56px:
  - Ô đầu là outfit của mình, hoặc nút "+ Outfit của bạn" nếu chưa có.
  - Mỗi ô là ảnh đầu tiên của outfit (chưa có ảnh thì dùng chấm màu), avatar nhỏ ở góc và tên dưới ô.
- Có dòng trùng màu thì hiện một dòng chữ nhỏ bên dưới, ví dụ "Lan, Mai cùng chọn Trắng".
- Bấm một ô thì mở `OutfitDialog` tại người đó.

**`OutfitDialog`** (sheet toàn màn hình trên mobile, dialog trên desktop):
- Lưới các outfit của ngày, mỗi thẻ gồm:
  - ảnh 3:4 (nhiều ảnh thì vuốt ngang trong thẻ, có chấm chỉ số)
  - tên và avatar
  - chip màu, kèm dấu "Hợp tông" nếu trùng dress code
  - ghi chú
- Thẻ của mình có nút "Sửa". OWNER có menu "Gỡ outfit" trên thẻ người khác, có hỏi xác nhận.
- Chuyển nhanh sang ngày khác bằng các viên "Ngày 1 · Ngày 2…".

**`OutfitEditor`** (dialog):
- Ảnh: tối đa 4 ô. Dùng lại `ImageUploadButton` với `purpose="OUTFIT"` (nén trên máy, tải lên MinIO). Bỏ hoặc đổi thứ tự bằng nút ← → (không kéo thả).
- Màu: các chip của bảng màu dress code, bật/tắt được, tối đa 3. Màu của dress code ngày đó đứng đầu và có viền gợi ý.
- Ghi chú: tối đa 300 ký tự.
- Các nút: "Lưu", "Gỡ outfit" (khi đã có), "Hủy".
- Mặc định chép màu từ outfit của mình ở ngày trước đó? **Không**, mỗi ngày bắt đầu trống để khỏi nhầm.

### B.7 Kiểm thử
| Loại | Nội dung |
|---|---|
| Integration `OutfitIntegrationTest` | VIEWER đăng outfit của mình (ảnh, màu, ghi chú) → bảng có, `mine=true`; PUT lần 2 thay toàn bộ, thứ tự ảnh giữ đúng |
| Integration | 5 ảnh, 4 màu, màu ngoài bảng màu, link không phải http(s), outfit rỗng hoàn toàn → 400 |
| Integration | Người ngoài chuyến → 403; ngày của chuyến khác → 404; EDITOR gỡ outfit người khác → 403; OWNER gỡ được |
| Integration | Loại thành viên → outfit của họ mất; rút ngắn chuyến → ngày có outfit thành ngày thừa; xóa ngày thừa / xóa chuyến → 204 |
| Unit (FE không có test runner) | Logic "trùng màu" và "hợp tông" viết thành hàm thuần trong `lib/outfits.ts` để dễ kiểm tay |

---

## Thứ tự làm
1. Phần A, backend: `SunTimes` + test, `TimezoneResolver` + test, mở rộng `WeatherService`/DTO, integration test.
2. Phần B, backend: migration V12 → entity → repository → DTO → service → controller, cùng các chỗ ở B.5, integration test.
3. Frontend A, rồi frontend B. `npm run build`, `lint`, `format:check` phải xanh.
4. Chụp màn hình 360px và 1280px: dải tóm tắt ngày (giờ vàng, dải outfit), dialog outfit, editor.
5. Cập nhật `CLAUDE.md` và ghi chú contract đã chốt vào SDD này.

---

## Ghi chú khi triển khai (29/11/2026)
**Backend** (test 272, 1 skip, có cả test tích hợp trên MySQL):
- `SunTimes`: lặp 2 lần quanh thời điểm sự kiện; nếu ngày UTC lệch ngày địa phương (ví dụ Auckland UTC+13) thì dịch ngày UTC rồi tính lại.
  - Khớp Open-Meteo trong ±2 phút ở Đà Lạt, Hà Nội, Tokyo.
  - Paris ngày hạ chí khớp trong ±3 phút.
- Múi giờ hỏi qua `WeatherProvider.timezone` (Open-Meteo `timezone=auto`). Mock của test trả `null`, coi như lỗi, nên test tích hợp đi đường dự phòng Việt Nam.
  - Open-Meteo trả `Asia/Bangkok` cho Hà Nội (cũng UTC+7). FE so độ lệch UTC chứ không so tên múi giờ (`lib/sunTimes.ts` `sameClockAsVietnam`), nên không ghi nhầm "giờ địa phương".
- Outfit dùng JPA `@ElementCollection` cho ảnh (`@OrderColumn position`, `columnDefinition = "TINYINT"` cho `ddl-auto=validate`) và màu; nạp theo lô bằng `@BatchSize`.
  - `DayOutfitRepository.deleteAllForMemberInTrip` là bulk delete; ảnh và màu đi theo nhờ FK CASCADE.
- Màu outfit sai bảng màu trả `INVALID_DRESS_COLOR` (dùng lại mã lỗi cũ), detail riêng là "…quá 3 màu".
- Seeder: Phú Quốc Ngày 1 có outfit mẫu của mai, linh, thao. Chỉ có màu và ghi chú; mai và linh cùng chọn Trắng.

**Frontend:**
- `SunTimesRow` nằm trong dải tóm tắt của ngày, giữa thời tiết và dress code.
- `ItemCard` có chip "Giờ vàng sáng/chiều". `ItemFormDialog` có 2 nút gợi ý giờ; bấm thì điền giờ bắt đầu khung giờ vàng làm tròn xuống 5 phút (17:11 → 17:10).
- Phần outfit gồm các component:
  - `DayOutfits` (container nằm trong dải tóm tắt)
  - `OutfitStrip`
  - `OutfitDialog`: lưới 2 cột trên mobile, 3 cột từ `lg`; nhiều ảnh thì vuốt ngang (scroll-snap) và có chỉ số 1/2
  - `OutfitEditor`: chip màu đang chọn có dấu tích, màu dress code có viền nét đứt
  - `OutfitThumb`: chưa có ảnh thì hiện các sọc màu
- Thứ tự bảng màu trong form: màu dress code của ngày đứng đầu.
- `ItineraryTab` nhận thêm `memberCount`.
- Đã chụp màn hình ở 360px và 1280px. Không có phần tử nào tràn ngang ở dải tóm tắt, hộp thoại outfit và form outfit.

**Chưa kiểm chứng:**
- Tải ảnh outfit lên MinIO thật: MinIO local không chạy lúc kiểm, upload trả 503. CHECK `OUTFIT` của `media_files` đã có test tích hợp.
- Vuốt ảnh trên điện thoại thật.
- Giờ vàng ở điểm đến nước ngoài khi Open-Meteo thật trả múi giờ: đã có unit test với dữ liệu giả lập, chưa thử với API thật.

