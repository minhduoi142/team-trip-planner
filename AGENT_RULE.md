# AGENT_RULE.md — Team Trip Planner Monorepo

## 1. Project Context & Architecture
- **Project:** Team Trip Planner (Quản lý lịch trình du lịch nhóm, khảo sát lịch rảnh, lưu khoảnh khắc qua Google Drive).
- **Structure:** Monorepo gồm `backend/` (Java 21, Spring Boot 3, Spring Security, Spring Data JPA, Flyway, MySQL 8.0) và `frontend/` (React, Vite, TypeScript, Tailwind CSS, Shadcn UI).
- **Documentation:** Mọi thiết kế chi tiết nằm tại `docs/sdd-phase-*.md`.

---

## 2. Mandatory Execution Workflow (Bắt buộc tuân thủ)
Khi nhận yêu cầu triển khai một tính năng hoặc một Phase mới, agent PHẢI thực hiện tuần tự 4 bước sau, **KHÔNG ĐƯỢC NHẢY BƯỚC**:

1. **Read & Verify SDD:** Đọc kỹ file `docs/sdd-phase-X.md` tương ứng. Nếu phát hiện thiếu trường dữ liệu hoặc mâu thuẫn API contract, dừng lại và hỏi user trước khi viết code.
2. **Backend First (Contract-First):**
   - Viết Flyway SQL migration (`backend/src/main/resources/db/migration/V{n}__{desc}.sql`) tuân thủ nghiêm ngặt chuẩn **BCNF**.
   - Implement theo luồng: `Entity` $\rightarrow$ `Repository` $\rightarrow$ `DTO (Java Record)` $\rightarrow$ `Service` $\rightarrow$ `Controller` + `Swagger OpenAPI annotations`.
   - **Self-Check BE:** Chạy lệnh `./mvnw test-compile` (hoặc `./mvnw test` trên Windows dùng `mvnw.cmd`) tại `backend/`. Tự sửa toàn bộ lỗi biên dịch/test trước khi chuyển sang bước 3.
3. **Frontend Sync (Zero-Mock Integration):**
   - Đọc trực tiếp các file Java DTO tại `backend/` để tạo TypeScript interfaces đồng bộ 100% tên biến và kiểu dữ liệu tại `frontend/src/types/`.
   - Tạo API service (Axios/Fetch) gọi đúng endpoint của Spring Boot, sau đó dựng UI bằng Tailwind + Shadcn UI.
   - **Self-Check FE:** Chạy lệnh `npm run build` tại `frontend/` để đảm bảo không có lỗi TypeScript hoặc import sai.
4. **Final Summary:** Chỉ báo cáo hoàn thành sau khi cả BE và FE đều build xanh, kèm danh sách các file đã tạo/sửa.

---

## 3. Database & Backend Standards (Strict Rules)
- **BCNF Compliance:**
  - Tuyệt đối không lưu dư thừa khóa ngoại bắc cầu (ví dụ: `itinerary_items` chỉ giữ `trip_day_id`, KHÔNG lưu thêm `trip_id`).
  - Mọi bảng trung gian nhiều-nhiều phải dùng composite primary key (`@EmbeddedId`) và khóa ngoại kép khi cần ràng buộc toàn vẹn.
- **JPA & Lombok:**
  - Bắt buộc dùng `FetchType.LAZY` cho tất cả `@ManyToOne` và `@OneToOne`.
  - CẤM dùng `@Data` trên JPA Entity (chỉ dùng `@Getter`, `@Setter`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`) để tránh lỗi `StackOverflowError` hoặc N+1 query.
  - Sử dụng Java `record` cho Request/Response DTO và dùng Bean Validation (`@NotNull`, `@NotBlank`).
- **API Convention:**
  - Prefix chuẩn: `/api/v1/...`
  - Trả về cấu trúc lỗi thống nhất qua `@RestControllerAdvice` (`ProblemDetail` hoặc standard error wrapper).

---

## 4. Frontend Standards
- **Strict TypeScript:** Cấm dùng `any`. Mọi response từ API phải có interface định nghĩa rõ ràng.
- **UI/UX:** Ưu tiên dùng component từ Shadcn UI, thiết kế responsive (mobile-first vì thành viên team sẽ dùng điện thoại xem lịch trình khi đi du lịch).
- **State & Data Fetching:** Tách biệt logic gọi API khỏi UI component (dùng custom hooks hoặc TanStack Query).

---

## 5. Git & Safety Rules
- Không tự ý xóa hoặc sửa các file migration Flyway đã chạy (`V1__...` trở về trước); mọi thay đổi schema phải tạo file version mới (`V2__...`).
- Không hardcode Google OAuth Client Secret, JWT Secret hay DB password vào code; bắt buộc đọc từ biến môi trường / `application.yml` (`${ENV_VAR}`).