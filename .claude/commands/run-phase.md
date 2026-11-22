---
description: Triển khai một Phase theo SDD và AGENT_RULE (vd: /run-phase 2)
argument-hint: <số phase 1-5>
---

Triển khai **PHASE $ARGUMENTS** của dự án Team Trip Planner.

Nếu `$ARGUMENTS` trống hoặc không phải 1–5: dừng lại và hỏi người dùng muốn chạy phase nào.

Luôn tuân thủ `AGENT_RULE.md` (quy trình 4 bước, không nhảy bước) và `CLAUDE.md`.

## 1. Đọc & kiểm tra SDD

- Đọc `docs/sdd-phase-$ARGUMENTS.md`. **Chưa có file này** thì dừng lại: đề nghị viết SDD trước (dựa trên kế hoạch 5 phase trong `CLAUDE.md` và các SDD đã có), đưa người dùng duyệt rồi mới code.
- Đọc `CLAUDE.md` và các SDD của phase trước để nắm hiện trạng và các ràng buộc kiến trúc.
- Kiểm tra code thực tế trong `backend/` và `frontend/`. Phase trước chưa xong mà phase này phụ thuộc vào thì báo người dùng.
- SDD thiếu trường dữ liệu, hoặc mâu thuẫn với code hay với `AGENT_RULE.md`: **dừng lại và hỏi** trước khi viết code. Chốt xong thì cập nhật SDD.
- Cần thông tin chỉ người dùng có (Google Client ID, thông tin DB…) thì hỏi trước. Giá trị bí mật đặt trong biến môi trường và ghi mẫu vào `.env.example`.

## 2. Backend trước (contract-first)

- Migration mới `V{n}__{desc}.sql`, không sửa migration cũ, chuẩn BCNF.
- Thứ tự: Entity → Repository → DTO (record) → Service → Controller + Swagger annotations.
- Kiểm quyền qua `TripAccessService`. Lỗi trả qua `ErrorCode`/`BusinessException`, nhớ thêm mã lỗi mới vào `frontend/src/types/api.ts`.
- Viết test cho logic quan trọng (vd: thuật toán gợi ý ngày rảnh ở Phase 2, reorder ở Phase 3, tính chia tiền ở Phase 4).
- Self-check: `./mvnw test` trong `backend/` phải xanh. Test tích hợp cần `TEST_DB_URL`, chưa có thì báo rõ là bị bỏ qua.

## 3. Frontend đồng bộ

- Tạo/cập nhật type trong `frontend/src/types/` từ đúng các Java DTO (khớp 1-1 tên trường và kiểu nullable).
- API trong `src/api/`, hook TanStack Query trong `src/hooks/`, UI dùng Shadcn. Mobile-first, giao diện tiếng Việt, không dùng `any`.
- Self-check: `npm run build` và `npm run lint` trong `frontend/` phải xanh.

## 4. Cập nhật tài liệu & báo cáo

- Cập nhật `CLAUDE.md` (Current state, Commands, quyết định kiến trúc mới) và ghi chú contract đã chốt vào SDD.
- Báo cáo bằng tiếng Việt: danh sách file tạo/sửa, kết quả build/test, phần chưa kiểm chứng được, việc người dùng cần tự làm. Không tự commit/push trừ khi được yêu cầu.
