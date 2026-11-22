# TÀI LIỆU ĐẶC TẢ & KẾ HOẠCH TRIỂN KHAI THEO PHASE

**Dự án:** Team Trip Planner (Quản lý lịch trình & khoảnh khắc du lịch nhóm)  
**Quy mô mục tiêu:** MVP cho nhóm nhỏ (~10 - 15 thành viên)  
**Tech Stack:** Spring Boot 3.x (Backend) + ReactJS / Vite / TailwindCSS (Frontend) + PostgreSQL/MySQL 8.0 (Chuẩn BCNF) + Google Drive API  
**Công cụ hỗ trợ:** Claude Max + IDE (IntelliJ / VS Code)

---

## 1. Kiến trúc hệ thống & Giải pháp tối ưu cho Team nhỏ

* **Backend (Spring Boot 3.x):** Cung cấp RESTful API, xử lý logic tính toán ngày rảnh chung, phân quyền chuyến đi (`OWNER`, `EDITOR`, `VIEWER`), bảo mật JWT / Google OAuth2. Database dùng PostgreSQL hoặc MySQL 8.0 (host miễn phí trên Supabase/Neon/Aiven).
* **Frontend (ReactJS + Vite + TailwindCSS):** Giao diện SPA mượt mà, ưu tiên hiển thị dạng lưới (Grid/Timeline) và hỗ trợ Responsive tốt trên điện thoại để thành viên dễ xem khi đang di chuyển.
* **Giải pháp Lưu trữ Khoảnh khắc (Zero-Storage Server):**
  * Tạo 1 thư mục Google Drive chung cho chuyến đi (`drive_root_folder_id`).
  * Sử dụng **Google Picker API** trên Frontend để thành viên chọn ảnh/video từ Drive cá nhân hoặc upload trực tiếp vào thư mục chung của chuyến đi.
  * Backend chỉ lưu metadata (`drive_file_id`, `thumbnail_url`, `web_view_link`, `captured_at`) giúp giảm 100% chi phí lưu trữ server.

---

## 2. Thiết kế Cơ sở dữ liệu chuẩn BCNF (8 Bảng cốt lõi)

Hệ thống cơ sở dữ liệu được chuẩn hóa đạt chuẩn **BCNF (Boyce-Codd Normal Form)** nhằm loại bỏ hoàn toàn dư thừa dữ liệu và bất thường khi cập nhật:

1. **`users`**: `id` (PK), `google_sub` (UNIQUE), `email` (UNIQUE), `full_name`, `avatar_url`, `drive_refresh_token` (mã hóa AES), `created_at`.
2. **`trips`**: `id` (PK), `title`, `destination`, `invite_code` (UNIQUE), `start_date`, `end_date`, `drive_root_folder_id`, `created_by` (FK $\rightarrow$ `users`), `created_at`.
3. **`trip_members`**: `trip_id` (FK), `user_id` (FK), `role` (`OWNER`/`EDITOR`/`VIEWER`), `joined_at` — **PK tổ hợp:** `(trip_id, user_id)`.
4. **`member_availabilities`**: `id` (PK), `trip_id`, `user_id`, `start_time`, `end_time`, `status` (`AVAILABLE`/`BUSY`/`MAYBE`) — **FK tổ hợp:** `(trip_id, user_id) -> trip_members(trip_id, user_id)`.
5. **`trip_days`**: `id` (PK), `trip_id` (FK), `day_index` (Ngày 1, 2...), `actual_date`, `note` — **UNIQUE:** `(trip_id, day_index)`.
6. **`itinerary_items`**: `id` (PK), `trip_day_id` (FK $\rightarrow$ `trip_days`, không chứa `trip_id` để tránh phụ thuộc bắc cầu), `title`, `category`, `start_time`, `end_time`, `location_name`, `latitude`, `longitude`, `estimated_cost`, `sort_order`, `created_by` (FK).
7. **`drive_media`**: `id` (PK), `trip_id` (FK), `itinerary_item_id` (FK NULLABLE), `uploaded_by` (FK), `drive_file_id` (UNIQUE), `file_name`, `mime_type`, `thumbnail_url`, `web_view_link`, `captured_at`.
8. **`trip_checklists`**: `id` (PK), `trip_id` (FK), `assignee_id` (FK NULLABLE), `item_name`, `is_checked`.

---

## 3. Danh sách chức năng chi tiết theo từng màn hình

### Màn hình 1: Đăng nhập & Xác thực (Auth Screen)
* Đăng nhập bằng Google (Google OAuth2) xin quyền cơ bản và quyền Google Drive (`drive.file`).
* Tham gia chuyến đi nhanh qua **Invite Link / Room Code**.

### Màn hình 2: Dashboard - Danh sách chuyến đi (Trips Hub)
* Hiển thị danh sách chuyến đi theo trạng thái (*Đang chốt lịch*, *Sắp khởi hành*, *Đã hoàn thành*).
* Tạo chuyến đi mới (Tên, địa điểm, khoảng thời gian dự kiến, liên kết thư mục Google Drive gốc).
* Quản lý danh sách ~10 thành viên và phân quyền (`OWNER`, `EDITOR`, `VIEWER`).

### Màn hình 3: Lịch rảnh & Tìm ngày chốt đoàn (Availability Timeline)
* **Lưới chọn khung giờ/ngày (Interactive Grid):** Trục ngang là các ngày/khung giờ dự kiến, trục dọc là 10 thành viên. Click/kéo thả đánh dấu: **Rảnh (Xanh)**, **Bận (Đỏ)**, **Có thể thu xếp (Vàng)**.
* **Thanh thống kê tự động:** Highlight các khoảng 2-3 ngày liên tiếp có tỷ lệ thành viên rảnh cao nhất.
* **Chốt ngày (Lock Date):** Host khóa bảng khảo sát để chốt `start_date` và `end_date` chính thức.

### Màn hình 4: Lịch trình chi tiết & Checklist (Itinerary & Timeline)
* **Timeline theo từng ngày (`trip_days`):** Hiển thị dọc theo khung giờ (Giờ bắt đầu - kết thúc, Địa điểm, Tọa độ/Link Google Maps, Chi phí dự kiến).
* Thêm/Sửa/Xóa hoạt động, kéo thả đổi thứ tự (`sort_order`).
* **Checklist đồ dùng chung:** Phân công người chuẩn bị (`assignee_id`) và tick hoàn thành.

### Màn hình 5: Khoảnh khắc & Album Google Drive (Moments Gallery)
* Chọn ảnh/video qua Google Picker, tự động lấy `thumbnail_url` và `web_view_link`.
* Gom nhóm ảnh theo *Ngày đi* hoặc gắn thẳng vào *Địa điểm/Hoạt động* (`itinerary_item_id`).
* Nút **"Mở trên Google Drive"** để xem/tải ảnh gốc chất lượng cao.

---

## 4. Kế hoạch triển khai chi tiết theo từng Phase (Tổng 2 - 3 tuần)

Chiến lược triển khai là **làm cuốn chiếu**: Xong Phase nào dùng được ngay tính năng của Phase đó.

### PHASE 1: Dựng khung dự án, Database chuẩn BCNF & Xác thực (Ngày 1 – Ngày 3)
**Mục tiêu:** Chạy được luồng cơ bản từ đăng nhập Google, khởi tạo DB chuẩn BCNF, tạo chuyến đi đến mời 10 thành viên vào phòng.

* **Database & Backend (Spring Boot):**
  * Viết Flyway/Liquibase migration script (`V1__init_schema.sql`) cho 8 bảng chuẩn BCNF, thiết lập đầy đủ khóa ngoại tổ hợp và index.
  * Xây dựng bộ JPA Entity (`@EmbeddedId` cho `trip_members`, cấu hình `FetchType.LAZY`).
  * Cấu hình Spring Security + Google OAuth2 Login + JWT.
  * Viết API CRUD chuyến đi (`POST /api/trips`, `GET /api/trips`) và API tham gia chuyến đi qua mã mời (`POST /api/trips/join/{inviteCode}`).
* **Frontend (ReactJS):**
  * Khởi tạo project Vite + React + TailwindCSS + React Router.
  * Dựng trang Login, trang Dashboard danh sách chuyến đi và Modal tạo chuyến đi mới.
  * Tích hợp Axios interceptor tự động gắn JWT Token.
* **Đầu ra (Deliverable):** Web chạy local ổn định; user đăng nhập được bằng Google, tạo được chuyến đi và copy link mời người khác vào nhóm.

---

### PHASE 2: Tính năng cốt lõi 1 – Lịch rảnh & Chốt ngày (Ngày 4 – Ngày 7)
**Mục tiêu:** Giải quyết bài toán khó nhất của nhóm là tìm ngày đi chung.

* **Backend (Spring Boot):**
  * Viết API lấy ma trận lịch rảnh của tất cả thành viên (`GET /api/trips/{id}/availabilities`).
  * Viết API cập nhật hàng loạt (Batch Update) trạng thái `AVAILABLE`/`BUSY`/`MAYBE` của 1 user (`PUT /api/trips/{id}/availabilities`), đảm bảo ràng buộc khóa ngoại tổ hợp `(trip_id, user_id)`.
  * Viết thuật toán tính toán và trả về Top 3 khoảng thời gian (2-3 ngày liên tiếp) có số lượng thành viên rảnh cao nhất.
  * Viết API chốt ngày chính thức dành riêng cho `OWNER` (`PATCH /api/trips/{id}/lock-date`), đồng thời tự động sinh các bản ghi tương ứng trong bảng `trip_days`.
* **Frontend (ReactJS):**
  * Xây dựng component **Availability Matrix Grid** (hỗ trợ click hoặc kéo chuột chọn nhiều ô ngày/giờ).
  * Hiển thị box **"Gợi ý ngày đẹp nhất"** phía trên bảng.
* **Đầu ra (Deliverable):** Cả nhóm 10 người có thể vào tick lịch bận/rảnh và Host bấm chốt được ngày khởi hành, tự động tạo khung các ngày đi.

---

### PHASE 3: Tính năng cốt lõi 2 – Lịch trình chi tiết & Checklist (Ngày 8 – Ngày 11)
**Mục tiêu:** Lên kế hoạch ăn chơi, di chuyển chi tiết theo từng ngày (`trip_days`) và phân công chuẩn bị đồ.

* **Backend (Spring Boot):**
  * Viết API CRUD cho từng hoạt động (`itinerary_items` gắn với `trip_day_id`).
  * Viết API cập nhật hàng loạt thứ tự (`sort_order`) và khung giờ khi kéo thả trên UI (`PATCH /api/trip-days/{dayId}/items/reorder`).
  * Viết API CRUD cho `trip_checklists` (thêm đồ cần mang, gán thành viên phụ trách, tick hoàn thành).
* **Frontend (ReactJS):**
  * Dựng giao diện **Vertical Timeline** chia theo từng Tab ngày (`Ngày 1`, `Ngày 2`, `Ngày 3`...).
  * Form thêm/sửa hoạt động nhanh (tích hợp chọn tọa độ/link Google Maps, chi phí dự kiến).
  * Tích hợp thư viện kéo thả (`@dnd-kit/core`) để sắp xếp lại lịch trình.
  * Dựng tab/drawer **Checklist chuẩn bị** cho cả nhóm.
* **Đầu ra (Deliverable):** Hoàn thiện 80% giá trị cốt lõi của ứng dụng. **Có thể deploy bản Beta ngay cuối Phase 3 để team dùng lên lịch cho chuyến đi.**

---

### PHASE 4: Tích hợp Google Drive & Hoàn thiện Production (Ngày 12 – Ngày 16)
**Mục tiêu:** Lưu giữ ảnh/video kỷ niệm gắn với lịch trình mà không tốn dung lượng server, tối ưu giao diện điện thoại.

* **Cấu hình Google Cloud:**
  * Tạo project trên Google Cloud Console, bật **Google Drive API** và **Google Picker API**, lấy `Client ID` và `API Key`.
* **Backend (Spring Boot):**
  * Viết API lưu metadata ảnh/video (`drive_file_id`, `file_name`, `mime_type`, `thumbnail_url`, `web_view_link`, `itinerary_item_id`) vào bảng `drive_media`.
  * Xử lý logic lọc ảnh theo từng ngày (`trip_day_id`) hoặc theo từng địa điểm (`itinerary_item_id`).
* **Frontend (ReactJS):**
  * Tích hợp nút **"Thêm ảnh từ Google Drive"** mở popup Google Picker.
  * Xây dựng trang **Moments Gallery** hiển thị dạng lưới (Masonry Grid), lọc theo ngày/địa điểm và mở thẳng link ảnh gốc trên Drive.
  * Rà soát lại toàn bộ CSS Responsive trên màn hình điện thoại (Mobile-first check).
* **Deploy Production:**
  * Frontend: **Vercel** (Miễn phí).
  * Backend: **Render** hoặc **Railway** (Đóng gói bằng Docker).
  * Database: **Supabase** hoặc **Neon** (PostgreSQL miễn phí).
* **Đầu ra (Deliverable):** Sản phẩm hoàn chỉnh chạy online trên tên miền riêng, sẵn sàng phục vụ chuyến đi của cả nhóm.