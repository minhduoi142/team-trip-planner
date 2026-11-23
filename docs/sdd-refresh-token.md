# SDD – Refresh Token Rotation, Reuse Detection & Token Family

**Dự án:** Team Trip Planner
**Phụ thuộc:** Phase 1 (JWT HS256 tự phát hành, `AuthService`, `SecurityConfig`)
**Trạng thái:** Đã triển khai

---

## 1. Bối cảnh & mục tiêu

### 1.1 Hiện tại
- Đăng nhập trả **1 access token JWT sống 7 ngày**. FE lưu token này trong **`localStorage`**.
- Token lộ (XSS, máy dùng chung, extension độc) thì kẻ gian dùng được **trọn 7 ngày** và server **không thu hồi được**.

### 1.2 Mục tiêu
1. **Access token ngắn** (15 phút), FE chỉ giữ trong **bộ nhớ** (không ghi `localStorage`).
2. **Refresh token** (chuỗi ngẫu nhiên, không phải JWT) nằm trong **cookie HttpOnly**, nên JavaScript không đọc được.
3. **Rotation:** mỗi lần làm mới, refresh token cũ **hết hiệu lực ngay**, server phát token mới.
4. **Token family:** mọi token xoay ra từ **một lần đăng nhập** thuộc cùng một "họ" (≈ một phiên trên một trình duyệt).
5. **Reuse detection:** một refresh token **đã dùng rồi** mà bị dùng lại thì coi như đã lộ, **thu hồi cả họ**. Cả kẻ gian lẫn người dùng thật đều phải đăng nhập lại.
6. **Đăng xuất thật:** thu hồi họ token ở server. Có thêm **"Đăng xuất mọi thiết bị"**.

### 1.3 Ngoài phạm vi
- Thu hồi tức thì access token đang còn hạn. Access token vẫn stateless; sau khi thu hồi họ, access token đã cấp còn sống **tối đa 15 phút**. Đây là đánh đổi có chủ đích để không phải truy vấn DB mỗi request.
- Trang liệt kê các phiên / thiết bị đang đăng nhập.
- Đổi mật khẩu / quên mật khẩu (chưa có tính năng này).

---

## 2. Thuật ngữ

| Thuật ngữ | Nghĩa |
|---|---|
| Access token (AT) | JWT HS256 như cũ, `sub` = userId, TTL **15 phút** |
| Refresh token (RT) | 32 byte ngẫu nhiên (`SecureRandom`), base64url. **Server chỉ lưu SHA-256** |
| Family (họ) | Chuỗi RT sinh ra từ 1 lần đăng nhập. Thu hồi theo họ |
| Consumed | RT đã được dùng để xoay. Chỉ dùng được **1 lần** |
| Grace window | 10 giây sau khi một RT bị consumed. Dùng lại trong khoảng này **không** coi là tấn công (thường do 2 tab làm mới cùng lúc) |

---

## 3. Cơ sở dữ liệu – `V8__refresh_tokens.sql`

```sql
CREATE TABLE refresh_token_families (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    user_id        BIGINT       NOT NULL,
    created_at     DATETIME(6)  NOT NULL,
    last_used_at   DATETIME(6)  NOT NULL,
    revoked_at     DATETIME(6)  NULL,
    revoke_reason  VARCHAR(20)  NULL,       -- LOGOUT | LOGOUT_ALL | REUSE_DETECTED
    user_agent     VARCHAR(255) NULL,
    CONSTRAINT pk_rt_families PRIMARY KEY (id),
    CONSTRAINT fk_rt_families_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_rt_families_revoke CHECK ((revoked_at IS NULL) = (revoke_reason IS NULL)),
    CONSTRAINT chk_rt_families_reason CHECK (revoke_reason IS NULL OR
        revoke_reason IN ('LOGOUT', 'LOGOUT_ALL', 'REUSE_DETECTED')),
    INDEX idx_rt_families_user (user_id)
);

CREATE TABLE refresh_tokens (
    id           BIGINT      NOT NULL AUTO_INCREMENT,
    family_id    BIGINT      NOT NULL,
    token_hash   CHAR(64)    NOT NULL,      -- SHA-256 hex, KHÔNG lưu token gốc
    issued_at    DATETIME(6) NOT NULL,
    expires_at   DATETIME(6) NOT NULL,
    consumed_at  DATETIME(6) NULL,          -- NULL = token hiện hành của họ
    CONSTRAINT pk_refresh_tokens PRIMARY KEY (id),
    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_family FOREIGN KEY (family_id)
        REFERENCES refresh_token_families (id) ON DELETE CASCADE,
    INDEX idx_refresh_tokens_family (family_id)
);
```

**BCNF:**
- `user_id` chỉ nằm ở **family**. Nếu đặt thêm vào `refresh_tokens` thì `token → family → user` là phụ thuộc bắc cầu.
- "Bị thu hồi" là thuộc tính của **họ**, không lặp lại trên từng token.
- Hạn tuyệt đối của họ = `created_at + 60 ngày`: **suy ra**, không lưu.
- **Không** có cột `parent_id` tự tham chiếu. Chuỗi token rất dài, mà MySQL giới hạn cascade sâu 15 tầng, nên xóa họ có thể lỗi. Thứ tự trong họ suy ra từ `issued_at`.

---

## 4. Luồng

### 4.1 Đăng nhập / đăng ký / Google
Tạo **family mới**, kèm RT đầu tiên (hạn 14 ngày). Body trả `AuthResponse` **như cũ** (`accessToken`, `expiresAt`, `user`), thêm header:

```
Set-Cookie: tp_rt=<RT>; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict; Max-Age=1209600
```

### 4.2 Làm mới – `POST /api/v1/auth/refresh` (không cần access token, đọc cookie)
Chạy trong 1 transaction, **khóa hàng family** (`PESSIMISTIC_WRITE`) để các lần xoay trong cùng họ chạy tuần tự:

```
hash(cookie) → tìm RT
├─ không có cookie / không tìm thấy RT     → 401 INVALID_REFRESH_TOKEN (xóa cookie)
├─ họ đã bị thu hồi                         → 401 INVALID_REFRESH_TOKEN (xóa cookie)
├─ RT hết hạn, hoặc họ quá 60 ngày          → 401 INVALID_REFRESH_TOKEN (xóa cookie)
├─ RT đã consumed:
│    ├─ consumed ≤ 10 giây trước            → 401 REFRESH_TOKEN_STALE (KHÔNG thu hồi, KHÔNG xóa cookie)
│    └─ consumed > 10 giây trước            → THU HỒI CẢ HỌ (REUSE_DETECTED), log WARN
│                                             → 401 REFRESH_TOKEN_REUSED (xóa cookie)
└─ hợp lệ → RT.consumed_at = now; tạo RT mới cùng họ (hạn 14 ngày, không vượt hạn tuyệt đối của họ);
            family.last_used_at = now → 200 AuthResponse (AT mới) + Set-Cookie RT mới
```

Quyết định chỉ phụ thuộc trạng thái và thời gian, nên viết thành class thuần **`RefreshTokenPolicy`** có unit test riêng (giống `AvailabilitySuggester`).

### 4.3 Đăng xuất
| Endpoint | Cần AT? | Việc làm |
|---|---|---|
| `POST /api/v1/auth/logout` | Không (đọc cookie) | Thu hồi họ của RT trong cookie (`LOGOUT`), xóa cookie, 204. Cookie sai hoặc thiếu vẫn 204 (idempotent) |
| `POST /api/v1/auth/logout-all` | Có | Thu hồi **mọi** họ còn hiệu lực của user (`LOGOUT_ALL`), xóa cookie, 204 |

### 4.4 Dọn rác
`@Scheduled` mỗi ngày lúc 03:30 xóa các họ đã thu hồi quá 7 ngày, hoặc đã quá hạn tuyệt đối. Token bị xóa theo nhờ CASCADE.

---

## 5. Bảo mật cookie & CORS
- **HttpOnly**: JavaScript (kể cả mã XSS) không đọc được RT.
- **`Path=/api/v1/auth`**: cookie chỉ gửi kèm request tới auth, không đi theo mọi API.
- **`SameSite=Strict`**: trang web khác không kích hoạt được refresh/logout (chặn CSRF). FE và BE **cùng site** trong cả 2 môi trường: local `localhost:5173` ↔ `localhost:8080` (SameSite không tính cổng), production cùng tên miền qua nginx.
- **`Secure`**: mặc định bật (`localhost` được trình duyệt coi là an toàn). Tắt được bằng `AUTH_COOKIE_SECURE=false` nếu chạy HTTP bằng IP.
- **CORS**: `allowCredentials(true)` với danh sách origin cố định như hiện tại (không dùng `*`).

---

## 6. Cấu hình (`application.yml` → `AppProperties`)

| Biến môi trường | Mặc định | Ghi chú |
|---|---|---|
| `JWT_ACCESS_TTL_MINUTES` | 15 | **Thay** `JWT_EXPIRATION_DAYS` |
| `AUTH_REFRESH_TTL_DAYS` | 14 | Hạn trượt của mỗi RT |
| `AUTH_FAMILY_MAX_DAYS` | 60 | Hạn tuyệt đối: quá hạn này phải đăng nhập lại dù vẫn dùng thường xuyên |
| `AUTH_REUSE_GRACE_SECONDS` | 10 | Grace window |
| `AUTH_COOKIE_SECURE` | true | |
| `AUTH_COOKIE_SAME_SITE` | Strict | |

---

## 7. Mã lỗi mới (thêm cả vào `frontend/src/types/api.ts`)

| Code | HTTP | Thông báo |
|---|---|---|
| `INVALID_REFRESH_TOKEN` | 401 | Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại |
| `REFRESH_TOKEN_STALE` | 401 | Phiên vừa được làm mới ở tab khác, vui lòng thử lại |
| `REFRESH_TOKEN_REUSED` | 401 | Phát hiện phiên đăng nhập bất thường. Để bảo vệ tài khoản, bạn cần đăng nhập lại |

---

## 8. Frontend

| Phần | Thay đổi |
|---|---|
| `lib/token.ts` | AT chỉ ở **bộ nhớ**. Xóa key cũ `tp.accessToken` khỏi `localStorage` một lần. Cờ **không bí mật** `tp.hasSession` (localStorage) cho biết "có thể đang có cookie", để khách chưa đăng nhập khỏi phải gọi refresh |
| `lib/session.ts` (mới) | `refreshSession()`: **single-flight** trong tab (chung 1 promise) + **giữa các tab** bằng Web Locks (`navigator.locks`, không có thì chỉ single-flight trong tab). Gặp `REFRESH_TOKEN_STALE` thì đợi 300 ms rồi thử lại **1 lần** (cookie lúc này đã được tab kia cập nhật) |
| `lib/api.ts` | `withCredentials: true`. Gặp 401 ở request **không phải `/auth/*`** thì gọi `refreshSession()` rồi **gửi lại request 1 lần**. Refresh thất bại thì phát sự kiện đăng xuất kèm mã lỗi |
| `AuthProvider` | Lúc tải trang: có cờ `tp.hasSession` thì gọi refresh (lấy AT + user), không thì `anonymous` ngay. `logout()` gọi `/auth/logout`. Thêm `logoutAll()`. Đồng bộ giữa các tab qua `BroadcastChannel('tp-auth')`: tab này đăng xuất thì tab khác cũng đăng xuất; tab này đăng nhập thì tab khác tự refresh |
| Toast | Mã `REFRESH_TOKEN_REUSED` thì báo "Phát hiện phiên đăng nhập bất thường…" |
| Hồ sơ | Nút **Đăng xuất mọi thiết bị** |

**Ảnh hưởng khi triển khai:** người đang đăng nhập (token cũ trong `localStorage`, chưa có cookie) sẽ **phải đăng nhập lại 1 lần**.

---

## 9. Kiểm thử
| Loại | Nội dung |
|---|---|
| Unit `RefreshTokenPolicyTest` | Hợp lệ → ROTATE · không tìm thấy / họ thu hồi / hết hạn / quá hạn tuyệt đối → INVALID · consumed trong grace → STALE · consumed ngoài grace → REUSED |
| Integration | Đăng nhập trả cookie HttpOnly + `Path` + `SameSite` · refresh → AT mới + RT mới khác RT cũ · dùng lại RT cũ ngay → `STALE`, họ vẫn sống · dùng lại RT cũ sau grace → `REUSED`, RT mới nhất cũng bị chặn · logout → RT bị chặn · logout-all chặn mọi họ · thiếu cookie → `INVALID` · access token mới gọi API được |
