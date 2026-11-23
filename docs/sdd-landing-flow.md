# SDD – Landing page và luồng điều hướng

**Dự án:** Team Trip Planner
**Trạng thái:** Đã triển khai (chỉ frontend, không đổi backend)

## 1. Nguyên tắc
Landing (`/`) là cửa chính cho **người lạ**. Link có mục đích cụ thể (link mời, link tới một chuyến) thì **đi thẳng** tới nơi cần đến, không vòng qua landing.

## 2. Bản đồ route

| Route | Chưa đăng nhập | Đã đăng nhập |
|---|---|---|
| `/` | Landing | → `/trips` |
| `/login`, `/register` | Form (logo → `/`) | → `returnTo` hoặc `/trips` |
| `/trips`, `/trips/:id` | → `/login?returnTo=…` | Vào thẳng |
| `/join/:code` | Xem trước + **Tạo tài khoản & tham gia** / **Tôi đã có tài khoản** | Xem trước + **Tham gia** |
| `/share/:code/*` | Backend (Open Graph). Nếu proxy chưa chuyển → SPA đưa sang `/join/:code` | như cột trái |
| Bấm **Đăng xuất** | → `/` (landing) | — |
| Phiên hết hạn (401) | → `/login?returnTo=…` (giữ trang đang xem) | — |
| 404 | "Về trang chủ" → `/` | `/` tự vào `/trips` |

## 3. Luồng người dùng

1. **Người mới:** `/` → **Bắt đầu miễn phí** → `/register` → `/trips` (trống: Tạo chuyến / Nhập mã mời) → tạo chuyến → mời bạn bè.
2. **Người cũ:** `/` → tự vào `/trips` (không thấy landing).
3. **Người lạ bấm link mời:** `/share/X` → `/join/X` (ảnh bìa, tên chuyến, số người) → **Tạo tài khoản & tham gia** → `/register?returnTo=/join/X?auto=1` (có dòng "Bạn được mời vào {tên chuyến}…") → đăng ký (hoặc Google) → quay lại `/join/X?auto=1` → **tự tham gia** → `/trips/{id}`.
   - Đã có tài khoản: **Tôi đã có tài khoản** → `/login?returnTo=/join/X?auto=1` → như trên.
   - `auto=1` chỉ gọi join **một lần** mỗi lần vào trang; backend `POST /trips/join/{code}` idempotent (đã là thành viên → `alreadyMember`).
4. **Có mã nhưng tự gõ tên miền:** landing → ô **Có mã mời?** (nhận mã trơn, link `/join/…` hoặc `/share/…`) → `/join/X`.
5. **Đăng xuất:** `AuthProvider.logout()` (khác `signOut()` dùng cho 401) đặt `loggedOut = true` → `ProtectedRoute` đưa về `/` thay vì `/login`.

## 4. Liên hệ ở landing
Không có form, không qua backend:
- **Nhắn Zalo**: `https://zalo.me/{VITE_CONTACT_ZALO}`. Bỏ trống thì ẩn nút.
- **Gửi Gmail**: trang soạn thư Gmail điền sẵn người nhận `VITE_CONTACT_EMAIL` và tiêu đề "Góp ý Trip Planner", kèm link `mailto:` dự phòng.

## 5. Thẻ xem trước của tên miền
`index.html` có `og:title`/`og:description` giới thiệu sản phẩm và `og:image` = `{VITE_SHARE_BASE_URL}/og-image.jpg` (1200×630, chụp từ phần đầu landing, nằm trong `public/`). Plugin `ogOrigin` trong `vite.config.ts` thay `%OG_ORIGIN%` lúc build. Production phải đặt `VITE_SHARE_BASE_URL` = tên miền công khai, vì Facebook không nhận `og:image` tương đối.

## 6. Kiểm thử (trình duyệt tự động, khung 390px)
Khách vào `/` thấy landing · dán link `/share/…` vào ô mã mời → `/join/…` · **Tạo tài khoản & tham gia** → `/register` có `returnTo` + dòng nhắc tên chuyến · đăng ký xong **tự vào nhóm** · đăng xuất → `/` · logo ở `/login` → `/` · token hỏng → `/login?returnTo=…`.
