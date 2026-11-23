# SDD – Thông báo qua email (Gmail SMTP + Outbox + `@Scheduled`)

**Dự án:** Team Trip Planner
**Phụ thuộc:** Phase 1 (users, trips, trip_members), Phase 3 (trip_days, itinerary, dress code, checklist), Phase 4 (expenses, settlements), refresh token (`SchedulingConfig` đã bật `@EnableScheduling`)
**Trạng thái:** Đã triển khai đủ N1, N2, N3 (ghi chú triển khai: §5.10, §6.9, §7.6)
**Migration:** `V9__email_notifications.sql` (toàn bộ schema làm ở Phase N1, N2/N3 không thêm migration)

| Phase | Nội dung | Kết quả nghiệm thu |
|---|---|---|
| **N1: Hạ tầng** | Gửi mail SMTP, bảng outbox + dispatcher + retry, email nhận thông báo + xác minh, tuỳ chọn, huỷ nhận, Mailpit local, mail thử, dọn rác | Gửi được mail thử, xác minh được email, bật/tắt từng loại, link huỷ nhận hoạt động |
| **N2: Sự kiện** | Domain event ở thành viên / chi tiêu / chuyển khoản → outbox; gộp, sửa, huỷ trong cửa sổ chờ; tắt thông báo theo chuyến; deep link `?tab=` | Có mail tóm tắt "thành viên" và "chi tiêu" |
| **N3: Đếm ngược** | `CountdownJob` 08:00, gửi bù khi khởi động, nội dung ngày 1 + dress code + checklist của bạn | Có mail D-7 / D-3 / D-1 / D-0 |

Mỗi phase tuân theo `AGENT_RULE.md` (BE trước → FE types copy 1:1 → `mvnw test` + `npm run build` xanh).

---

## 1. Bối cảnh & mục tiêu

### 1.1 Hiện tại
- Không có kênh thông báo nào. Thành viên chỉ thấy thay đổi khi mở app (FE poll 15 s).
- `users.email` **chỉ có** khi tài khoản đăng nhập/liên kết Google, và bị **xoá khi gỡ Google** (cột này dùng để tự liên kết khi đăng nhập Google theo email). Tài khoản username/password không có email.
- Đã có `@EnableScheduling` và 1 job `@Scheduled` (dọn refresh token 03:30). Production chạy **1 instance** backend.

### 1.2 Mục tiêu
1. Gửi email (tiếng Việt, HTML + text) về: **đếm ngược ngày đi**, **thành viên vào/rời nhóm**, **chi tiêu & chuyển khoản liên quan đến bạn**.
2. **Không spam:** gộp nhiều sự kiện của cùng một chuyến vào 1 email; đếm ngược chỉ ở các mốc.
3. **Không mất, không phá nghiệp vụ:** thông báo ghi cùng transaction với nghiệp vụ (Transactional Outbox); lỗi ở phần thông báo **không bao giờ** làm hỏng thao tác chính; gửi lỗi thì retry.
4. Mọi người đều nhận được: tài khoản mật khẩu khai báo email và **xác minh**; tài khoản Google tự có email.
5. Người dùng **làm chủ**: bật/tắt từng loại, tắt theo chuyến, link huỷ nhận 1 chạm trong mỗi mail.

### 1.3 Quyết định đã duyệt
| Vấn đề | Quyết định | Lý do |
|---|---|---|
| Lập lịch | Spring `@Scheduled` (không JobRunr / Quartz / cron OS) | Đã có sẵn, 1 instance, không thêm bảng lạ ngoài Flyway |
| Độ tin cậy | Bảng outbox tự viết + `SELECT … FOR UPDATE SKIP LOCKED` | Retry, chống gửi trùng kể cả khi sau này chạy 2 instance (không cần ShedLock) |
| Gửi mail | Gmail SMTP bằng **App Password** (`spring-boot-starter-mail`) | Miễn phí, ~500 người nhận/ngày, đủ cho quy mô ~15 người/chuyến. Đổi nhà cung cấp = đổi `MAIL_*` |
| Mốc đếm ngược | D-7, D-3, D-1, D-0 lúc 08:00 (Asia/Ho_Chi_Minh) | Cấu hình được |
| Người nhận | Theo bảng §6 | |

### 1.4 Ngoài phạm vi
- Thông báo trong app (chuông), push notification, Zalo.
- Email khi đổi quyền / chuyển trưởng nhóm / xoá chuyến / sửa lịch trình / bình chọn.
- Gửi theo khung giờ yên lặng, tuỳ chỉnh giờ gửi đếm ngược theo người dùng.
- Theo dõi mở mail / click.
- Triển khai production (SDD triển khai riêng; khi đó chỉ cần thêm biến `MAIL_*` vào `docker-compose.prod.yml`).

---

## 2. Thuật ngữ

| Thuật ngữ | Nghĩa |
|---|---|
| Notification (dòng outbox) | 1 dòng trong `notifications` = 1 sự kiện cho **1 người nhận** |
| Email nhận thông báo | `users.notify_email`: luôn là email **đã xác minh** (bởi Google hoặc qua link) |
| Loại (category) | `COUNTDOWN` · `MEMBER` · `EXPENSE`, suy ra từ `type` (không lưu) |
| Kênh (channel) | `COUNTDOWN` nếu `type = COUNTDOWN`, ngược lại `DIGEST`. Mỗi email chỉ chứa 1 kênh |
| Nhóm gửi | `(user_id, trip_id, channel)`: các dòng cùng nhóm được gộp thành **1 email** |
| Cửa sổ chờ | `send_after - created_at`: 10 phút (chi tiêu), 30 phút (thành viên), 0 (đếm ngược) |
| `dedup_key` | Khoá idempotent **vĩnh viễn** (đếm ngược): đã có thì không tạo lại |
| `coalesce_key` | Khoá gộp **trong cửa sổ chờ** (khoản chi, chuyển khoản): sửa/huỷ dòng PENDING thay vì tạo thêm |

---

## 3. Cơ sở dữ liệu – `V9__email_notifications.sql` (Phase N1)

```sql
-- 1) Email nhận thông báo (đã xác minh). Tách khỏi users.email (email đăng nhập Google) để không
--    ảnh hưởng logic tự liên kết Google theo email. Không UNIQUE: 2 tài khoản có thể dùng chung 1 hộp thư.
ALTER TABLE users ADD COLUMN notify_email VARCHAR(254) NULL;

-- Tài khoản Google hiện có: email Google đã được Google xác minh
UPDATE users SET notify_email = email WHERE email IS NOT NULL;

-- 2) Email đang chờ xác minh: tối đa 1 yêu cầu / user. Chỉ lưu SHA-256 của token.
CREATE TABLE email_verifications (
    user_id        BIGINT       NOT NULL,
    email          VARCHAR(254) NOT NULL,
    token_hash     CHAR(64)     NOT NULL,
    expires_at     DATETIME(6)  NOT NULL,
    last_sent_at   DATETIME(6)  NOT NULL,
    send_date      DATE         NOT NULL,     -- ngày (giờ VN) của bộ đếm send_count
    send_count     TINYINT      NOT NULL,     -- số mail xác minh đã gửi trong send_date (giới hạn 5)
    CONSTRAINT pk_email_verifications PRIMARY KEY (user_id),
    CONSTRAINT uq_email_verifications_token UNIQUE (token_hash),
    CONSTRAINT fk_email_verifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 3) Tuỳ chọn. Không có dòng = mọi thứ bật.
CREATE TABLE user_notification_prefs (
    user_id            BIGINT      NOT NULL,
    email_enabled      BOOLEAN     NOT NULL,   -- công tắc tổng ("Tắt mọi email")
    countdown_enabled  BOOLEAN     NOT NULL,
    member_enabled     BOOLEAN     NOT NULL,
    expense_enabled    BOOLEAN     NOT NULL,
    updated_at         DATETIME(6) NOT NULL,
    CONSTRAINT pk_user_notification_prefs PRIMARY KEY (user_id),
    CONSTRAINT fk_user_notification_prefs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 4) Tắt thông báo theo chuyến (dùng ở N2). Có dòng = đã tắt. Rời nhóm thì tự xoá (CASCADE như member_availabilities).
CREATE TABLE trip_notification_mutes (
    trip_id     BIGINT      NOT NULL,
    user_id     BIGINT      NOT NULL,
    created_at  DATETIME(6) NOT NULL,
    CONSTRAINT pk_trip_notification_mutes PRIMARY KEY (trip_id, user_id),
    CONSTRAINT fk_trip_notification_mutes_member FOREIGN KEY (trip_id, user_id)
        REFERENCES trip_members (trip_id, user_id) ON DELETE CASCADE
);

-- 5) Outbox: 1 dòng = 1 sự kiện cho 1 người nhận
CREATE TABLE notifications (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    user_id       BIGINT        NOT NULL,
    trip_id       BIGINT        NULL,
    type          VARCHAR(30)   NOT NULL,
    payload       JSON          NOT NULL,     -- ảnh chụp dữ liệu lúc xảy ra sự kiện (tên, số tiền…)
    dedup_key     VARCHAR(150)  NULL,
    coalesce_key  VARCHAR(100)  NULL,
    status        VARCHAR(12)   NOT NULL,
    send_after    DATETIME(6)   NOT NULL,
    attempts      TINYINT       NOT NULL DEFAULT 0,
    last_error    VARCHAR(500)  NULL,
    claimed_at    DATETIME(6)   NULL,
    sent_at       DATETIME(6)   NULL,
    created_at    DATETIME(6)   NOT NULL,
    updated_at    DATETIME(6)   NOT NULL,
    CONSTRAINT pk_notifications PRIMARY KEY (id),
    CONSTRAINT uq_notifications_dedup UNIQUE (dedup_key),     -- NULL không bị UNIQUE chặn
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT chk_notifications_status CHECK (status IN
        ('PENDING', 'SENDING', 'SENT', 'SKIPPED', 'CANCELLED', 'FAILED')),
    CONSTRAINT chk_notifications_type CHECK (type IN
        ('COUNTDOWN',
         'MEMBER_JOINED', 'MEMBER_LEFT', 'MEMBER_REMOVED', 'YOU_WERE_REMOVED',
         'EXPENSE_ADDED', 'EXPENSE_UPDATED', 'EXPENSE_DELETED',
         'SETTLEMENT_PENDING', 'SETTLEMENT_CONFIRMED', 'SETTLEMENT_REJECTED')),
    INDEX idx_notifications_due (status, send_after),
    INDEX idx_notifications_group (user_id, trip_id, status),
    INDEX idx_notifications_coalesce (coalesce_key, user_id)
);
```

**Ghi chú schema / BCNF:**
- `category` và `channel` suy ra từ `type` (enum Java `NotificationType`) → **không lưu**.
- `notifications.trip_id` tham chiếu `trips` (không phải `trip_members`): người bị mời ra vẫn nhận được mail "bạn đã bị mời ra khỏi nhóm". FK này **có** CASCADE được vì cột không nuôi cột generated (khác `fk_trip_members_trip`). Xoá chuyến → thông báo của chuyến tự xoá; `TripService.delete` **không cần sửa**.
- `trip_notification_mutes` FK tổ hợp tới `trip_members` **ON DELETE CASCADE** (giống `member_availabilities`) → `removeMembership` và `TripService.delete` **không cần sửa**.
- `payload` là **ảnh chụp** (tên người, tên khoản chi, số tiền…) để email vẫn đúng khi bản ghi gốc đã sửa/xoá. Không tham chiếu FK tới `expenses`/`settlements`.
- `email_verifications.email` không cần UNIQUE. `send_date`/`send_count` để giới hạn 5 mail xác minh/ngày/user.
- Entity: cột enum dùng `@JdbcTypeCode(SqlTypes.VARCHAR)`; `TINYINT` map `Integer` + `columnDefinition = "TINYINT"`; `payload` map `String` + `columnDefinition = "JSON"` (serialize bằng `ObjectMapper` trong service, không dùng kiểu JSON của Hibernate).

---

## 4. Kiến trúc

```
              ┌──────────────── transaction nghiệp vụ ─────────────────┐
ExpenseService.create ─ publishEvent(ExpenseChanged) ─┐                 │
TripService.join ───── publishEvent(MemberJoined) ────┼─► NotificationEventListener (@TransactionalEventListener BEFORE_COMMIT)
TripMemberService ──── publishEvent(MemberLeft…) ─────┘        └─ NotificationOutbox.enqueue(...) (JdbcTemplate, bắt mọi lỗi)
              └─────────────────────────────────────────────────────────┘
CountdownJob @Scheduled 08:00 ───────────────────────────────────────► NotificationOutbox.enqueue(...) (INSERT IGNORE theo dedup_key)

NotificationDispatcher @Scheduled(fixedDelay 30 s)
  1. trả các dòng SENDING kẹt > 10 phút về PENDING
  2. claim nhóm đến hạn (FOR UPDATE SKIP LOCKED) → SENDING
  3. mỗi nhóm: kiểm tra email/tuỳ chọn → render Thymeleaf → MailGateway.send → SENT | retry | FAILED
```

### 4.1 Package `com.tripplanner.notification`

| Thành phần | Vai trò |
|---|---|
| `NotificationType` (enum) | `type` → `category()`, `channel()`, `windowMinutes()` |
| `Notification`, `NotificationRepository` | Entity + truy vấn claim/đếm/dọn |
| `NotificationOutbox` | API duy nhất để tạo/sửa/huỷ dòng outbox. Ghi bằng `JdbcTemplate`. **Bắt mọi `RuntimeException`, log ERROR, không ném lại** |
| `NotificationDispatcher` | Job gửi (§4.3). Phương thức `runOnce()` public để test gọi trực tiếp |
| `RetryPolicy` (class thuần) | `attempts` → thời điểm thử lại hoặc FAILED. Unit test |
| `mail/MailGateway` (interface) | `void send(OutgoingEmail email)`; test mock interface này (như `StorageService`) |
| `mail/SmtpMailGateway` | `JavaMailSender` + `MimeMessageHelper` multipart (HTML + text). Bean chỉ tạo khi có `spring.mail.host` |
| `mail/DisabledMailGateway` | Khi chưa cấu hình: ném `BusinessException(MAIL_NOT_CONFIGURED)` |
| `mail/MailRenderer` | `TemplateEngine` Thymeleaf **riêng** (bean `mailTemplateEngine`, `ClassLoaderTemplateResolver` prefix `mail/`), render subject + HTML + text |
| `UnsubscribeTokens` (class thuần) | Ký / kiểm tra token huỷ nhận (§5.5). Unit test |
| `EmailVerificationService` | Đặt / xác minh / gỡ email nhận thông báo |
| `NotificationSettingsService`, `NotificationSettingsController` | Tuỳ chọn, mail thử, huỷ nhận |
| N2: `event/*` (records), `NotificationEventListener`, `CoalescePlanner` (thuần), `TripMuteService` | |
| N3: `CountdownJob`, `CountdownMilestones` (thuần), `CountdownContentBuilder` | |

Dùng thư viện lõi `org.thymeleaf:thymeleaf` (version do Spring Boot BOM quản lý), **không** dùng `spring-boot-starter-thymeleaf` để không kéo view resolver MVC vào app REST.

### 4.2 Ghi outbox an toàn với nghiệp vụ
- Service nghiệp vụ chỉ `publishEvent(record)`; không biết gì về mail.
- `NotificationEventListener` dùng `@TransactionalEventListener(phase = BEFORE_COMMIT)`: chạy **trong** transaction nghiệp vụ → nghiệp vụ rollback thì không có thông báo; dữ liệu mới (thành viên vừa vào, đã rời) đã thấy được khi truy vấn người nhận.
- Toàn bộ listener bọc `try/catch (RuntimeException)` → log ERROR. Ghi bằng `JdbcTemplate` (lỗi SQL trên MySQL không làm transaction bị đánh dấu rollback-only như lỗi JPA).
- **Lọc lúc tạo** (giảm rác): không tạo dòng cho người không có `notify_email`, đã tắt `email_enabled` hoặc loại tương ứng, hoặc đã tắt chuyến (trừ `YOU_WERE_REMOVED` bỏ qua mute chuyến). Dispatcher **kiểm tra lại** lúc gửi.
- `DevDataSeeder` ghi thẳng repository, không publish event → seed không sinh mail.

### 4.3 Dispatcher
`@Scheduled(fixedDelayString = "${app.notifications.dispatch-interval-ms:30000}")`, phương thức chỉ gọi `runOnce()` nếu `app.notifications.scheduler-enabled=true` (test profile đặt `false`, test gọi `runOnce()` trực tiếp).

`runOnce()`:
1. **Gỡ kẹt:** `UPDATE notifications SET status='PENDING', claimed_at=NULL WHERE status='SENDING' AND claimed_at < now - 10 phút`. Đảm bảo at-least-once; nếu app chết đúng lúc đã gửi nhưng chưa ghi SENT thì có thể trùng 1 mail (chấp nhận).
2. **Giới hạn ngày:** đếm SENT từ 00:00 hôm nay (giờ VN, theo nhóm email đã gửi). Nếu ≥ `app.notifications.daily-limit` (mặc định 400) → log WARN, dừng (các dòng vẫn PENDING, gửi tiếp ngày mai).
3. **Claim** (transaction ngắn): chọn tối đa `app.notifications.batch-size` (50) nhóm `(user_id, trip_id, channel)` có `MIN(send_after) <= now` trong các dòng PENDING; lấy **mọi** dòng PENDING của các nhóm đó `FOR UPDATE SKIP LOCKED`, đặt `status='SENDING'`, `claimed_at=now`. (Sự kiện đến sau trong cửa sổ chờ đi chung email với sự kiện đầu → độ trễ tối đa = cửa sổ của sự kiện đầu tiên.) `channel` trong SQL: `CASE WHEN type='COUNTDOWN' THEN 'COUNTDOWN' ELSE 'DIGEST' END`.
4. **Gửi** từng nhóm (ngoài transaction claim):
   - Nạp user + prefs + mute. Không có `notify_email` → `SKIPPED` (`last_error='NO_EMAIL'`). Tắt tổng → `SKIPPED` (`'DISABLED'`). Lọc bỏ từng dòng thuộc loại đã tắt / chuyến đã tắt → `SKIPPED`. Không còn dòng nào → xong.
   - Trong nhóm, các dòng cùng `coalesce_key` chỉ giữ dòng **mới nhất** (an toàn khi 2 request sửa cùng lúc tạo 2 dòng); dòng bị loại → `CANCELLED`.
   - `MailRenderer` render (§7) → `MailGateway.send`.
   - Thành công: mọi dòng → `SENT`, `sent_at=now`.
   - Lỗi: `attempts+1`, `last_error` (cắt 500 ký tự). `RetryPolicy`: lần 1→+1 phút, 2→+5 phút, 3→+15 phút, 4→+1 giờ, lần thứ 5 lỗi → `FAILED`. Chưa FAILED thì `status='PENDING'`, `send_after = now + backoff`.
   - `MAIL_NOT_CONFIGURED` (chưa đặt `MAIL_HOST`): mọi dòng → `SKIPPED` (`'MAIL_DISABLED'`), không retry.
5. Log INFO tổng kết (số nhóm gửi / bỏ qua / lỗi) khi có việc.

### 4.4 Dọn rác
`@Scheduled(cron = "0 45 3 * * *", zone = "Asia/Ho_Chi_Minh")`: xoá `SENT`/`SKIPPED`/`CANCELLED` có `updated_at` quá 30 ngày, `FAILED` quá 90 ngày; xoá `email_verifications` đã hết hạn quá 1 ngày. (Hệ quả chấp nhận được: khoản chi bị xoá sau hơn 30 ngày kể từ mail cuối sẽ không có mail "đã xoá".)

---

## 5. Phase N1 – Hạ tầng, email nhận thông báo, tuỳ chọn

### 5.1 Cấu hình

`pom.xml`: thêm `spring-boot-starter-mail`, `org.thymeleaf:thymeleaf`.

`application.yml`:
```yaml
spring:
  mail:
    host: ${MAIL_HOST:}               # trống = tắt gửi mail
    port: ${MAIL_PORT:587}
    username: ${MAIL_USERNAME:}
    password: ${MAIL_PASSWORD:}       # Gmail App Password (16 ký tự), KHÔNG phải mật khẩu Gmail
    properties:
      mail.smtp.auth: ${MAIL_SMTP_AUTH:true}
      mail.smtp.starttls.enable: ${MAIL_STARTTLS:true}
      mail.smtp.connectiontimeout: 10000
      mail.smtp.timeout: 10000
      mail.smtp.writetimeout: 10000
app:
  mail:
    from: ${MAIL_FROM:}               # Gmail: phải trùng MAIL_USERNAME, nếu không Gmail tự thay
    from-name: ${MAIL_FROM_NAME:Trip Planner}
  notifications:
    scheduler-enabled: ${NOTIFY_SCHEDULER_ENABLED:true}
    dispatch-interval-ms: ${NOTIFY_DISPATCH_INTERVAL_MS:30000}
    batch-size: 50
    daily-limit: ${NOTIFY_DAILY_LIMIT:400}
    countdown-days: ${NOTIFY_COUNTDOWN_DAYS:7,3,1,0}
    countdown-cron: ${NOTIFY_COUNTDOWN_CRON:0 0 8 * * *}
```
`application-test.yml`: `app.notifications.scheduler-enabled: false`, `spring.mail.host` trống. `AppProperties` thêm `mail` + `notifications` (không đặt tên `notify`: trùng `Object.notify()` trong record).

| Biến | Local (Mailpit) | Gmail thật |
|---|---|---|
| `MAIL_HOST` | `localhost` | `smtp.gmail.com` |
| `MAIL_PORT` | `1025` | `587` |
| `MAIL_SMTP_AUTH` / `MAIL_STARTTLS` | `false` / `false` | `true` / `true` |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | trống | địa chỉ Gmail / App Password |
| `MAIL_FROM` | `trip@localhost` | địa chỉ Gmail |

Cập nhật `backend/.env.example` (comment tiếng Việt) và `CLAUDE.md` (mục Commands).

**Tạo Gmail App Password:** tài khoản Google bật Xác minh 2 bước → https://myaccount.google.com/apppasswords → tạo mật khẩu ứng dụng → dán vào `MAIL_PASSWORD` (bỏ dấu cách). Giới hạn Gmail cá nhân ~500 người nhận/ngày (vượt bị khoá gửi 24 h) → `NOTIFY_DAILY_LIMIT=400` chừa biên.

**Mailpit (local):** thêm vào `docker-compose.yml` service `mailpit` (image `axllent/mailpit` ghim phiên bản cụ thể, cổng `1025` SMTP và `8025` giao diện web, `restart: unless-stopped`). Mở http://localhost:8025 để xem mail. Image này pull bình thường (không cần `pull_policy: never`).

### 5.2 Email nhận thông báo

**Quy tắc:**
- `users.notify_email` chỉ chứa email đã xác minh. Đổi email = tạo yêu cầu xác minh mới; email cũ **vẫn dùng** cho tới khi email mới được xác minh.
- **Google:** khi tạo tài khoản Google mới (`AuthService`) hoặc liên kết Google (`UserService.linkGoogle`), nếu `notify_email` đang NULL → đặt bằng email Google. **Gỡ Google không động tới** `notify_email`.
- Yêu cầu email trùng `users.email` (email Google của chính mình) → xác minh ngay, không gửi mail.
- Email chuẩn hoá `trim().toLowerCase(Locale.ROOT)`, `@Email` + `@Size(max = 254)`.

**Đặt email – `POST /api/v1/users/me/notify-email`** body `{ "email": "..." }`:
1. Có dòng `email_verifications` với `last_sent_at` < 60 giây trước → `429 EMAIL_VERIFICATION_COOLDOWN`. `send_date` = hôm nay và `send_count >= 5` → `429 EMAIL_VERIFICATION_LIMIT`.
2. Sinh token 32 byte `SecureRandom` base64url, lưu SHA-256, `expires_at = now + 24h` (upsert theo `user_id`, cập nhật bộ đếm).
3. **Gửi đồng bộ** (không qua outbox, để token gốc không nằm trong DB) template `verify-email` tới email mới, link `${FRONTEND_URL}/verify-email?token=<token>`. Thứ tự: lưu dòng (transaction) → commit → gửi; gửi lỗi → `503 MAIL_SEND_FAILED` (dòng vẫn còn, người dùng bấm gửi lại sau cooldown).
4. Trả `NotificationSettingsResponse`.

**Xác minh – `POST /api/v1/notifications/verify-email`** (public) body `{ "token": "..." }`: tìm theo hash; không có / hết hạn → `400 INVALID_EMAIL_VERIFICATION`. Hợp lệ → `users.notify_email = email`, xoá dòng → `200 { "email": "..." }`. Public vì người dùng hay mở link trên điện thoại chưa đăng nhập.

**Gỡ – `DELETE /api/v1/users/me/notify-email`:** `notify_email = NULL`, xoá yêu cầu đang chờ → settings.

### 5.3 Tuỳ chọn

| Endpoint | Auth | Mô tả |
|---|---|---|
| `GET /api/v1/users/me/notification-settings` | Có | Trả settings |
| `PUT /api/v1/users/me/notification-settings` | Có | Body `NotificationPrefsRequest`, upsert `user_notification_prefs` → settings |
| `POST /api/v1/users/me/notify-email/test` | Có | Gửi đồng bộ mail thử tới `notify_email`. Chưa có → `400 NOTIFY_EMAIL_REQUIRED`. Cooldown 60 giây/user (giữ trong bộ nhớ `ConcurrentHashMap<userId, Instant>`, đủ cho 1 instance) → `429 TEST_EMAIL_COOLDOWN`. 204 |

```java
public record NotificationPrefsRequest(
        @NotNull Boolean emailEnabled,
        @NotNull Boolean countdownEnabled,
        @NotNull Boolean memberEnabled,
        @NotNull Boolean expenseEnabled) {}

public record NotificationSettingsResponse(
        String notifyEmail,             // null = chưa có email đã xác minh
        String pendingEmail,            // null = không có yêu cầu đang chờ (hoặc đã hết hạn)
        Instant pendingExpiresAt,
        boolean mailConfigured,         // server đã đặt MAIL_HOST chưa
        boolean emailEnabled,
        boolean countdownEnabled,
        boolean memberEnabled,
        boolean expenseEnabled) {}

public record NotifyEmailRequest(@NotBlank @Email @Size(max = 254) String email) {}
public record VerifyEmailRequest(@NotBlank String token) {}
public record VerifyEmailResponse(String email) {}
```

`UserResponse` **không đổi** (settings có endpoint riêng).

### 5.4 Ma trận người nhận được phép gửi
Một dòng được gửi khi **tất cả** đúng: `notify_email` khác NULL · `email_enabled` · cờ của loại tương ứng bật · (với mọi type trừ `YOU_WERE_REMOVED`) không có dòng `trip_notification_mutes`.

### 5.5 Huỷ nhận (unsubscribe)

**Token** (`UnsubscribeTokens`, thuần): `base64url(payload) + "." + base64url(HMAC-SHA256(key, payload))`, `payload = "u1|{userId}|{scope}"`, `scope ∈ { ALL, CAT:COUNTDOWN, CAT:MEMBER, CAT:EXPENSE, TRIP:{tripId} }`. `key = HMAC-SHA256(JWT_SECRET, "unsubscribe-v1")` (khoá dẫn xuất, **không** dùng trực tiếp `JWT_SECRET`). **Không** dùng JWT: một JWT ký bằng khoá app sẽ được resource server chấp nhận như access token. Không hết hạn (link trong mail cũ vẫn phải dùng được); so sánh chữ ký bằng `MessageDigest.isEqual`.

| Endpoint | Auth | Mô tả |
|---|---|---|
| `POST /api/v1/notifications/unsubscribe` body `{ "token": "..." }` | Public | Áp dụng scope: `ALL` → `email_enabled=false`; `CAT:*` → tắt cờ loại; `TRIP:id` → thêm mute (chỉ khi còn là thành viên, không thì coi như xong). Trả `UnsubscribeResponse` |
| `POST /api/v1/notifications/unsubscribe/one-click?token=...` | Public | RFC 8058 (Gmail gọi khi bấm "Huỷ đăng ký"). Nhận `application/x-www-form-urlencoded`, áp dụng **đúng scope ghi trong token** (không mặc định tắt tất cả). 200 body rỗng |

```java
public record UnsubscribeRequest(@NotBlank String token) {}
public record UnsubscribeResponse(
        String scope,          // "ALL" | "CATEGORY" | "TRIP"
        String category,       // "COUNTDOWN" | "MEMBER" | "EXPENSE" | null
        String tripTitle) {}   // tên chuyến khi scope = TRIP
```
Token sai → `400 INVALID_UNSUBSCRIBE_TOKEN`. Idempotent: bấm lại vẫn 200.

Mỗi email có header `List-Unsubscribe: <${PUBLIC_BASE_URL}/api/v1/notifications/unsubscribe/one-click?token=…>` (scope = loại của email; email tóm tắt nhiều loại → scope `TRIP:{tripId}`) và `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. Footer có 3 link FE: "Tắt loại thông báo này" · "Tắt email của chuyến này" · "Tắt mọi email" → `${FRONTEND_URL}/unsubscribe?token=…`.

`SecurityConfig` permit: `POST /api/v1/notifications/verify-email`, `/api/v1/notifications/unsubscribe`, `/api/v1/notifications/unsubscribe/one-click`.

### 5.6 Mã lỗi mới (thêm vào `ErrorCode` **và** `frontend/src/types/api.ts`)

| Code | HTTP | Thông báo |
|---|---|---|
| `MAIL_NOT_CONFIGURED` | 503 | Máy chủ chưa cấu hình gửi email |
| `MAIL_SEND_FAILED` | 503 | Không gửi được email, vui lòng thử lại sau |
| `EMAIL_VERIFICATION_COOLDOWN` | 429 | Vui lòng đợi 1 phút trước khi gửi lại email xác minh |
| `EMAIL_VERIFICATION_LIMIT` | 429 | Bạn đã gửi quá nhiều email xác minh hôm nay, hãy thử lại vào ngày mai |
| `INVALID_EMAIL_VERIFICATION` | 400 | Liên kết xác minh không hợp lệ hoặc đã hết hạn |
| `NOTIFY_EMAIL_REQUIRED` | 400 | Bạn chưa có email nhận thông báo đã xác minh |
| `TEST_EMAIL_COOLDOWN` | 429 | Vui lòng đợi 1 phút trước khi gửi thử lại |
| `INVALID_UNSUBSCRIBE_TOKEN` | 400 | Liên kết huỷ nhận không hợp lệ |

`HttpStatus.TOO_MANY_REQUESTS` là mã mới trong `ErrorCode`; kiểm tra `ErrorCode.fromStatus` (429 hiện rơi vào `BAD_REQUEST`, giữ nguyên, chỉ ảnh hưởng lỗi không mang code).

### 5.7 Template email (N1)
`src/main/resources/mail/`: `layout.html` (fragment khung chung: header màu thương hiệu, footer huỷ nhận), `verify-email.html|.txt`, `test.html|.txt`. CSS **inline**, bảng 600px, không ảnh ngoài (trừ ảnh bìa http(s) nếu có), font hệ thống. Mọi chuỗi tiếng Việt. Tiền định dạng `250.000 ₫` (`NumberFormat` `vi-VN`), ngày `Thứ Bảy, 05/12/2026`.

### 5.8 Frontend (N1)

| Phần | Thay đổi |
|---|---|
| `types/notification.ts` | Copy 1:1 các record ở §5.3, §5.5 |
| `types/api.ts` | Thêm 8 mã lỗi §5.6 |
| `api/notifications.ts` | Gọi các endpoint §5.2, §5.3, §5.5 |
| `hooks/useNotificationSettings.ts` | Query `['notification-settings']` (`refetchInterval: false`) + mutations ghi thẳng cache |
| `components/NotificationSection.tsx` | Trong `ProfileDialog` (sau `BankAccountSection`): trạng thái email (✓ đã xác minh / ⏳ "Đã gửi link tới x, hết hạn lúc…" + Gửi lại / Đổi / Gỡ), ô nhập email, 4 công tắc (Nhận email · Đếm ngược · Thành viên · Chi tiêu; 3 cái sau mờ khi tắt tổng), nút **Gửi mail thử**. `mailConfigured=false` → banner "Máy chủ chưa bật gửi email" và khoá nút gửi |
| `components/ui/switch.tsx` | `npx shadcn@latest add switch` |
| `pages/VerifyEmailPage.tsx` | Route public `/verify-email` (ngoài `ProtectedRoute` và `PublicOnlyRoute`): gọi verify 1 lần (chặn StrictMode gọi 2 lần), báo thành công / lỗi, nút "Về trang chuyến đi" |
| `pages/UnsubscribePage.tsx` | Route public `/unsubscribe`: **không tự huỷ khi tải trang** (trình quét link của hộp thư sẽ tự bấm), hiện nội dung scope + nút **Xác nhận huỷ nhận** → gọi API → "Đã tắt …. Bạn có thể bật lại trong Hồ sơ → Thông báo" |
| `App.tsx` | Thêm 2 route trên |

### 5.9 Kiểm thử (N1)

| Loại | Nội dung |
|---|---|
| Unit `UnsubscribeTokensTest` | ký → kiểm tra đúng userId/scope · sửa 1 ký tự payload/chữ ký → sai · scope lạ → sai · token khác secret → sai |
| Unit `RetryPolicyTest` | attempts 1..4 → backoff 1/5/15/60 phút · attempts 5 → FAILED |
| Integration `NotificationSettingsIntegrationTest` | GET mặc định (mọi cờ bật, không email) · PUT cờ → GET khớp · đặt email → `MailGateway` mock nhận mail có token; verify token → `notifyEmail` đổi, dòng chờ bị xoá · token sai/hết hạn (Clock) → 400 · gửi lại trong 60 s → 429 · lần thứ 6 trong ngày → 429 · email trùng email Google → xác minh ngay, không gửi · gỡ email · test mail không có email → 400 · unsubscribe ALL/CAT/TRIP đổi đúng cờ, bấm lại vẫn 200, token sai 400 · đăng nhập Google mới → `notify_email` = email Google; gỡ Google giữ `notify_email` |
| Integration `NotificationDispatcherIntegrationTest` | Chèn tay dòng PENDING: 2 dòng cùng nhóm → 1 lần `send` · chưa đến hạn → không gửi · gateway ném lỗi → `attempts=1`, `send_after` lùi 1 phút; lỗi 5 lần → FAILED · không email / tắt loại / mute → SKIPPED · SENDING kẹt 11 phút → được gửi lại · 2 dòng cùng `coalesce_key` → gửi dòng mới nhất, dòng cũ CANCELLED · đạt `daily-limit` → giữ PENDING · `MAIL_NOT_CONFIGURED` → SKIPPED |
| Integration (cập nhật) | `TripIntegrationTest`: xoá chuyến có notifications + mute → không lỗi FK |

---

### 5.10 Ghi chú contract đã chốt khi triển khai N1

- **Tên khoá cấu hình:** `app.notifications.*` (không phải `app.notify.*`: `notify` trùng `Object.notify()` nên không làm tên thành phần record `AppProperties` được). Biến môi trường giữ nguyên (`NOTIFY_*`, `MAIL_*`).
- **`management.health.mail.enabled: false`:** `/actuator/health` không phụ thuộc kết nối SMTP.
- **Chọn gateway:** `MailConfig` tự kiểm tra `spring.mail.host` có chữ (auto-config `JavaMailSender` vẫn bật khi host là chuỗi rỗng). Không có host → `DisabledMailGateway`.
- **Email đầu vào:** validate trước khi chuẩn hoá, nên email có khoảng trắng đầu/cuối bị 400; FE `trim()` trước khi gửi. Regex yêu cầu có dấu chấm sau `@` (`a@b` bị từ chối).
- **Đặt email trùng email đang dùng** (hoặc trùng email Google của chính mình) → xác nhận ngay, không gửi mail, xoá yêu cầu đang chờ.
- **Đã có sẵn cho N2/N3** (để dispatcher render được ngay ở N1): `NotificationType` (kèm `category()`, `channel()`, `windowMinutes()`, `respectsTripMute()`), `NotificationOutbox.enqueue(NewNotification)` (INSERT IGNORE theo `dedup_key`; N2 thêm thao tác sửa/huỷ theo `coalesce_key`), `DigestItemFormatter` (dòng tóm tắt cho mọi type theo payload §6.4), template `digest` và `countdown` bản cơ bản (N3 bổ sung khối ngày 1 / dress code / checklist).
- **Thời gian trong JDBC:** outbox/dispatcher dùng `JdbcTemplate`, truyền/đọc `LocalDateTime` theo UTC (`Db.utc`) cho khớp cách Hibernate ghi (`hibernate.jdbc.time_zone=UTC`).
- **Giới hạn ngày** đếm số email (nhóm) đã gửi: `COUNT(DISTINCT user_id, COALESCE(trip_id,0), sent_at)` từ 00:00 giờ VN; mail xác minh / mail thử (gửi đồng bộ) không tính.
- **Template:** render 2 lượt (thân → `layout.html`/`layout.txt`); trong template gọi accessor record dạng `${x.name()}` (OGNL không hiểu accessor record như getter).

## 6. Phase N2 – Sự kiện thành viên & chi tiêu

### 6.1 Ai nhận gì

| Sự kiện (nguồn) | `type` | Người nhận | Cửa sổ | `coalesce_key` |
|---|---|---|---|---|
| Vào nhóm lần đầu (`TripService.join`, nhánh tạo mới) | `MEMBER_JOINED` | Mọi thành viên trừ người vào | 30 phút | – |
| Tự rời nhóm (`removeMember`, `leavingSelf`) | `MEMBER_LEFT` | Mọi thành viên còn lại | 30 phút | – |
| OWNER mời ra | `MEMBER_REMOVED` | Thành viên còn lại trừ OWNER | 30 phút | – |
| | `YOU_WERE_REMOVED` | Người bị mời ra (bỏ qua mute chuyến) | 30 phút | – |
| Thêm khoản chi | `EXPENSE_ADDED` | Người có phần chia > 0, trừ người thao tác | 10 phút | `EXP:{expenseId}` |
| Sửa khoản chi | theo `CoalescePlanner` | Người có phần chia cũ ∪ mới, trừ người thao tác | 10 phút | `EXP:{expenseId}` |
| Xoá khoản chi | theo `CoalescePlanner` | Như trên (phần chia cũ) | 10 phút | `EXP:{expenseId}` |
| Ghi chuyển khoản **chờ xác nhận** (người chuyển ghi) | `SETTLEMENT_PENDING` | Người nhận tiền | 10 phút | `STL:{settlementId}` |
| Người nhận tự ghi (CONFIRMED ngay) hoặc bấm xác nhận | `SETTLEMENT_CONFIRMED` | Người chuyển | 10 phút | `STL:{settlementId}` |
| Người nhận huỷ khoản đang chờ | `SETTLEMENT_REJECTED` | Người chuyển | 10 phút | `STL:{settlementId}` |
| Người chuyển huỷ khoản đang chờ | (huỷ dòng `SETTLEMENT_PENDING` còn PENDING; đã gửi rồi thì thôi) | – | – | `STL:{settlementId}` |

Đổi quyền, chuyển trưởng nhóm: không gửi. Join idempotent (đã là thành viên): không gửi.

### 6.2 Domain events (`notification/event/`)
```java
public record MemberJoined(Long tripId, Long userId, String displayName) {}
public record MemberLeft(Long tripId, Long userId, String displayName, Long removedById /* null = tự rời */,
                         String removedByName) {}
public record ExpenseChanged(Long tripId, Long expenseId, Long actorId, String actorName, Kind kind,
                             String title, long amount, Long paidById, String paidByName,
                             Map<Long, Long> oldShares /* rỗng khi CREATED */,
                             Map<Long, Long> newShares /* rỗng khi DELETED */) {
    public enum Kind { CREATED, UPDATED, DELETED }
}
public record SettlementChanged(Long tripId, Long settlementId, Kind kind, Long fromUserId, String fromName,
                                Long toUserId, String toName, long amount) {
    public enum Kind { PENDING_CREATED, CONFIRMED, REJECTED, CANCELLED_BY_SENDER }
}
```
- `ExpenseService.update`/`delete`: đọc phần chia cũ (`shareRepository`) **trước** khi xoá/ghi lại.
- `TripMemberService.removeMember`: publish **sau** `removeMembership` (listener BEFORE_COMMIT thấy danh sách thành viên đã trừ người đó).
- Tên lấy tại thời điểm sự kiện, đưa vào `payload`.

### 6.3 `CoalescePlanner` (thuần, unit test)
Đầu vào cho **mỗi người nhận**: `pending` (dòng PENDING hiện có cùng `coalesce_key`+`user_id`: type hoặc không có), `everSent` (đã có dòng SENT cùng key+user), `kind`, `oldShare`, `newShare` (0 = không có phần).

| Sự kiện | Có dòng PENDING? | Kết quả |
|---|---|---|
| CREATED, `newShare>0` | – | INSERT `EXPENSE_ADDED` |
| UPDATED, `newShare>0` | có (ADDED/UPDATED) | UPDATE payload, giữ type (ADDED vẫn là ADDED) |
| UPDATED, `newShare>0` | không | INSERT `EXPENSE_UPDATED` |
| UPDATED, `newShare=0`, `oldShare>0` | có `EXPENSE_ADDED` | CANCEL (người đó chưa từng biết) |
| UPDATED, `newShare=0`, `oldShare>0` | có `EXPENSE_UPDATED` / không, và `everSent` | UPDATE / INSERT `EXPENSE_UPDATED` với `yourShare=0` ("bạn không còn trong khoản này") |
| UPDATED, `newShare=0`, `oldShare>0` | không, `!everSent` | NOOP |
| DELETED | có | CANCEL; nếu `everSent` thì thêm INSERT `EXPENSE_DELETED` |
| DELETED | không | `everSent` → INSERT `EXPENSE_DELETED`, không thì NOOP |

Người thao tác không bao giờ nhận. Khi UPDATE payload, `send_after` **giữ nguyên** (không kéo dài cửa sổ mãi). Áp dụng cùng logic cho `STL:*` (PENDING_CREATED ≈ CREATED, CANCELLED_BY_SENDER ≈ DELETED nhưng **không** gửi `…_DELETED`).

### 6.4 Payload (JSON, ví dụ)
```json
{"tripTitle":"Đà Lạt mộng mơ","actorName":"Linh","expenseTitle":"Lẩu gà lá é","amount":1200000,
 "paidByName":"Linh","yourShare":200000}
{"tripTitle":"Đà Lạt mộng mơ","memberName":"Ngọc","removedByName":null}
{"tripTitle":"Đà Lạt mộng mơ","fromName":"Mai","toName":"Linh","amount":200000}
```

### 6.5 Email tóm tắt (`digest.html|.txt`)
- **Tiêu đề:** 1 mục → câu cụ thể, vd `[Đà Lạt mộng mơ] Linh đã thêm "Lẩu gà lá é" – phần của bạn 200.000 ₫`; nhiều mục → `[Đà Lạt mộng mơ] 4 cập nhật mới`.
- **Thân:** khối **Thành viên** (Ngọc đã vào nhóm · Vy đã rời nhóm …) và khối **Chi tiêu** (mỗi khoản: tên, tổng, người trả, phần của bạn; chuyển khoản chờ xác nhận có nút "Xác nhận đã nhận"), sắp theo `created_at`. `YOU_WERE_REMOVED` → mail riêng nội dung "Bạn không còn trong chuyến … (do {removedByName})", không có nút mở chuyến.
- **Nút:** `${FRONTEND_URL}/trips/{tripId}?tab=expenses` (có mục chi tiêu) hoặc `?tab=overview`.

### 6.6 Tắt thông báo theo chuyến

| Endpoint | Quyền | Mô tả |
|---|---|---|
| `GET /api/v1/trips/{tripId}/notification-mute` | VIEWER+ | `{ "muted": boolean }` |
| `PUT /api/v1/trips/{tripId}/notification-mute` | VIEWER+ | Body `{ "muted": boolean }` → thêm/xoá dòng, trả `{ "muted": … }`. Bật mute thì các dòng PENDING của mình trong chuyến → `CANCELLED` |

```java
public record TripMuteRequest(@NotNull Boolean muted) {}
public record TripMuteResponse(boolean muted) {}
```
Mute = tắt **mọi** email của chuyến đó, kể cả đếm ngược (trừ `YOU_WERE_REMOVED`).

### 6.7 Frontend (N2)
| Phần | Thay đổi |
|---|---|
| `types/notification.ts` | Thêm `TripMuteRequest`, `TripMuteResponse` |
| `hooks/useTripMute.ts` | Query key `[...tripKeys.detail(tripId), 'notification-mute']` (`refetchInterval: false`) |
| `TripDetailPage` | Menu "⋯": mục **Tắt email chuyến này** / **Bật email chuyến này** (icon `BellOff`/`Bell`), toast xác nhận. Tabs đọc/ghi `?tab=` (`useSearchParams`): mở link từ mail vào đúng tab; giá trị lạ → `overview` |

### 6.8 Kiểm thử (N2)
| Loại | Nội dung |
|---|---|
| Unit `CoalescePlannerTest` | Đủ các dòng bảng §6.3 |
| Integration `NotificationEventsIntegrationTest` | Join mới → mỗi thành viên khác 1 dòng `MEMBER_JOINED`, `send_after = now+30'`; join lại → không thêm · tự rời → `MEMBER_LEFT` cho người còn lại · OWNER mời ra → `MEMBER_REMOVED` + `YOU_WERE_REMOVED` · thêm khoản chi chia 3 người (người tạo nằm trong) → 2 dòng · sửa trong cửa sổ → vẫn 2 dòng, payload mới · bỏ 1 người khỏi phần chia khi còn PENDING → CANCELLED · xoá khi còn PENDING → CANCELLED, không có `EXPENSE_DELETED` · xoá sau khi đã SENT → `EXPENSE_DELETED` · chuyển khoản PENDING → người nhận 1 dòng; xác nhận → người chuyển `SETTLEMENT_CONFIRMED` · người không có email / tắt loại / mute → không có dòng · listener lỗi (mock `NotificationOutbox` ném) → nghiệp vụ vẫn thành công · dispatcher gộp `MEMBER_JOINED` + `EXPENSE_ADDED` cùng chuyến → 1 email · mute API + rời nhóm xoá mute |

---

### 6.9 Ghi chú contract đã chốt khi triển khai N2

- **Event chỉ mang id + dữ liệu thay đổi** (`MemberJoined(tripId, userId)`, `MemberLeft(tripId, userId, removedById)`, `ExpenseChanged(..., kind, title, amount, paidById, oldShares, newShares)`, `SettlementChanged(tripId, settlementId, kind, fromUserId, toUserId, amount)`). Tên người, email, tuỳ chọn, mute và tên chuyến được tra lúc commit bởi `NotificationAudience`.
- **Listener chỉ dùng JDBC** (`NotificationAudience` + `NotificationOutbox`), không gọi repository JPA: lỗi trong repository JPA đánh dấu transaction nghiệp vụ rollback-only dù đã bắt. Listener chạy BEFORE_COMMIT khi Hibernate có thể chưa flush (thành viên vừa thêm/xoá vẫn còn/chưa có trong bảng), nên luôn tự loại người trong cuộc theo id. Test `notificationFailureNeverBreaksBusinessAction` đổi tên bảng outbox để chứng minh join vẫn thành công.
- **Chuyển khoản:** thêm kind `CONFIRMED_DELETED` (người nhận xoá khoản ĐÃ xác nhận): huỷ mail "đã xác nhận" còn chờ của người chuyển; nếu mail đó đã gửi thì gửi `SETTLEMENT_REJECTED`. `CONFIRMED` và `REJECTED` cũng huỷ mail "chờ xác nhận" còn chờ của người nhận (họ vừa tự xử lý).
- **OWNER mời người ra:** `MEMBER_REMOVED` gửi cho thành viên còn lại trừ chính OWNER; người bị mời ra nhận `YOU_WERE_REMOVED`.
- **Mute API:** `PUT` idempotent; bật mute huỷ dòng PENDING của mình trong chuyến (`last_error = 'TRIP_MUTED'`), trừ `YOU_WERE_REMOVED`. Query key FE `[...tripKeys.detail(tripId), 'notification-mute']`, không poll.
- **Menu "⋯" của trang chuyến** giờ hiện cho mọi thành viên (trước chỉ EDITOR+), vì ai cũng tắt/bật email được; "Sửa thông tin" vẫn chỉ EDITOR+, "Xoá chuyến" chỉ OWNER.
- **`?tab=`:** Tabs của `TripDetailPage` điều khiển bằng URL (`replace`, tab `overview` thì xoá param); giá trị lạ → `overview`.

## 7. Phase N3 – Đếm ngược

### 7.1 `CountdownMilestones` (thuần, unit test)
`Optional<Integer> milestoneFor(LocalDate today, LocalDate startDate, List<Integer> days)` → `daysLeft = startDate - today`, trả `daysLeft` nếu nằm trong `days`, không thì rỗng.

### 7.2 `CountdownJob`
- `@Scheduled(cron = "${app.notifications.countdown-cron}", zone = "Asia/Ho_Chi_Minh")` → `runFor(today)` (bỏ qua khi `scheduler-enabled=false`).
- **Gửi bù:** `@EventListener(ApplicationReadyEvent.class)`: nếu giờ VN hiện tại ≥ giờ của cron (mặc định 08:00) thì `runFor(today)`. `dedup_key` đảm bảo không trùng. Server tắt **cả ngày** của một mốc thì bỏ qua mốc đó (chấp nhận).
- `runFor(today)`: lấy các chuyến có `start_date IN (today + d, d ∈ countdown-days)` (chỉ chuyến đã chốt ngày). Với mỗi chuyến × mỗi thành viên qua bộ lọc §4.2 → `INSERT IGNORE` dòng `COUNTDOWN`, `send_after = now`, `dedup_key = CD:{tripId}:{userId}:{startDate}:{daysLeft}` (có `startDate` nên chốt lại ngày khác sẽ đếm lại). Mỗi chuyến 1 transaction.
- Chốt ngày **sau** 08:00 mà hôm nay trùng mốc → mốc hôm nay bị lỡ, mốc sau vẫn gửi (chấp nhận).

### 7.3 Nội dung (`CountdownContentBuilder`, đưa vào payload lúc tạo)
```json
{"tripTitle":"Phú Quốc","destination":"Phú Quốc","daysLeft":3,"startDate":"2026-11-27","endDate":"2026-11-30",
 "coverImageUrl":"https://…","day1":{"items":[{"time":"07:30","title":"Bay VJ321","location":"Tân Sơn Nhất"}],
 "dressTheme":"Biển xanh","dressColors":["navy","white"]},
 "myChecklist":[{"itemName":"Kem chống nắng","quantity":1}],"memberCount":8}
```
- `day1`: các mục lịch trình của `trip_days.day_index = 1` (tối đa 8, theo thứ tự hiển thị) + dress code ngày 1 (bỏ trống thì không hiện khối).
- `myChecklist`: món giao cho **người nhận** và chưa `is_checked` (tối đa 10, kèm "và N món khác").
- Mỗi người nhận 1 payload riêng (khác nhau ở `myChecklist`).

### 7.4 Email `countdown.html|.txt`
| Mốc | Tiêu đề |
|---|---|
| D-7 | `Còn 7 ngày nữa là tới Phú Quốc!` |
| D-3 | `Còn 3 ngày – chuẩn bị hành lý cho Phú Quốc nhé` |
| D-1 | `Mai đi Phú Quốc rồi! Kiểm tra lần cuối` |
| D-0 | `Hôm nay khởi hành: Phú Quốc 🎒` |

Thân: số ngày to ở giữa, ngày đi–về, khối "Ngày 1", khối "Dress code ngày 1" (ô màu từ palette `TripDayDressColor.PALETTE`: email dùng mã hex của palette, giữ đồng bộ với `lib/dressColors.ts`), khối "Việc của bạn" (checklist), nút `${FRONTEND_URL}/trips/{id}?tab=itinerary` và `?tab=checklist`. Ảnh bìa: URL http(s) thì hiện ảnh; `preset:` thì hiện dải gradient theo màu trong `lib/covers.ts`.

### 7.5 Kiểm thử (N3)
| Loại | Nội dung |
|---|---|
| Unit `CountdownMilestonesTest` | D-7/3/1/0 → có · D-2, D-8, quá ngày → rỗng · danh sách cấu hình khác |
| Integration `CountdownJobIntegrationTest` | Clock cố định: chuyến start = today+3 → mỗi thành viên có email 1 dòng · chạy 2 lần → vẫn 1 dòng · chưa chốt ngày → 0 · tắt `countdownEnabled` / mute → 0 · chốt lại ngày khác cùng mốc → dòng mới · payload có `myChecklist` đúng người · dispatcher gửi COUNTDOWN tách khỏi DIGEST cùng chuyến (2 email) |

---

### 7.6 Ghi chú contract đã chốt khi triển khai N3

- **Package `notification.countdown`:** `CountdownMilestones` (thuần), `CountdownContentBuilder` (JDBC), `CountdownJob`. Không có thay đổi FE.
- **Gửi bù:** so giờ hiện tại với lượt chạy đầu tiên trong ngày của chính biểu thức cron (`CronExpression`), không cố định 08:00; cron không chạy hôm nay (vd chỉ thứ Hai) thì không gửi bù.
- **Không bọc transaction:** mỗi dòng ghi bằng `INSERT IGNORE` theo `dedup_key` nên chạy lại an toàn; lỗi ở 1 chuyến chỉ log, không chặn các chuyến khác.
- **Payload thực tế:** `day1 = { items[{time, title, location}] (≤ 8, theo sort_order), moreItems, dressTheme, dressNote, dressColors[key] (theo thứ tự PALETTE) }` hoặc `null` khi chưa có ngày 1; `myChecklist[{itemName, quantity}]` (≤ 10, món giao cho người nhận và chưa tick) + `myChecklistMore`; `coverImageUrl` giữ nguyên giá trị trong DB (`https://…` hoặc `preset:…`).
- **Màu trong email:** ô màu dress code dùng `DressColorStyles` (hex + tên tiếng Việt), **phải đồng bộ** `frontend/src/lib/dressColors.ts` (unit test kiểm đủ khoá PALETTE). Ảnh bìa preset → dải `linear-gradient` + `background-color` dự phòng, màu lấy từ `CoverImageRenderer.presetHexColors` (đã đồng bộ `lib/covers.ts`).
- **Comment trong template email** phải dùng `<!--/* … */-->` (Thymeleaf bỏ khi render); comment HTML thường lọt vào thư.

## 8. Ghi chú vận hành

- **Theo dõi:** log INFO mỗi lần dispatcher có việc; WARN khi chạm `daily-limit`; ERROR khi listener lỗi / dòng chuyển FAILED. Kiểm tra nhanh: `SELECT status, COUNT(*) FROM notifications GROUP BY status;`.
- **Đổi nhà cung cấp** (Brevo/SES/Resend SMTP): chỉ đổi `MAIL_HOST/PORT/USERNAME/PASSWORD/FROM`; nếu gửi từ domain riêng cần SPF + DKIM.
- **Khi deploy** (SDD triển khai riêng): thêm `MAIL_*` vào `docker-compose.prod.yml`/`.env.prod`; nginx đã proxy `/api/` nên endpoint one-click hoạt động; `PUBLIC_BASE_URL` và `FRONTEND_URL` phải là URL thật để link trong mail đúng.
- **CLAUDE.md:** sau N1 bổ sung mục "Notifications" (outbox, dispatcher, `notify_email` tách khỏi `email`, Mailpit); thêm `notifications`/`trip_notification_mutes` vào ghi chú xoá thành viên / xoá chuyến (cả hai đều CASCADE, không cần sửa code).
