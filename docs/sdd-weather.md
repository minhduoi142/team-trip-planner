# SDD – Dự báo thời tiết theo ngày (Open-Meteo)

**Dự án:** Team Trip Planner
**Phụ thuộc:** Phase 1 (trips), Phase 2 (khoảng ngày dự kiến, chốt ngày), Phase 3 (`trip_days`, lịch trình, dress code, checklist), Email N3 (`CountdownJob`, `CountdownContentBuilder`)
**Trạng thái:** Đã duyệt theo đề xuất §1.3. **W1 đã triển khai** (ghi chú §5.10); W2, W3 chưa làm
**Migration:** `V10__trip_destination_location.sql` (W1), `V11__trip_day_location.sql` (W2). W3 không thêm migration.

| Phase | Nội dung | Kết quả nghiệm thu |
|---|---|---|
| **W1: Dự báo theo ngày** | Tìm địa điểm (geocoding) + lưu tọa độ điểm đến của chuyến; API thời tiết có cache; hiện thời tiết ở viên ngày và đầu mỗi ngày | Chuyến đã chốt ngày, có vị trí → các ngày trong 16 ngày tới hiện icon, nhiệt độ, khả năng mưa |
| **W2: Theo từng ngày + gợi ý** | Địa điểm riêng cho từng "Ngày N"; gợi ý mang áo mưa/kem chống nắng/áo ấm + nút "Thêm vào checklist"; thời tiết trong email đếm ngược | Chuyến nhiều điểm hiện đúng thời tiết từng nơi; mail D-3 có khối "Thời tiết dự kiến" |
| **W3 (tùy chọn): Khí hậu thường thấy** | Chuyến chưa chốt ngày nhưng có khoảng ngày dự kiến → trung bình 5 năm cho khoảng đó | Tab Lịch rảnh hiện "Giữa tháng 12 ở Đà Lạt thường 14–23°C, ~2/6 ngày có mưa" |

Mỗi phase tuân theo `AGENT_RULE.md` (BE trước → FE types copy 1:1 → `mvnw test` + `npm run build` xanh).

---

## 1. Bối cảnh & mục tiêu

### 1.1 Hiện tại
- `trips.destination` là **chữ tự do** (vd "Đà Lạt"), không có tọa độ → chưa thể hỏi thời tiết.
- `trip_days` là "Ngày N" bền vững, **không lưu ngày**; ngày thật = `start_date + day_index - 1` khi đã chốt (`TripDay.dateIn`). Chưa chốt hoặc ngày thừa (overflow) → không có ngày.
- Backend chưa gọi HTTP ra ngoài ở đâu (trừ JWKS Google qua Nimbus).
- Production là **VPS 1 GB RAM** (đã dùng ~690 MB swap): backend `mem_limit 512m`, MySQL 300m, MinIO 150m, frontend 128m.

### 1.2 Mục tiêu
1. Mỗi ngày của chuyến đã chốt hiện **dự báo thời tiết** của đúng nơi, đúng ngày (khi nằm trong tầm dự báo).
2. Biến thời tiết thành **hành động**: nhắc mang áo mưa/áo ấm/kem chống nắng, thêm vào checklist 1 chạm, có trong email đếm ngược.
3. **Không làm nặng server:** không thêm container, không thêm thư viện, cache dùng chung cho mọi thành viên, gọi API ngoài ít nhất có thể.
4. API ngoài lỗi **không bao giờ** làm hỏng trang hay thao tác chính: chỉ ẩn phần thời tiết.

### 1.3 Quyết định (đề xuất, chờ duyệt)
| # | Vấn đề | Đề xuất | Lý do |
|---|---|---|---|
| Q1 | Nguồn dữ liệu | **Open-Meteo** (forecast + geocoding + archive) | Không cần API key; dự báo theo ngày tới 16 ngày; tìm địa điểm trả tiếng Việt (đã thử: "Đà Lạt", "Phú Quốc", "Hội An", "Sa Pa", "Mù Cang Chải" đều ra đúng). Miễn phí cho **phi thương mại** (~10.000 lượt/ngày), dữ liệu CC BY 4.0 (phải ghi nguồn) |
| Q2 | Mức địa điểm | W1: **1 vị trí cho cả chuyến**; W2: thêm vị trí riêng từng "Ngày N" (bỏ trống = theo chuyến) | Phần lớn chuyến 1 điểm đến; chuyến nhiều điểm vẫn được hỗ trợ ở W2 |
| Q3 | Ngày xa hơn tầm dự báo | W1/W2: chỉ báo "Có dự báo từ dd/MM"; W3 (tùy chọn) thêm khí hậu trung bình | Dự báo > 16 ngày không đáng tin, không hiện số |
| Q4 | Email đếm ngược | **Có** (W2): khối "Thời tiết dự kiến" cho tối đa 3 ngày đầu | Mốc D-7/3/1/0 đều nằm trong tầm 16 ngày |
| Q5 | Thông báo khi dự báo đổi | **Không** | Gây spam, dự báo đổi liên tục |

### 1.4 Ngoài phạm vi
- Thời tiết theo giờ, radar, cảnh báo thiên tai chính thức (bão của Trung tâm KTTV).
- Tự đoán tọa độ từ chữ `destination` cũ (dễ sai vì trùng tên) hoặc từ `mapsUrl` của hoạt động (link rút gọn Google Maps không có tọa độ).
- Đổi đơn vị (°F), chọn ngôn ngữ khác tiếng Việt.
- Lưu lịch sử dự báo.

### 1.5 Ràng buộc tài nguyên (VPS 1 GB)
- **Không** Redis, **không** container mới, **không** thư viện mới (HTTP dùng `RestClient` của Spring + `JdkClientHttpRequestFactory` có sẵn trong Java 21; cache tự viết).
- Cache có **giới hạn số mục** (mặc định 300 vị trí × ~2 KB ≈ 0,6 MB heap) và tự bỏ mục hết hạn.
- **Không** job `@Scheduled` mới: chỉ lấy dự báo khi có người mở trang, hoặc trong `CountdownJob` vốn đã chạy 08:00.
- Gọi lỗi thì nhớ lỗi 2 phút (negative cache) để không dồn request chờ timeout.

---

## 2. Thuật ngữ

| Thuật ngữ | Nghĩa |
|---|---|
| Vị trí (location) | Cặp `(lat, lon)` + tên hiển thị, chọn từ gợi ý geocoding |
| Vị trí hiệu lực của ngày | W1: vị trí của chuyến. W2: vị trí riêng của ngày nếu có, không thì vị trí của chuyến |
| Tầm dự báo | 16 ngày tính từ hôm nay (theo danh sách `daily.time` Open-Meteo trả về) |
| Khóa cache | Tọa độ làm tròn 2 chữ số thập phân (~1,1 km), vd `11.95,108.44` |
| Condition | Nhóm thời tiết suy ra từ mã WMO (`CLEAR`, `RAIN`…), dùng cho nhãn tiếng Việt + icon |

---

## 3. Nguồn dữ liệu – Open-Meteo

### 3.1 Tìm địa điểm (geocoding)
```
GET https://geocoding-api.open-meteo.com/v1/search?name={q}&count=8&language=vi&format=json
```
Trường dùng: `name`, `latitude`, `longitude`, `country`, `country_code`, `admin1` (tỉnh/bang), `feature_code`, `population`.
- Không có kết quả → không có khóa `results` (coi như danh sách rỗng).
- **Chuẩn hóa chữ:** dữ liệu GeoNames dùng `Ð` (U+00D0) thay cho `Đ` (U+0110), vd `"Ðà Lạt"`, `"Ðà Nẵng"` → đổi `U+00D0 → U+0110`, `U+00F0 → U+0111` ở mọi trường chữ.
- `admin1` có thể không dấu ("Lam Dong") hoặc có dấu tùy dữ liệu: hiển thị nguyên văn.

### 3.2 Dự báo theo ngày
```
GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}
    &daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,
           precipitation_sum,wind_speed_10m_max,uv_index_max
    &timezone=auto&forecast_days=16
```
- `timezone=auto` → `daily.time` là ngày **theo giờ địa phương của điểm đến**, khớp với ngày của chuyến.
- Mỗi mảng trong `daily` có thể chứa `null` (vd `precipitation_probability_max`, `uv_index_max` ở các ngày xa) → map thành `null`, FE ẩn trường đó.
- Đơn vị mặc định: °C, mm, km/h.

### 3.3 Dữ liệu quá khứ (chỉ W3)
```
GET https://archive-api.open-meteo.com/v1/archive?latitude=..&longitude=..&start_date=..&end_date=..
    &daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto
```

### 3.4 Điều khoản
- Miễn phí cho mục đích phi thương mại, ~10.000 lượt/ngày. Nếu sau này thu phí người dùng: mua gói, đổi `WEATHER_FORECAST_URL`/`WEATHER_GEOCODING_URL` sang `customer-*` và thêm `WEATHER_API_KEY` (đã chừa sẵn cấu hình, §5.5).
- CC BY 4.0: mọi chỗ hiện dữ liệu phải có dòng "Dữ liệu thời tiết: Open-Meteo.com" (link `https://open-meteo.com/`).
- Dữ liệu gửi ra ngoài chỉ là **tọa độ điểm đến** (đã làm tròn) và chuỗi tìm kiếm địa điểm; không gửi thông tin người dùng.

---

## 4. Kiến trúc

### 4.1 Package `com.tripplanner.weather`
```
weather/
  WeatherProvider.java          interface: search(q), forecast(lat, lon), archive(...)   ← test mock
  OpenMeteoProvider.java        RestClient + JdkClientHttpRequestFactory (timeout), parse JSON, chuẩn hóa Ð
  WeatherCache.java             cache có TTL + giới hạn mục + single-flight + negative cache (dùng Clock)
  WeatherService.java           ghép vị trí hiệu lực + ForecastWindow + cache → TripWeatherResponse
  GeoController.java            GET /api/v1/geo/search
  WeatherController.java        GET /api/v1/trips/{tripId}/weather
  WeatherCodes.java             thuần: mã WMO → Condition (+ nhãn tiếng Việt, emoji cho email)
  Condition.java                enum
  ForecastWindow.java           thuần: quyết định trạng thái từng ngày
  WeatherAdvice.java            thuần (W2): sinh gợi ý từ dự báo
  ClimateAggregator.java        thuần (W3): tính trung bình nhiều năm
  model/                        GeoPlace, DailyForecast, ForecastSnapshot (record nội bộ)
  dto/                          GeoPlaceResponse, TripWeatherResponse, DayWeatherResponse, ForecastResponse, AdviceResponse
```

### 4.2 Luồng một request thời tiết
1. `TripAccessService.require(tripId, userId, VIEWER)`.
2. Lấy chuyến + danh sách ngày (id, `day_index`, ngày suy ra, overflow; W2: vị trí riêng).
3. `ForecastWindow` phân loại sơ bộ từng ngày. **Chỉ khi có ít nhất 1 ngày nằm trong `[hôm nay, hôm nay + 15]` mới gọi cache/provider** (chuyến còn xa hoặc đã qua → 0 lượt gọi).
4. Với mỗi vị trí hiệu lực khác nhau (thường 1, W2 thường ≤ 3): `WeatherCache.get(key)`.
5. Ghép kết quả → `TripWeatherResponse`. Provider lỗi → các ngày đó là `UNAVAILABLE`, **HTTP vẫn 200**.

### 4.3 `WeatherCache`
- Khóa: tọa độ làm tròn 2 chữ số (`BigDecimal.setScale(2, HALF_UP)`); **gọi provider bằng chính tọa độ đã làm tròn** để mọi chuyến cùng khu vực dùng chung 1 bản.
- Giá trị: `ForecastSnapshot(fetchedAt, Map<LocalDate, DailyForecast>)`.
- **Tươi** trong `cache-ttl-minutes` (mặc định 120): trả luôn, không gọi.
- Hết tươi → gọi provider; thành công thì thay; **lỗi thì trả bản cũ** nếu chưa quá `stale-max-hours` (24), đồng thời ghi nhớ lỗi `negative-ttl-seconds` (120) để các request sau trong 2 phút không gọi lại.
- **Single-flight:** nhiều request cùng khóa cùng lúc → chỉ 1 lượt gọi, các request khác chờ kết quả đó (khóa theo key, `ConcurrentHashMap<String, CompletableFuture>`).
- Giới hạn `max-entries` (300): `LinkedHashMap` access-order, bỏ mục dùng lâu nhất; truy cập trong `synchronized`.
- Geocoding dùng một instance cache riêng (khóa = chuỗi tìm kiếm đã chuẩn hóa: trim, lowercase, gộp khoảng trắng), TTL 24 h, 300 mục.
- Thời gian lấy từ `Clock` được inject để unit test.

### 4.4 `ForecastWindow` (thuần, unit test)
Đầu vào: ngày của "Ngày N" (`LocalDate` hoặc null), có vị trí hay không, hôm nay (`Clock` Asia/Ho_Chi_Minh), snapshot (có thể null/lỗi).

| Thứ tự kiểm | Điều kiện | `status` |
|---|---|---|
| 1 | Ngày null (chưa chốt / ngày thừa) | `NO_DATE` |
| 2 | Không có vị trí hiệu lực | `NO_LOCATION` |
| 3 | Ngày < hôm nay | `PAST` |
| 4 | Snapshot có ngày đó | `FORECAST` |
| 5 | Ngày > hôm nay + 15 (hoặc > ngày cuối của snapshot) | `TOO_FAR`, `availableFrom = ngày - 15` |
| 6 | Còn lại (provider lỗi, không có bản cũ) | `UNAVAILABLE` |

### 4.5 `WeatherCodes` (thuần, unit test)
| Mã WMO | Condition | Nhãn | Emoji (email) |
|---|---|---|---|
| 0 | `CLEAR` | Trời quang | ☀️ |
| 1, 2 | `PARTLY_CLOUDY` | Ít mây | 🌤️ |
| 3 | `CLOUDY` | Nhiều mây | ☁️ |
| 45, 48 | `FOG` | Sương mù | 🌫️ |
| 51, 53, 55, 56, 57 | `DRIZZLE` | Mưa phùn | 🌦️ |
| 61, 63, 80, 81 | `RAIN` | Mưa / Mưa rào | 🌧️ |
| 65, 66, 67, 82 | `HEAVY_RAIN` | Mưa to | 🌧️ |
| 71, 73, 75, 77, 85, 86 | `SNOW` | Tuyết | ❄️ |
| 95, 96, 99 | `THUNDERSTORM` | Dông | ⛈️ |
| khác / null | `UNKNOWN` | Không rõ | 🌡️ |

Nhãn chi tiết hơn được phép (vd 80 → "Mưa rào nhẹ", 81 → "Mưa rào"), nhưng Condition giữ đúng bảng trên. FE map Condition → icon lucide (`Sun`, `CloudSun`, `Cloud`, `CloudFog`, `CloudDrizzle`, `CloudRain`, `CloudRainWind`, `Snowflake`, `CloudLightning`, `Thermometer`).

---

## 5. Phase W1 – Vị trí chuyến + dự báo theo ngày

### 5.1 Migration `V10__trip_destination_location.sql`
```sql
ALTER TABLE trips
    ADD COLUMN destination_lat DECIMAL(7,5) NULL AFTER destination,
    ADD COLUMN destination_lon DECIMAL(8,5) NULL AFTER destination_lat,
    ADD CONSTRAINT chk_trips_destination_coords CHECK (
        (destination_lat IS NULL AND destination_lon IS NULL)
        OR (destination_lat BETWEEN -90 AND 90 AND destination_lon BETWEEN -180 AND 180));
```
- Entity `Trip`: `BigDecimal destinationLat/destinationLon` với `@Column(precision = 7/8, scale = 5)` (để `ddl-auto=validate` khớp DECIMAL).
- **BCNF:** `destination` (chữ người dùng gõ/chọn) và tọa độ là 2 thông tin độc lập; không lưu tên tỉnh/quốc gia riêng (đã nằm trong chữ `destination` khi chọn gợi ý). Không lưu dự báo.

### 5.2 Sửa contract chuyến
- `TripRequest` thêm `BigDecimal destinationLat`, `BigDecimal destinationLon` (cả hai hoặc không cái nào; `-90..90`, `-180..180`). Vẫn theo quy ước "FE gửi đủ form, null = xóa" → gõ lại điểm đến bằng tay mà không chọn gợi ý thì FE gửi tọa độ null = **xóa vị trí**.
- Chỉ có 1 trong 2, hoặc ngoài khoảng → `INVALID_LOCATION` (400).
- Quyền: như sửa chuyến hiện tại (EDITOR+).
- `TripDetailResponse` thêm `destinationLat`, `destinationLon` (number | null).
- `TripSummaryResponse` **không** đổi.

### 5.3 `GET /api/v1/geo/search?q=`
- Cần đăng nhập. `q` sau khi trim: 2–100 ký tự, không thì 400 (`fieldErrors.q`).
- Trả tối đa 8 `GeoPlaceResponse`:
```json
[{ "name": "Đà Lạt", "region": "Lam Dong", "country": "Việt Nam", "countryCode": "VN",
   "lat": 11.94646, "lon": 108.44193, "label": "Đà Lạt, Lam Dong, Việt Nam" }]
```
- `label` = `name` + `region` (nếu có và khác `name`) + `country` (nối bằng ", "). FE dùng `label` làm giá trị ô "Điểm đến" khi chọn (cắt còn 150 ký tự).
- Sắp xếp giữ thứ tự của Open-Meteo (đã ưu tiên dân số).
- Provider lỗi (và không có cache) → `GEO_SEARCH_UNAVAILABLE` (503). Đây là endpoint duy nhất trả lỗi khi Open-Meteo sập, vì người dùng đang chủ động tìm.

### 5.4 `GET /api/v1/trips/{tripId}/weather` (VIEWER+)
```json
{
  "source": "Open-Meteo.com",
  "fetchedAt": "2026-11-25T07:00:00Z",
  "days": [
    { "dayId": 41, "dayIndex": 1, "date": "2026-12-05", "placeName": "Đà Lạt, Lam Dong, Việt Nam",
      "status": "FORECAST", "availableFrom": null,
      "forecast": { "weatherCode": 80, "condition": "RAIN", "label": "Mưa rào nhẹ",
                    "tempMin": 16.9, "tempMax": 20.5, "precipProbability": 96,
                    "precipSum": 7.4, "windMax": 18.0, "uvMax": 6.45 } },
    { "dayId": 42, "dayIndex": 2, "date": "2026-12-28", "placeName": "Đà Lạt, Lam Dong, Việt Nam",
      "status": "TOO_FAR", "availableFrom": "2026-12-13", "forecast": null }
  ]
}
```
- `days` theo thứ tự `day_index`, gồm **mọi** ngày (kể cả overflow → `NO_DATE`) để FE tra theo `dayId`.
- `fetchedAt`: thời điểm lấy dữ liệu **cũ nhất** trong các snapshot đã dùng; null nếu không có ngày `FORECAST`.
- `placeName` (W1) = `trips.destination` khi có tọa độ, ngược lại null.
- Không bao giờ trả 5xx vì Open-Meteo: lỗi thể hiện bằng `UNAVAILABLE`.
- `app.weather.enabled=false` → mọi ngày có ngày + vị trí đều là `UNAVAILABLE`, không gọi ra ngoài; geo search trả `GEO_SEARCH_UNAVAILABLE`.

### 5.5 Cấu hình (`AppProperties.Weather`, prefix `app.weather`)
```yaml
app:
  weather:
    enabled: ${WEATHER_ENABLED:true}
    forecast-url: ${WEATHER_FORECAST_URL:https://api.open-meteo.com/v1/forecast}
    geocoding-url: ${WEATHER_GEOCODING_URL:https://geocoding-api.open-meteo.com/v1/search}
    archive-url: ${WEATHER_ARCHIVE_URL:https://archive-api.open-meteo.com/v1/archive}
    api-key: ${WEATHER_API_KEY:}          # trống = gói miễn phí; có thì thêm &apikey=
    forecast-days: 16
    cache-ttl-minutes: 120
    stale-max-hours: 24
    negative-ttl-seconds: 120
    max-entries: 300
    connect-timeout-ms: 2000
    read-timeout-ms: 3000
```
- Profile test: giữ mặc định nhưng `WeatherProvider` bị `@MockitoBean` trong integration test → không gọi mạng.
- `docker-compose.prod.yml`: thêm `WEATHER_ENABLED: ${WEATHER_ENABLED:-true}` (các biến khác dùng mặc định). `.env.prod.example` ghi chú biến này.
- Log: `WARN` một dòng khi gọi lỗi (kèm khóa vị trí, không kèm stack trace với lỗi timeout/IO).

### 5.6 Mã lỗi mới (thêm vào `ErrorCode` **và** `frontend/src/types/api.ts`)
| Code | HTTP | Thông điệp |
|---|---|---|
| `INVALID_LOCATION` | 400 | Vị trí không hợp lệ, hãy chọn lại điểm đến từ gợi ý |
| `GEO_SEARCH_UNAVAILABLE` | 503 | Chưa tìm được địa điểm lúc này, thử lại sau |

### 5.7 Frontend (W1)
- `types/weather.ts` (copy 1:1 DTO), `api/weather.ts`, `hooks/useWeather.ts`:
  - `useTripWeather(tripId, enabled)`: key `[...tripKeys.detail(tripId), 'weather']` (nằm **dưới** `detail` nên chốt/mở chốt ngày hay sửa chuyến tự làm mới), `refetchInterval: false`, `staleTime: 30 phút`. Chỉ bật khi chuyến đã chốt ngày.
  - `useGeoSearch(q)`: debounce 400 ms, chỉ chạy khi `q.trim().length >= 2`, `staleTime: 1 ngày`, `refetchInterval: false`.
- `types/trip.ts`: thêm `destinationLat`, `destinationLon` vào `TripDetail` và request.
- `components/PlacePicker.tsx` (combobox; hiện chưa có `popover`/`command` → `npx shadcn@latest add popover command`, thêm `cmdk` ở FE, không ảnh hưởng server):
  - Gõ → danh sách gợi ý (tên đậm, tỉnh + quốc gia mờ). Chọn → ô = `label`, lưu tọa độ.
  - Gõ sửa sau khi đã chọn → bỏ tọa độ, hiện gợi ý nhỏ "Chọn từ gợi ý để xem được thời tiết". Vẫn cho lưu chữ tự do.
  - Đang có tọa độ → icon 📍 xanh trong ô.
  - Lỗi 503 → dòng mờ "Không tìm được gợi ý lúc này", vẫn gõ tự do được.
- `TripFormDialog`: thay ô "Điểm đến" bằng `PlacePicker`; gửi `destinationLat/Lon`.
- `components/itinerary/WeatherBadge.tsx` (trên viên ngày `DayPill`): thay chấm tròn cạnh "Ngày N" bằng icon nhỏ + `tempMax°` khi `FORECAST`; trạng thái khác giữ chấm tròn như cũ.
- `components/itinerary/DayWeatherCard.tsx` (đầu mỗi ngày, trên `DressCodeCard`):
  - `FORECAST`: icon lớn, nhãn, `tempMin–tempMax°C`, 💧 `precipProbability%` (+ `precipSum` mm nếu ≥ 1), gió nếu `windMax ≥ 40` km/h, UV nếu `uvMax ≥ 8`. Dòng chân: "Cập nhật HH:mm · Dữ liệu Open-Meteo" (link).
  - `TOO_FAR`: một dòng mờ "🌤️ Dự báo thời tiết có từ dd/MM".
  - `NO_LOCATION`: EDITOR+ thấy nút nhỏ "Gắn vị trí điểm đến để xem thời tiết" → mở `TripFormDialog`; VIEWER không thấy gì.
  - `UNAVAILABLE`: dòng mờ "Chưa lấy được dự báo thời tiết".
  - `PAST`, `NO_DATE`: không hiện.
- Không hiện gì khi đang tải lần đầu (không skeleton) để tránh nhảy layout; card có `min-h` cố định khi đã có dữ liệu.

### 5.8 Kiểm thử (W1)
- Unit: `WeatherCodesTest` (mọi mã trong bảng, mã lạ/null → `UNKNOWN`), `ForecastWindowTest` (6 nhánh, biên hôm nay/hôm nay+15/+16), `WeatherCacheTest` (tươi không gọi lại, hết hạn gọi lại, lỗi trả bản cũ, quá 24 h → lỗi, negative cache 2 phút, LRU bỏ mục cũ, 10 luồng cùng khóa → provider gọi 1 lần), `OpenMeteoProviderTest` với `MockRestServiceServer` + JSON mẫu (mảng có `null`, không có `results`, chuẩn hóa `Ð`, gửi tọa độ đã làm tròn, có/không `apikey`).
- Integration (`WeatherProvider` mock): `TripWeatherIntegrationTest`
  - chuyến chưa chốt → mọi ngày `NO_DATE`, **provider không được gọi**;
  - chốt ngày trong tầm, chưa có tọa độ → `NO_LOCATION`, không gọi;
  - có tọa độ → `FORECAST` cho ngày trong snapshot, `TOO_FAR` + `availableFrom` cho ngày xa;
  - chuyến hoàn toàn > 16 ngày tới → không gọi provider;
  - provider ném lỗi → 200 + `UNAVAILABLE`;
  - người ngoài nhóm → 403; ngày overflow → `NO_DATE`.
- `TripIntegrationTest` bổ sung: PATCH có đủ tọa độ → lưu và trả về; chỉ 1 tọa độ / ngoài khoảng → 400 `INVALID_LOCATION`; tọa độ null → xóa.
- `GeoSearchIntegrationTest`: q quá ngắn → 400; provider lỗi → 503 `GEO_SEARCH_UNAVAILABLE`; kết quả map đúng `label`.

### 5.9 Nghiệm thu (W1)
Chọn "Đà Lạt" từ gợi ý → lưu → chốt ngày trong 16 ngày tới → tab Lịch trình hiện icon + nhiệt độ ở viên ngày và card thời tiết đầu mỗi ngày; F5 nhiều lần / nhiều người mở không làm tăng lượt gọi Open-Meteo trong 2 giờ (xem log).

---

### 5.10 Ghi chú contract đã chốt khi triển khai W1
- `Coordinates` (record, `weather/`) là nơi duy nhất kiểm tra tọa độ: thiếu 1 trong 2 hoặc ngoài khoảng → `INVALID_LOCATION`; làm tròn 5 chữ số; `rounded()`/`cacheKey()` làm tròn 2 chữ số. `TripService.applyRequest` gọi `Coordinates.ofNullable`.
- `q` của `/geo/search` sai độ dài → `VALIDATION_ERROR` (400, không có `fieldErrors`). Khóa cache geocoding = chuỗi đã gộp khoảng trắng + lowercase; cache gợi ý tươi 24 h, dùng bản cũ tối đa 48 h.
- `WeatherService` đọc DB trong `TransactionTemplate` read-only rồi mới gọi API (không giữ kết nối DB khi chờ mạng). `clearCaches()` (package-private) cho test.
- `WeatherCache<V>` dùng chung cho dự báo và geocoding (2 instance). `fetchedAt` của response = lúc lấy snapshot (1 vị trí ở W1).
- HTTP: `RestClient` + `JdkClientHttpRequestFactory` (connect 2 s, read 3 s); tham số người dùng nhập đi qua biến URI (`{name}`) nên `&`, `+`, `#` được mã hóa đúng. Có `WEATHER_API_KEY` thì thêm `&apikey=`.
- `IntegrationTest` (base) mock `WeatherProvider` bằng `@MockitoBean` → không test nào gọi mạng; test coordinate của chuyến nằm trong `WeatherIntegrationTest` (không sửa `TripIntegrationTest`).
- FE: **không** cài `popover`/`command` của Shadcn. `PlacePicker` tự làm combobox (ARIA `combobox`/`listbox`, phím ↑ ↓ Enter Esc), danh sách gợi ý nằm ngay dưới ô (không popover) để không bị cắt trong dialog cuộn và dễ chạm trên điện thoại. Chọn gợi ý bằng `mousedown` để kịp trước `blur`.
- FE: `useTripWeather` chỉ bật khi itinerary có ngày thật; `refetchOnWindowFocus: false`. Viên ngày chỉ thay chấm tròn bằng icon + `tempMax°` khi `FORECAST`. `ItineraryTab` nhận thêm `onEditTrip` để nút "Chọn vị trí" mở form sửa chuyến.
- **Tìm địa điểm chi tiết (bổ sung sau W1, theo yêu cầu "tìm được cả xã, vd Tà Xùa"):** geocoding Open-Meteo (GeoNames) thiếu làng/bản, xã, thắng cảnh nhỏ ("Tà Xùa", "Hồ Ba Bể", "Pù Luông", "thác Bản Giốc" không ra hoặc ra nhầm). Nay `OpenMeteoProvider.search` gọi **song song** (virtual threads) Open-Meteo và **Photon** (`PhotonGeocoder`, photon.komoot.io, dữ liệu OpenStreetMap, được làm cho ô gõ-gợi-ý; Nominatim bị loại vì điều khoản cấm autocomplete), rồi gộp bằng `GeoResults` (thuần):
  - Photon chỉ giữ nơi đến theo bảng `PhotonGeocoder.KINDS` (`osm_key:osm_value` → nhãn tiếng Việt: thành phố, làng/bản, xã, đảo, núi, hồ, thác, vịnh, bãi biển, khu bảo tồn, điểm ngắm cảnh…); bỏ đường, cửa hàng, khách sạn, kết quả không tên. GeoJSON là `[lon, lat]`.
  - Bỏ trùng: cùng `key` (chữ thường, bỏ tiền tố hành chính "xã/phường/huyện/thành phố/…" **trước khi** bỏ dấu, rồi bỏ dấu) và lệch < 0,1° (~11 km).
  - Xếp hạng (ổn định): Việt Nam trước → đúng tên từ khóa → chứa từ khóa → còn lại; cùng hạng giữ thứ tự nguồn (Open-Meteo trước Photon). Tối đa 8.
  - Một nguồn lỗi → dùng nguồn còn lại; cả hai lỗi → `GEO_SEARCH_UNAVAILABLE`.
  - `GeoPlaceResponse` thêm `area` (xã/huyện; bỏ nếu trùng tên) và `kind` (loại địa điểm); `label` = tên + area + tỉnh + quốc gia. FE hiện nhãn loại cạnh tên gợi ý.
  - Cấu hình `app.weather.photon-url` (`WEATHER_PHOTON_URL`, mặc định `https://photon.komoot.io/api/`; trống = chỉ dùng Open-Meteo). Gửi `User-Agent: TeamTripPlanner/1.0 (…)`, không kèm thông tin người dùng.
  - Kiểm chứng thật: "Tà Xùa" → bản Tà Xùa (Lào Cai), Xã Tà Xùa (Sơn La), Cây cô đơn Tà Xùa; "Hồ Ba Bể" → hồ (Thái Nguyên); "Pù Luông" → Pù Luông + khu bảo tồn (Thanh Hóa); "Bản Giốc" → thác (Cao Bằng) trước bản phía Trung Quốc. Hạn chế: tên rất phổ biến (vd "Đồng Văn") có nhiều làng trùng tên, nơi nổi tiếng chưa chắc lên đầu; gõ kèm tỉnh ("Đồng Văn Hà Giang") chưa hỗ trợ.
- Đã kiểm chứng với Open-Meteo thật (chạy backend local): tìm "Phú Quốc" → 2 gợi ý; chuyến 04–07/12 → 4 ngày `FORECAST`; lần gọi đầu ~0,8 s, lần sau từ cache ~40 ms.

## 6. Phase W2 – Vị trí từng ngày, gợi ý, email

### 6.1 Migration `V11__trip_day_location.sql`
```sql
ALTER TABLE trip_days
    ADD COLUMN place_name VARCHAR(150) NULL,
    ADD COLUMN place_lat DECIMAL(7,5) NULL,
    ADD COLUMN place_lon DECIMAL(8,5) NULL,
    ADD CONSTRAINT chk_trip_days_place CHECK (
        (place_name IS NULL AND place_lat IS NULL AND place_lon IS NULL)
        OR (place_name IS NOT NULL AND place_lat BETWEEN -90 AND 90 AND place_lon BETWEEN -180 AND 180));
```
- Vị trí gắn vào "Ngày N" nên **đi theo ngày** khi mở chốt/chốt lại, giống lịch trình.
- `UpdateDayRequest` thêm `placeName`, `placeLat`, `placeLon` (cả ba hoặc không; quy ước "gửi đủ form, null = xóa"). Quyền: như `updateDay` hiện tại (EDITOR+). Sai → `INVALID_LOCATION`.
- `ItineraryDayResponse` thêm `place: { name, lat, lon } | null` (chỉ vị trí **riêng** của ngày).
- `WeatherService`: vị trí hiệu lực = vị trí riêng của ngày, không có thì của chuyến; `placeName` trong response theo vị trí hiệu lực.
- FE: hộp thoại sửa ngày (`DressCodeDialog`, vốn gửi đủ `UpdateDayRequest`) thêm trường "Địa điểm ngày này (bỏ trống = theo chuyến)" dùng `PlacePicker`. `DayWeatherCard` hiện `placeName` khi khác vị trí của chuyến.

### 6.2 `WeatherAdvice` (thuần, unit test)
Từ 1 `DailyForecast` sinh tối đa **2** gợi ý, theo độ ưu tiên:

| Ưu tiên | `type` | Điều kiện | Nội dung | Món checklist gợi ý |
|---|---|---|---|---|
| 1 | `STORM` | Condition `THUNDERSTORM` | Có thể có dông, hạn chế hoạt động ngoài trời/biển | Áo mưa (`OTHER`) |
| 2 | `RAIN` | `precipProbability ≥ 60` hoặc `precipSum ≥ 5` | Khả năng mưa {p}% – nhớ mang áo mưa/ô | Áo mưa (`OTHER`) |
| 3 | `COLD` | `tempMin ≤ 15` | Trời lạnh {tMin}°C – mang áo ấm | Áo khoác ấm (`OTHER`) |
| 4 | `HOT` | `tempMax ≥ 35` | Nắng nóng {tMax}°C – uống đủ nước | – |
| 5 | `UV` | `uvMax ≥ 8` | UV rất cao – kem chống nắng, mũ | Kem chống nắng (`MEDICAL`) |
| 6 | `WIND` | `windMax ≥ 40` | Gió mạnh – cân nhắc hoạt động trên biển | – |

- `STORM` và `RAIN` không cùng xuất hiện (cùng món checklist). Ngưỡng là hằng số trong class.
- `ForecastResponse` thêm `advice: AdviceResponse[]` (`type`, `text`, `checklistItem: { itemName, category } | null`).
- FE: badge gợi ý dưới `DayWeatherCard`. EDITOR+ thấy nút **"Thêm vào checklist"** → gọi endpoint có sẵn `POST /trips/{id}/checklist` (`quantity 1`, `assigneeId null`). Nếu checklist (query đã có trong cache) đã có món cùng tên (so không phân biệt hoa thường) → nút thành "Đã có trong checklist" (disabled). **Không** thêm endpoint backend.

### 6.3 Thời tiết trong email đếm ngược
- `CountdownJob`: với mỗi chuyến đến mốc, lấy thời tiết **1 lần** (qua `WeatherService`, dùng cache) **trước** khi ghi outbox, không giữ transaction DB trong lúc gọi HTTP.
- `CountdownContentBuilder.shared(...)` thêm `weather`: tối đa 3 ngày đầu có `FORECAST`, mỗi ngày gồm `dayIndex`, `date`, `placeName`, `emoji`, `label`, `tempMin`, `tempMax`, `precipProbability`, `advice` (chỉ `text`). Lỗi / không có ngày nào → bỏ khóa `weather` (mail không có khối này).
- `countdown.html|.txt`: khối "Thời tiết dự kiến" sau khối ngày 1, mỗi ngày 1 dòng: `☀️ Ngày 1 · T6 05/12 · 18–24°C · 💧 30%` + gợi ý in nghiêng; dòng nguồn "Dữ liệu thời tiết: Open-Meteo.com". Comment template dùng `<!--/* */-->`.
- Payload là snapshot lúc 08:00 (đúng cơ chế outbox hiện tại).

### 6.4 Kiểm thử (W2)
- Unit: `WeatherAdviceTest` (từng ngưỡng, biên, tối đa 2, STORM loại RAIN), `NotificationMailBuilderTest` có/không khối thời tiết.
- Integration: vị trí riêng của ngày ghi đè vị trí chuyến (2 vị trí → provider gọi 2 khóa); `updateDay` thiếu 1 trong 3 trường → 400; mở chốt/chốt lại giữ vị trí ngày; `CountdownJobIntegrationTest` có `weather` trong payload khi provider trả dữ liệu, không có khi provider lỗi (job vẫn ghi outbox bình thường).

---

## 7. Phase W3 (tùy chọn) – Khí hậu thường thấy khi đang chọn ngày

- Áp dụng khi chuyến **chưa chốt** nhưng có `planned_start_date..planned_end_date` và có vị trí.
- `GET /api/v1/trips/{tripId}/climate` (VIEWER+) →
```json
{ "years": 5, "from": "12-15", "to": "12-20", "placeName": "Đà Lạt, Lam Dong, Việt Nam",
  "avgTempMin": 14.2, "avgTempMax": 22.8, "rainyDayRatio": 0.33, "avgPrecipSum": 2.1,
  "status": "OK" }
```
  `status`: `OK` · `NO_RANGE` · `NO_LOCATION` · `UNAVAILABLE`.
- 1 lượt gọi archive cho 5 năm gần nhất (từ `from` năm-5 đến `to` năm-1, ~1.800 dòng, ~40 KB), `ClimateAggregator` (thuần) chỉ lấy các ngày trùng khoảng ngày-tháng, xử lý khoảng vắt qua năm (20/12 → 03/01). "Ngày mưa" = `precipitation_sum ≥ 1 mm`.
- Cache 30 ngày, khóa `(tọa độ làm tròn, MM-dd từ, MM-dd đến)`, chung giới hạn 300 mục.
- FE: một dòng ở đầu tab Lịch rảnh: "🌡️ Giữa tháng 12 ở Đà Lạt thường 14–23°C, khoảng 2/6 ngày có mưa (trung bình 5 năm)".
- Test: `ClimateAggregatorTest` (khoảng thường, vắt năm, năm nhuận 29/02, dữ liệu thiếu).

---

## 8. Ghi chú vận hành
- **RAM:** ước tính tăng < 5 MB heap (cache + RestClient). Không đổi `mem_limit`. Vẫn nên xem xét giảm `JAVA_OPTS` vì máy đang dùng swap (không liên quan tính năng này).
- **Mạng:** container backend cần ra Internet qua HTTPS (443) tới `*.open-meteo.com`. Nginx máy chủ không cần sửa.
- **Lượt gọi ước tính:** mỗi vị trí đang có người xem ≈ 12 lượt/ngày (TTL 2 h) + geocoding khi tạo/sửa chuyến → vài trăm lượt/ngày, rất xa ngưỡng 10.000.
- **Tắt khẩn cấp:** `WEATHER_ENABLED=false` rồi `up -d backend`; UI tự ẩn phần thời tiết.
- Cập nhật `CLAUDE.md` (kiến trúc `weather`, quy tắc vị trí, cache) sau mỗi phase.

## 9. Cần chốt trước khi code
1. Q1–Q5 ở §1.3 (mặc định đang theo đề xuất).
2. Ngưỡng gợi ý ở §6.2 (mưa 60%, lạnh ≤ 15°C, nóng ≥ 35°C, UV ≥ 8, gió ≥ 40 km/h) có hợp không.
3. Có làm W3 không, hay dừng ở W2.
