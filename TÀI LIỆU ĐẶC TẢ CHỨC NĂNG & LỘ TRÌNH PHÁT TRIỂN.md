# TÀI LIỆU ĐẶC TẢ CHỨC NĂNG & LỘ TRÌNH PHÁT TRIỂN
**Dự án:** Team Trip Planner (Quản lý lịch trình & khoảnh khắc du lịch nhóm)  
**Quy mô mục tiêu:** MVP cho nhóm nhỏ (~10 - 15 thành viên)  
**Tech Stack:** Spring Boot (Backend) + ReactJS (Frontend) + Google Drive API / Link Embedding  
**Công cụ hỗ trợ AI:** Claude Max (Sonnet/Opus) + IDE sẵn có (VS Code / IntelliJ)

---

## 1. Kiến trúc hệ thống & Giải pháp tối ưu cho Team nhỏ

Để tiết kiệm chi phí server (không cần thuê S3, Cloudinary hay VPS dung lượng lớn) và tối ưu tốc độ code:
* **Backend (Spring Boot 3.x):** Cung cấp RESTful API, xử lý logic tính toán ngày rảnh chung, chia tiền (nếu có), bảo mật JWT/Google OAuth2. Database dùng PostgreSQL hoặc MySQL (có thể host miễn phí trên Supabase/Neon/Aiven).
* **Frontend (ReactJS + Vite + TailwindCSS):** Giao diện SPA mượt mà, ưu tiên hiển thị dạng lưới (Grid/Timeline) và hỗ trợ Responsive tốt trên điện thoại để thành viên dễ xem khi đang đi chơi.
* **Giải pháp Lưu trữ Khoảnh khắc (Zero-Storage Server):** 
  * *Cách 1 (Nhanh nhất - Khuyên dùng cho MVP):* Tạo 1 thư mục Google Drive chung cho chuyến đi. Người dùng dán link thư mục/link ảnh/video hoặc dùng **Google Picker API** để chọn ảnh từ Drive cá nhân/nhóm. Backend chỉ lưu `fileId`, `thumbnailLink`, `webViewLink`, người đăng và chú thích.
  * *Cách 2 (Tự động hóa):* Dùng Google Drive API (Service Account hoặc OAuth2 của trưởng nhóm) để user upload trực tiếp qua web, backend stream thẳng file lên thư mục Drive của nhóm mà không lưu vào ổ cứng server.

---

## 2. Danh sách chức năng chi tiết theo từng màn hình

### Màn hình 1: Đăng nhập & Xác thực (Auth Screen)
* **Đăng nhập bằng Google (Google OAuth2):** Khuyên dùng nhất vì người dùng đã có sẵn tài khoản Google để dùng tính năng liên kết Drive sau này.
* **Đăng nhập truyền thống:** Email/Password (dự phòng cho người không muốn liên kết Google).
* **Tham gia chuyến đi qua Link mời (Invite Link / Room Code):** Nhập mã hoặc bấm link trưởng nhóm gửi để vào thẳng chuyến đi mà không cần thao tác rườm rà.

### Màn hình 2: Dashboard - Danh sách chuyến đi (Trips Hub)
* **Danh sách chuyến đi:** Hiển thị các chuyến đi nhóm đã và đang lên kế hoạch (Trạng thái: *Đang chốt lịch*, *Sắp khởi hành*, *Đã hoàn thành*).
* **Tạo chuyến đi mới:** Nhập tên chuyến đi, địa điểm dự kiến, mô tả ngắn, ảnh bìa, khoảng thời gian dự kiến (ví dụ: Tháng 7/2026) và gắn link thư mục Google Drive gốc của chuyến đi.
* **Quản lý thành viên:** Xem danh sách ~10 thành viên, phân quyền đơn giản (*Trưởng nhóm / Host* và *Thành viên*).

### Màn hình 3: Lịch rảnh & Tìm ngày chốt đoàn (Availability Timeline) - *Tính năng cốt lõi 1*
* **Lưới chọn ngày (Interactive Calendar Grid / Heatmap):**
  * Giao diện giống *When2meet*: Trục ngang là các ngày trong tháng/khoảng thời gian dự kiến, trục dọc là tên 10 thành viên.
  * Thành viên click/kéo thả để đánh dấu: **Rảnh (Xanh)**, **Bận (Đỏ)**, **Có thể thu xếp (Vàng)** kèm ghi chú lý do (vd: *"Tối thứ 6 bận họp"*).
* **Thanh thống kê tự động (Smart Suggestion):**
  * Hệ thống tự động highlight các khoảng 2-3 ngày liên tiếp có tỷ lệ thành viên rảnh cao nhất (vd: *9/10 người rảnh từ 15/07 - 17/07*).
* **Chốt ngày (Lock Date):** Host bấm nút chốt ngày chính thức để khóa bảng khảo sát và chuyển sang bước lên lịch trình chi tiết.

### Màn hình 4: Lịch trình chi tiết (Itinerary & Timeline) - *Tính năng cốt lõi 2*
* **Timeline theo từng ngày (Day 1, Day 2, Day 3...):**
  * Hiển thị dọc theo khung giờ (07:00 -> 22:00).
  * Thông tin mỗi hoạt động: Giờ bắt đầu - kết thúc, Tên địa điểm, Link Google Maps, Ghi chú chuẩn bị (vd: *"Mặc đồ trắng"*), Chi phí dự kiến.
* **Thao tác nhanh:**
  * Thêm/Sửa/Xóa hoạt động.
  * Kéo thả (Drag & Drop) để đổi thứ tự hoặc dời giờ hoạt động.
  * **Bình chọn địa điểm (Mini Poll):** Cho phép thành viên đề xuất quán ăn/điểm chơi và vote trực tiếp trên timeline.

### Màn hình 5: Khoảnh khắc & Album Google Drive (Moments Gallery) - *Tính năng cốt lõi 3*
* **Tích hợp Google Picker / Dán Link Drive:**
  * Thành viên chọn ảnh/video từ Google Drive hoặc dán link chia sẻ. Hệ thống tự động lấy ảnh thu nhỏ (thumbnail) hiển thị lên web.
* **Phân loại theo dòng thời gian / Ngày đi:**
  * Tự động gom nhóm ảnh theo *Ngày 1*, *Ngày 2* hoặc theo *Địa điểm* trong lịch trình.
* **Tương tác kỷ niệm:**
  * Viết caption ngắn, thả cảm xúc (React emoji) và bình luận dưới từng bức ảnh/video.
  * Nút **"Mở toàn bộ trên Google Drive"** để xem ảnh gốc chất lượng cao hoặc tải hàng loạt.

### Màn hình 6: Tiện ích bổ sung (Tùy chọn - Làm sau nếu dư thời gian)
* **Checklist đồ dùng chung (Packing List):** Ai mang lều, ai mang loa, ai mang thuốc (tránh mang trùng hoặc thiếu).
* **Chia tiền nhóm cơ bản (Expense Splitter):** Ghi lại ai đã ứng tiền gì (tiền xe, tiền homestay) và tự động tính toán cuối chuyến ai cần chuyển khoản cho ai.

---

## 3. Ước tính thời gian thực hiện (Với sự hỗ trợ của Claude Max)

Vì bạn đang có **Claude Max** (giới hạn tin nhắn rất thoải mái, dùng được Claude Sonnet/Opus để sinh code trọn vẹn từng module) và quy mô user chỉ khoảng 10 người (không cần tối ưu chịu tải hàng triệu request), tốc độ làm sẽ cực kỳ nhanh. 

*(Lưu ý: Bạn không cần công cụ Argon vì Claude Max kết hợp với IDE hiện tại của bạn đã quá đủ để sinh code, fix bug và thiết kế database).*

### Tổng thời gian dự kiến: **2 đến 3 tuần** (Làm tranh thủ buổi tối & cuối tuần, khoảng 2-3 tiếng/ngày)

| Giai đoạn | Thời gian | Nội dung công việc chính | Cách tận dụng Claude Max |
| :--- | :--- | :--- | :--- |
| **Giai đoạn 1: Khởi tạo & Auth** | **2 - 3 ngày** | - Thiết kế Database Schema.<br>- Dựng khung Spring Boot + React.<br>- Làm Login (Google OAuth2 hoặc JWT cơ bản) & Tạo chuyến đi. | Nhờ Claude viết sẵn file `schema.sql`, cấu hình Spring Security + JWT và khung giao diện React với TailwindCSS trong 1-2 prompt. |
| **Giai đoạn 2: Lịch rảnh & Timeline** | **4 - 5 ngày** | - Làm màn hình chọn ngày bận/rảnh (Grid).<br>- Làm màn hình Timeline lịch trình theo ngày (CRUD hoạt động). | Yêu cầu Claude code trọn vẹn component bảng chọn ngày (dạng ma trận) và API gom nhóm ngày rảnh nhất. |
| **Giai đoạn 3: Tích hợp Google Drive** | **3 - 4 ngày** | - Cấu hình Google Cloud Console (lấy Client ID & API Key).<br>- Tích hợp Google Picker API lên React.<br>- Lưu metadata ảnh/video vào DB và hiển thị Gallery. | Nhờ Claude hướng dẫn từng bước bật Google Drive API / Google Picker và viết sẵn React Hook xử lý việc chọn file từ Drive. |
| **Giai đoạn 4: Hoàn thiện & Deploy** | **3 - 4 ngày** | - Tối ưu giao diện trên Mobile.<br>- Fix bug logic.<br>- Đưa web lên mạng để cả nhóm cùng dùng. | Deploy miễn phí/giá rẻ: Frontend lên **Vercel**, Backend lên **Render/Railway**, DB lên **Supabase**. Nhờ Claude viết `Dockerfile` chuẩn. |

---

## 4. Lời khuyên để không bị "ngợp" khi code
1. **Làm cuốn chiếu (MVP trước):** Hãy hoàn thành luồng cốt lõi (*Tạo chuyến đi -> Chọn ngày rảnh -> Lên lịch trình*) và deploy cho team dùng thử ngay trong tuần đầu tiên. Tính năng *Album Drive* có thể cập nhật thêm vào tuần thứ 2 khi cả nhóm chuẩn bị đi.
2. **Đơn giản hóa việc kết nối Drive:** Nếu cấu hình Google Picker API mất nhiều thời gian xin quyền (OAuth Consent Screen), bạn có thể dùng giải pháp **nhúng trực tiếp iframe thư mục Google Drive** vào trang web hoặc chỉ cần lưu link ảnh Drive kèm mô tả. Cách này làm mất đúng **30 phút** mà vẫn đạt hiệu quả tương đương cho nhóm 10 người.
3. **Tận dụng Claude Projects:** Hãy tạo một Project trên Claude Max, upload file `.md` này cùng cấu trúc thư mục code của bạn vào đó để Claude luôn nhớ ngữ cảnh toàn bộ dự án mỗi khi bạn nhờ viết thêm API hay màn hình mới.