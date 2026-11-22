# SDD – PHASE 1: Khung dự án, Xác thực & Chuyến đi

**Dự án:** Team Trip Planner
**Phạm vi:** Phase 1 theo kế hoạch 5 phase đã chốt (Google login + username/password, không xin quyền Drive)
**Thời lượng dự kiến:** 1 ngày làm tập trung
**Trạng thái:** Approved (đã đồng bộ với `AGENT_RULE.md`: MySQL 8, `/api/v1`, ProblemDetail, Shadcn UI, Lombok, Swagger)

---

## 1. Mục tiêu & Phạm vi

### 1.1 Mục tiêu
Kết thúc Phase 1, thành viên có thể:
1. Đăng ký/đăng nhập bằng **username/password** hoặc **Google**.
2. Tạo chuyến đi (tên, điểm đến, mô tả, ảnh bìa, khoảng thời gian dự kiến).
3. Gửi **link mời** vào Zalo/Messenger. Người nhận bấm link, đăng nhập, rồi vào thẳng nhóm.
4. Xem danh sách chuyến đi kèm **trạng thái** và **đếm ngược** đến ngày đi.
5. Owner quản lý thành viên: đổi quyền, xóa thành viên, tạo lại mã mời.

### 1.2 Trong phạm vi
- Khởi tạo project Spring Boot (BE) và cài thư viện cho FE.
- Bảng `users`, `trips`, `trip_members` (migration `V1`).
- Auth: đăng ký, đăng nhập, Google ID token, JWT.
- API cho chuyến đi và thành viên, tham gia qua mã mời.
- FE gồm các trang: Login, Register, Dashboard, Chi tiết chuyến đi (tổng quan + thành viên), Join.

### 1.3 Ngoài phạm vi (để phase sau)
| Hạng mục | Phase |
|---|---|
| Lịch rảnh, gợi ý ngày, chốt ngày, tạo `trip_days` | 2 |
| Lịch trình, checklist, dress code | 3 |
| Bình chọn, chia tiền, QR, thông tin ngân hàng của user | 4 |
| Album, chia phòng, ảnh xem trước khi share link (`/share/{code}`), deploy production | 5 |
| Refresh token, quên mật khẩu, rate limit đăng nhập | Chưa lên kế hoạch |

---

## 2. Kiến trúc tổng quan

```
┌──────────────────────┐   HTTPS/JSON + Bearer JWT   ┌───────────────────────┐      ┌──────────────┐
│ frontend/: React+Vite│ ──────────────────────────▶ │ backend/: Spring Boot │ ───▶ │ MySQL 8.0    │
│ Tailwind, Shadcn UI, │                             │ 3.5.x, Security,      │      │ (Flyway)     │
│ Router, TanStack Q.  │ ◀── Google ID token (GIS) ──│ JPA, Validation, Docs │      └──────────────┘
└──────────────────────┘                             └───────────┬───────────┘
          │ Google Identity Services                             │ verify ID token (JWKS)
          ▼                                                      ▼
                         accounts.google.com
```

### 2.1 Quyết định kỹ thuật
| Chủ đề | Quyết định | Lý do |
|---|---|---|
| Ngôn ngữ / build BE | Java 21, **Maven** + wrapper `mvnw` | LTS, phổ biến |
| Framework | Spring Boot **3.5.x**: Web, Security, OAuth2 Resource Server, Data JPA, Validation, Flyway (+ `flyway-mysql`), Lombok, springdoc-openapi (Swagger UI) | Đúng spec (3.x) + AGENT_RULE |
| Database | **MySQL 8.0** (`utf8mb4`): bản cài sẵn khi chạy local, Aiven/TiDB free tier khi lên production | Theo AGENT_RULE, có sẵn trên máy |
| API | Prefix **`/api/v1`**, lỗi trả theo **ProblemDetail** (RFC 9457) | Theo AGENT_RULE |
| Google login | FE dùng **Google Identity Services** để lấy **ID token**, BE verify rồi cấp JWT riêng | Không cần redirect OAuth phía server, đơn giản cho SPA. Chỉ xin scope `openid email profile`, không cần Google xác minh ứng dụng |
| JWT | HS256, secret lấy từ env, hết hạn sau **7 ngày**, chưa có refresh token | Nhóm nhỏ, ưu tiên làm nhanh |
| Lưu token FE | `localStorage` | Đơn giản. Đổi lại rủi ro XSS (chấp nhận ở MVP) |
| State FE | **TanStack Query** cho dữ liệu từ server, Context cho phiên đăng nhập | Ít boilerplate, tự cache và refetch |
| UI FE | Tailwind v4 (`@tailwindcss/vite`), **Shadcn UI**, `lucide-react` (icon), `dayjs` (ngày/đếm ngược), `@react-oauth/google`, `sonner` (toast) | Nhanh, nhẹ, theo AGENT_RULE |
| Ảnh bìa | **Dán URL ảnh** hoặc chọn 1 trong 6 gradient mặc định, lưu dạng `preset:<key>` (vd `preset:sunset`) và FE tự vẽ. Không upload | Server không lưu file (zero-storage), không phụ thuộc ảnh bên ngoài |
| Trạng thái chuyến đi | **Tính ra** từ ngày, không lưu thành cột | Tránh dữ liệu dư thừa (BCNF) |

---

## 3. Cấu trúc thư mục

### 3.1 Backend (`backend/`)
```
backend/
├── pom.xml, mvnw, mvnw.cmd
├── .env.example
└── src/
    ├── main/java/com/tripplanner/
    │   ├── TripPlannerApplication.java
    │   ├── common/                   # GlobalExceptionHandler (ProblemDetail), BusinessException, ErrorCode
    │   ├── config/                   # SecurityConfig, JwtProperties, OpenApiConfig
    │   ├── auth/                     # AuthController, AuthService, GoogleTokenVerifier, JwtService, dto/
    │   ├── user/                     # User entity, UserRepository, UserController (/me), dto/
    │   └── trip/                     # Trip, TripMember, TripMemberId, TripRole,
    │                                 # TripController, TripService, TripAccessService,
    │                                 # InviteCodeGenerator, TripStatus, dto/
    ├── main/resources/
    │   ├── application.yml
    │   └── db/migration/V1__init_auth_trips.sql
    └── test/java/com/tripplanner/...
```
Package chia theo **tính năng** (auth/user/trip), không chia theo tầng. Phase sau thêm package mới, ví dụ `availability/`, `itinerary/`.

### 3.2 Frontend (`frontend/src/`)
```
src/
├── main.tsx, App.tsx (router), index.css (Tailwind + theme Shadcn)
├── lib/          api.ts (axios instance + interceptor), queryClient.ts, date.ts (countdown, format), utils.ts (cn)
├── auth/         AuthContext.tsx, ProtectedRoute.tsx, useAuth.ts
├── api/          auth.ts, trips.ts      # hàm gọi API
├── hooks/        useTrips.ts, ...       # TanStack Query hooks (tách khỏi UI)
├── pages/        LoginPage, RegisterPage, DashboardPage, TripDetailPage, JoinPage
├── components/   TripCard, TripFormDialog, CoverPicker, Countdown, StatusBadge,
│                 MemberList, InviteShare, UserAvatar
│   └── ui/       # component do Shadcn CLI sinh ra
└── types/        auth.ts, trip.ts, api.ts  # đồng bộ 1-1 với Java DTO
```

---

## 4. Thiết kế Cơ sở dữ liệu

### 4.1 Migration `V1__init_auth_trips.sql`
```sql
CREATE TABLE users (
    id                BIGINT        NOT NULL AUTO_INCREMENT,
    google_sub        VARCHAR(255)  NULL,
    email             VARCHAR(255)  NULL,
    username          VARCHAR(30)   NULL,
    password_hash     VARCHAR(100)  NULL,
    display_name      VARCHAR(100)  NOT NULL,
    avatar_url        VARCHAR(1000) NULL,
    created_at        DATETIME(6)   NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uq_users_google_sub UNIQUE (google_sub),
    CONSTRAINT uq_users_email      UNIQUE (email),
    CONSTRAINT uq_users_username   UNIQUE (username),
    CONSTRAINT chk_users_login_method CHECK (
        google_sub IS NOT NULL OR (username IS NOT NULL AND password_hash IS NOT NULL)
    )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE trips (
    id                  BIGINT        NOT NULL AUTO_INCREMENT,
    title               VARCHAR(150)  NOT NULL,
    destination         VARCHAR(150)  NULL,
    description         TEXT          NULL,
    cover_image_url     VARCHAR(2000) NULL,
    invite_code         VARCHAR(12)   NOT NULL,
    planned_start_date  DATE          NULL,   -- khoảng dự kiến (để khảo sát lịch rảnh)
    planned_end_date    DATE          NULL,
    start_date          DATE          NULL,   -- ngày chính thức, NULL cho tới khi chốt (Phase 2)
    end_date            DATE          NULL,
    drive_folder_url    VARCHAR(2000) NULL,   -- dùng ở Phase 5
    created_by          BIGINT        NOT NULL,
    created_at          DATETIME(6)   NOT NULL,
    updated_at          DATETIME(6)   NOT NULL,
    CONSTRAINT pk_trips PRIMARY KEY (id),
    CONSTRAINT uq_trips_invite_code UNIQUE (invite_code),
    CONSTRAINT fk_trips_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT chk_trips_planned_range CHECK (planned_start_date IS NULL OR planned_end_date IS NULL OR planned_end_date >= planned_start_date),
    CONSTRAINT chk_trips_range         CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_trips_locked_pair   CHECK ((start_date IS NULL) = (end_date IS NULL))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE trip_members (
    trip_id        BIGINT      NOT NULL,
    user_id        BIGINT      NOT NULL,
    role           VARCHAR(10) NOT NULL,
    joined_at      DATETIME(6) NOT NULL,
    -- Cột kỹ thuật: = trip_id khi là OWNER, NULL khi khác → UNIQUE đảm bảo mỗi trip chỉ 1 OWNER
    owner_trip_id  BIGINT GENERATED ALWAYS AS (CASE WHEN role = 'OWNER' THEN trip_id END) STORED,
    CONSTRAINT pk_trip_members PRIMARY KEY (trip_id, user_id),
    CONSTRAINT fk_trip_members_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_trip_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_trip_members_role CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER')),
    CONSTRAINT uq_trip_single_owner UNIQUE (owner_trip_id),
    INDEX idx_trip_members_user (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
```
- Mọi thời điểm lưu theo **UTC** (`hibernate.jdbc.time_zone=UTC`). Ứng dụng tự gán `created_at`/`updated_at`/`joined_at` (`@PrePersist`/`@PreUpdate`).
- `owner_trip_id` là cột sinh tự động, phụ thuộc hoàn toàn vào khóa `(trip_id, role)`, không mang dữ liệu mới nên không phá BCNF. Entity **không map** cột này.

### 4.2 Ghi chú thiết kế
- **`users` có 2 cách đăng nhập.** Một user có thể có `google_sub`, có cặp `username`/`password_hash`, hoặc có cả hai. Constraint CHECK bảo đảm có ít nhất một cách.
- **`email`** không bắt buộc với tài khoản username. Tài khoản Google luôn có email (lấy từ token).
- **`trips.created_by`** lưu người tạo (không đổi). Còn `OWNER` trong `trip_members` là người quản lý hiện tại và có thể chuyển cho người khác, nên hai cột này không trùng ý nghĩa.
- **Trạng thái chuyến đi** được tính trong `TripStatus` (BE), không lưu cột. Tham chiếu "hôm nay" theo múi giờ `Asia/Ho_Chi_Minh`:

| Điều kiện | Status | Nhãn UI |
|---|---|---|
| `start_date IS NULL` | `PLANNING` | Đang chốt lịch |
| hôm nay < `start_date` | `UPCOMING` | Sắp khởi hành |
| `start_date` ≤ hôm nay ≤ `end_date` | `ONGOING` | Đang đi |
| hôm nay > `end_date` | `COMPLETED` | Đã hoàn thành |

- **JPA:** `TripMember` dùng `@EmbeddedId TripMemberId(tripId, userId)` cùng `@MapsId`. Mọi quan hệ `@ManyToOne` đặt `FetchType.LAZY`. Entity dùng Lombok `@Getter @Setter @NoArgsConstructor` (**cấm `@Data`**). Cấu hình `spring.jpa.hibernate.ddl-auto=validate`: schema chỉ do Flyway quản lý.

---

## 5. Thiết kế Xác thực

### 5.1 Luồng username/password
1. `POST /api/auth/register` kiểm tra dữ liệu, kiểm tra username còn trống, hash mật khẩu bằng **BCrypt** (cost 10), tạo user và trả JWT.
2. `POST /api/auth/login` tìm theo username rồi so khớp BCrypt. Sai username hoặc sai mật khẩu đều trả `401 INVALID_CREDENTIALS` (không tiết lộ username có tồn tại hay không).

**Quy tắc:**
- `username`: 3–30 ký tự, chỉ gồm `[a-z0-9._]`. Tự chuyển về chữ thường.
- `password`: 8–72 ký tự (72 là giới hạn của BCrypt).
- `displayName`: 1–100 ký tự.

### 5.2 Luồng Google
```
FE (GoogleLogin button) ──credential (ID token)──▶ POST /api/auth/google
BE: verify chữ ký bằng JWKS của Google, kiểm tra iss ∈ {accounts.google.com, https://accounts.google.com},
    aud == GOOGLE_CLIENT_ID, exp còn hạn, email_verified == true
    ├─ tìm theo google_sub  → có: đăng nhập
    ├─ không có, tìm theo email → có: gắn google_sub vào user đó (liên kết tài khoản)
    └─ không có: tạo user mới (display_name, avatar_url từ token)
    → trả JWT của hệ thống
```
Verify dùng `NimbusJwtDecoder.withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs")` kèm validator tùy biến cho `iss` và `aud`. Không cần thêm thư viện Google.

### 5.3 JWT của hệ thống
- Claims: `sub` = userId, `name`, `iat`, `exp` (7 ngày).
- BE verify bằng `spring-boot-starter-oauth2-resource-server` với `NimbusJwtDecoder.withSecretKey(...)`. `JWT_SECRET` tối thiểu 32 byte.
- `SecurityConfig`: stateless, tắt CSRF (không dùng cookie), bật CORS theo `CORS_ALLOWED_ORIGINS`.
  - Không cần token: `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/google`, `GET /api/v1/trips/invite/{code}`, `/actuator/health`, Swagger (`/swagger-ui/**`, `/v3/api-docs/**`).
  - Thiếu hoặc sai token: trả `401` dạng ProblemDetail. Không đủ quyền: `403`.
  - Mọi route khác yêu cầu đăng nhập.

### 5.4 FE
- `api.ts`: axios instance có `baseURL = VITE_API_BASE_URL`. Request interceptor gắn `Authorization: Bearer <token>`. Response interceptor gặp `401` thì xóa token và chuyển về `/login?returnTo=<đường dẫn hiện tại>`.
- `ProtectedRoute` giữ lại `returnTo`. Nhờ vậy người bấm link mời `/join/ABCD2345` khi chưa đăng nhập sẽ quay lại đúng trang join sau khi đăng nhập xong.

---

## 6. Đặc tả API

Base path: **`/api/v1`** (các path trong bảng dưới đều tính từ base path này). Body là JSON. Ngày theo định dạng `YYYY-MM-DD`, thời điểm theo ISO-8601 (UTC). Swagger UI: `http://localhost:8080/swagger-ui.html`.

### 6.1 Định dạng lỗi chung (ProblemDetail, RFC 9457)
```json
{ "type": "about:blank", "title": "Bad Request", "status": 400,
  "detail": "Dữ liệu không hợp lệ", "instance": "/api/v1/trips",
  "code": "VALIDATION_ERROR", "fieldErrors": { "title": "Không được để trống" } }
```
`code` luôn có mặt. `fieldErrors` chỉ xuất hiện khi lỗi validation.
| HTTP | code |
|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_DATE_RANGE` |
| 401 | `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `INVALID_GOOGLE_TOKEN` |
| 403 | `FORBIDDEN` (không đủ quyền), `NOT_TRIP_MEMBER` |
| 404 | `TRIP_NOT_FOUND`, `INVITE_NOT_FOUND`, `MEMBER_NOT_FOUND` |
| 409 | `USERNAME_TAKEN`, `OWNER_CANNOT_LEAVE`, `CANNOT_CHANGE_OWNER_ROLE` |

`detail` viết bằng tiếng Việt và được hiển thị thẳng trên UI.

### 6.2 Auth & User
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/auth/register` | – | Đăng ký |
| POST | `/auth/login` | – | Đăng nhập username |
| POST | `/auth/google` | – | Đăng nhập Google |
| GET | `/users/me` | ✓ | Thông tin user hiện tại |
| PATCH | `/users/me` | ✓ | Sửa `displayName`, `avatarUrl` |

```jsonc
// POST /auth/register
{ "username": "linh.ng", "password": "matkhau123", "displayName": "Linh" }
// POST /auth/login
{ "username": "linh.ng", "password": "matkhau123" }
// POST /auth/google
{ "idToken": "<google credential>" }

// 200/201 – response chung của 3 API trên
{ "accessToken": "<jwt>", "expiresAt": "2026-11-29T10:00:00Z",
  "user": { "id": 1, "displayName": "Linh", "username": "linh.ng", "email": null,
            "avatarUrl": null, "hasGoogle": false, "hasPassword": true } }
```

### 6.3 Trips
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/trips` | đã đăng nhập | Tạo chuyến đi. Người tạo thành `OWNER` |
| GET | `/trips` | đã đăng nhập | Danh sách chuyến đi mình tham gia |
| GET | `/trips/{id}` | thành viên | Chi tiết + danh sách thành viên |
| PATCH | `/trips/{id}` | OWNER, EDITOR | Sửa thông tin (title, destination, description, cover, planned dates) |
| DELETE | `/trips/{id}` | OWNER | Xóa chuyến đi |
| POST | `/trips/{id}/invite-code/regenerate` | OWNER | Tạo mã mời mới (mã cũ hết hiệu lực) |
| GET | `/trips/invite/{code}` | **public** | Xem trước chuyến đi trước khi join |
| POST | `/trips/join/{code}` | đã đăng nhập | Tham gia. Mặc định nhận quyền `EDITOR`. Đã là thành viên thì trả về luôn (idempotent) |

```jsonc
// POST /trips  (201)
{ "title": "Đà Lạt mùa hoa", "destination": "Đà Lạt", "description": "Săn mây + cafe",
  "coverImageUrl": "https://...", "plannedStartDate": "2027-03-10", "plannedEndDate": "2027-03-20" }

// GET /trips → 200
[ { "id": 7, "title": "Đà Lạt mùa hoa", "destination": "Đà Lạt", "coverImageUrl": "https://...",
    "status": "PLANNING", "plannedStartDate": "2027-03-10", "plannedEndDate": "2027-03-20",
    "startDate": null, "endDate": null, "myRole": "OWNER", "memberCount": 9,
    "memberAvatars": ["https://...", null, "https://..."] } ]   // tối đa 5 avatar

// GET /trips/{id} → 200
{ "id": 7, "...": "các trường như trên + description, inviteCode, createdAt",
  "inviteCode": "K7MP4QXT",              // chỉ trả cho OWNER/EDITOR, VIEWER nhận null
  "members": [ { "userId": 1, "displayName": "Linh", "avatarUrl": null,
                 "role": "OWNER", "joinedAt": "2026-11-22T12:00:00Z" } ] }

// GET /trips/invite/{code} → 200 (public, không lộ danh sách thành viên)
{ "title": "Đà Lạt mùa hoa", "destination": "Đà Lạt", "coverImageUrl": "https://...",
  "memberCount": 9, "plannedStartDate": "2027-03-10", "plannedEndDate": "2027-03-20" }

// POST /trips/join/{code} → 200
{ "tripId": 7, "role": "EDITOR", "alreadyMember": false }
```
Danh sách sắp xếp theo `PLANNING`/`UPCOMING`/`ONGOING` trước, `COMPLETED` sau. Trong mỗi nhóm, chuyến có ngày gần hơn đứng trước.

Ghi chú contract (chốt khi implement):
- `POST` và `PATCH /trips/{id}` dùng chung body `TripRequest`. PATCH gửi **đủ** các trường của form: trường null/rỗng nghĩa là xóa giá trị đó. Khoảng ngày dự kiến phải nhập cả hai hoặc bỏ trống cả hai.
- `GET /trips` trả `previewMembers: [{ userId, displayName, avatarUrl }]` (tối đa 5 người) thay cho `memberAvatars`, để FE vẽ được avatar chữ cái đầu cho người không có ảnh.
- `GET /trips/invite/{code}` trả thêm `status`, `startDate`, `endDate`.
- `POST /trips/{id}/invite-code/regenerate` trả `{ "inviteCode": "..." }`.

### 6.4 Members
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| PATCH | `/trips/{id}/members/{userId}` | OWNER | Đổi quyền `{ "role": "EDITOR" \| "VIEWER" }` |
| POST | `/trips/{id}/transfer-ownership` | OWNER | `{ "userId": 5 }`: người kia thành OWNER, mình thành EDITOR |
| DELETE | `/trips/{id}/members/{userId}` | OWNER, hoặc chính mình (rời nhóm) | OWNER muốn rời phải chuyển quyền trước (`409 OWNER_CANNOT_LEAVE`) |

Không gán role `OWNER` qua API PATCH mà chỉ qua transfer, vì transfer chạy trong một transaction để không vi phạm `uq_trip_single_owner`.

### 6.5 Mã mời
- 8 ký tự, bảng chữ `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (đã bỏ các ký tự dễ nhầm `0 O 1 I L`), sinh bằng `SecureRandom`.
- Trùng mã thì sinh lại, tối đa 5 lần.
- Khi nhận mã từ URL, BE tự chuyển về chữ hoa.

---

## 7. Ma trận phân quyền (Phase 1)

| Hành động | OWNER | EDITOR | VIEWER | Không phải thành viên |
|---|:-:|:-:|:-:|:-:|
| Xem chi tiết, thành viên | ✓ | ✓ | ✓ | ✗ (403) |
| Xem / copy link mời | ✓ | ✓ | ✗ | ✗ |
| Sửa thông tin chuyến đi | ✓ | ✓ | ✗ | ✗ |
| Đổi quyền, xóa thành viên, chuyển owner | ✓ | ✗ | ✗ | ✗ |
| Tạo lại mã mời, xóa chuyến đi | ✓ | ✗ | ✗ | ✗ |
| Rời nhóm | phải chuyển quyền trước | ✓ | ✓ | – |

Mọi kiểm tra quyền đi qua `TripAccessService.require(tripId, userId, minRole)`. Thứ tự quyền: `VIEWER < EDITOR < OWNER`. Các phase sau dùng lại service này.

---

## 8. Thiết kế Frontend

### 8.1 Routes
| Path | Trang | Bảo vệ |
|---|---|---|
| `/login` | LoginPage: tab username/password + nút "Đăng nhập với Google" | Đã đăng nhập thì chuyển sang `/trips` |
| `/register` | RegisterPage | như trên |
| `/trips` | DashboardPage | ✓ |
| `/trips/:id` | TripDetailPage | ✓ |
| `/join/:code` | JoinPage: xem trước chuyến đi + nút "Tham gia" | Xem trước không cần đăng nhập. Bấm Tham gia khi chưa đăng nhập thì sang `/login?returnTo=/join/:code` |
| `/` | chuyển sang `/trips` | |

### 8.2 Màn hình
**Dashboard (`/trips`)**
- Header có lời chào kèm avatar và menu (đổi tên, đăng xuất).
- Hai nút: **"+ Tạo chuyến đi"** và **"Nhập mã mời"** (mở ô nhập mã rồi chuyển sang `/join/:code`).
- Danh sách `TripCard`: 1 cột trên điện thoại, 2–3 cột trên desktop. Mỗi thẻ hiện:
  - ảnh bìa (có lớp gradient tối để chữ dễ đọc), tên, điểm đến
  - `StatusBadge`, `Countdown`
  - avatar xếp chồng cùng số thành viên
- Khi chưa có chuyến nào: hiện hình minh họa và lời mời "Tạo chuyến đi đầu tiên".

**Countdown** (`lib/date.ts`)

Mốc ngày là `startDate`. Nếu chưa chốt ngày thì dùng `plannedStartDate` và ghi thêm chữ "(dự kiến)".

| Trường hợp | Hiển thị |
|---|---|
| Chưa có mốc ngày | "Chưa có ngày" |
| Còn n > 1 ngày | "Còn **n** ngày" (+ "(dự kiến)") |
| Ngày mai | "Ngày mai lên đường!" |
| Hôm nay | "Hôm nay lên đường! 🎉" |
| Đang đi | "Đang đi – Ngày **k**/**N**" |
| Đã xong | "Đã hoàn thành" |

**CreateTripModal**
- Các trường:
  - Tên (bắt buộc), điểm đến, mô tả
  - Khoảng ngày dự kiến: 2 ô `input type=date`
  - `CoverPicker`: ~6 ảnh/gradient mặc định + ô dán URL ảnh, có xem trước
- Tạo xong thì chuyển sang `/trips/:id` và hiện ngay khung mời bạn bè.

**TripDetailPage (`/trips/:id`)**
- Ảnh bìa lớn, tên chuyến đi, countdown, trạng thái.
- `InviteShare` (OWNER/EDITOR):
  - Hiện link `{origin}/join/{code}` + nút **Copy**.
  - Nút **Chia sẻ** dùng `navigator.share` trên điện thoại (mở thẳng Zalo/Messenger). Thiết bị không hỗ trợ thì ẩn nút này.
  - OWNER có thêm nút "Tạo mã mới".
- `MemberList`: avatar, tên, nhãn quyền. OWNER có menu đổi quyền, xóa thành viên, chuyển owner. Thành viên khác có nút "Rời nhóm".
- Thanh tab cho các phase sau: Lịch rảnh, Lịch trình, Chi tiêu, Album. Phase 1 chỉ hiện tab **Tổng quan**, các tab khác ẩn hoặc gắn nhãn "Sắp có".
- Nút sửa thông tin chuyến đi (OWNER/EDITOR) mở lại modal dùng chung với form tạo.

### 8.3 Phong cách giao diện
- **Thiết kế ưu tiên điện thoại**, thử ở bề rộng 375px. Nút bấm cao tối thiểu 44px.
- Màu chủ đạo pastel (hồng/coral pha tím nhạt), góc bo lớn (`rounded-2xl`), bóng mềm, ảnh bìa nổi bật. Màu được khai báo thành biến trong `@theme` của Tailwind để các phase sau dùng lại.
- Font **Be Vietnam Pro** (Google Fonts), hiển thị tốt tiếng Việt.
- Dùng component Shadcn UI (Button, Input, Dialog, DropdownMenu, Avatar, Badge, Card, Tabs, Skeleton, AlertDialog). Toast bằng `sonner`. Có skeleton khi đang tải.
- Avatar mặc định là chữ cái đầu của tên trên nền màu sinh từ userId.

---

## 9. Cấu hình & Môi trường

### 9.1 Backend `backend/.env.example`
```
DB_URL=jdbc:mysql://localhost:3306/tripplanner?createDatabaseIfNotExist=true
DB_USERNAME=root
DB_PASSWORD=
JWT_SECRET=change-me-to-a-random-32+byte-string
JWT_EXPIRATION_DAYS=7
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
CORS_ALLOWED_ORIGINS=http://localhost:5173
```
Dùng MySQL 8.0 cài sẵn trên máy. Các biến được đặt trong môi trường hoặc trong run configuration của IntelliJ. Spring Boot **không** tự đọc file `.env`.

### 9.2 Frontend `frontend/.env.example`
```
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
```

### 9.3 Việc cần làm trên Google Cloud (người dùng tự làm)
1. Vào Google Cloud Console, tạo project.
2. Cấu hình **OAuth consent screen** ở chế độ *External*, chỉ chọn scope `openid`, `email`, `profile`.
3. Vào Credentials, tạo **OAuth Client ID** loại *Web application*. Ở mục *Authorized JavaScript origins*, thêm `http://localhost:5173` (và domain Vercel khi deploy).
4. Dán Client ID vào cả hai file `.env`.

Không cần Client Secret, vì backend chỉ verify ID token.

---

## 10. Kiểm thử

| Loại | Nội dung |
|---|---|
| Unit (BE) | `InviteCodeGenerator` (độ dài, bảng chữ), `TripStatus` (4 trạng thái + đúng múi giờ), `TripAccessService` (thứ tự quyền) |
| Integration (BE) | `@SpringBootTest` + MockMvc trên **MySQL local**, schema riêng `tripplanner_test` (biến môi trường `TEST_DB_URL`, `TEST_DB_USERNAME`, `TEST_DB_PASSWORD`). Không có `TEST_DB_URL` thì test tích hợp tự bỏ qua. Các luồng: đăng ký → đăng nhập → tạo trip → user B join → B là EDITOR → B không đổi được quyền (403) → OWNER chuyển quyền → join lại idempotent. Google verifier được mock |
| Migration | Flyway chạy `V1` trên `tripplanner_test`. Hibernate `validate` pass |
| FE | `npm run lint` và `npm run build` pass. Test tay trên điện thoại (DevTools 375px) |

Lệnh:
- BE: `./mvnw test` (một test: `./mvnw test -Dtest=TripServiceTest`), `./mvnw spring-boot:run`
- FE: `npm run dev`, `npm run build`, `npm run lint`

---

## 11. Tiêu chí nghiệm thu (Definition of Done)

- [ ] Đặt biến môi trường DB rồi chạy `./mvnw spring-boot:run` trong `backend/`, khởi động không lỗi. Flyway tạo đủ 3 bảng. Swagger UI mở được.
- [ ] Đăng ký và đăng nhập bằng username/password được. Sai mật khẩu báo lỗi tiếng Việt.
- [ ] Đăng nhập Google được. Lần đầu đăng nhập thì tạo user mới với tên và avatar lấy từ Google.
- [ ] Tạo chuyến đi có ảnh bìa và khoảng ngày dự kiến. Dashboard hiện thẻ với trạng thái "Đang chốt lịch" và đếm ngược "(dự kiến)".
- [ ] Copy hoặc chia sẻ link mời. Mở link ở trình duyệt ẩn danh thì thấy trang xem trước, đăng nhập xong quay lại đúng trang join và vào được nhóm.
- [ ] OWNER đổi quyền, xóa thành viên, chuyển owner, tạo mã mới được. Mã cũ sau đó trả về 404.
- [ ] VIEWER không thấy link mời, không sửa được chuyến đi (cả trên UI lẫn API trả 403).
- [ ] Giao diện dùng tốt ở bề rộng 375px.
- [ ] Test BE pass. Lint và build FE pass.
- [ ] Cập nhật `CLAUDE.md`: lệnh BE, hiện trạng "Phase 1 xong".

---

## 12. Quyết định mặc định có thể đổi

| # | Mặc định | Phương án khác |
|---|---|---|
| 1 | Người join qua link nhận quyền **EDITOR** (nhóm bạn, ai cũng góp được) | `VIEWER`, Owner nâng quyền sau |
| 2 | JWT hết hạn sau 7 ngày, lưu `localStorage`, chưa có refresh token | Refresh token + cookie HttpOnly (thêm khoảng nửa ngày) |
| 3 | Google login có email trùng với user đã có thì tự **liên kết** vào tài khoản đó | Luôn tạo tài khoản riêng |
| 4 | Chưa có "quên mật khẩu". Muốn reset thì Owner hoặc admin làm tay trong DB | Reset qua email (cần dịch vụ gửi mail) |
| 5 | Toàn bộ chuỗi trong DB dùng collation `utf8mb4_0900_ai_ci` (không phân biệt hoa/thường, dấu) | Collation riêng cho cột cần phân biệt |
