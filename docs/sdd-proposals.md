# SDD – Wishlist đề xuất địa điểm (Trip Proposals)

**Dự án:** Team Trip Planner
**Phụ thuộc:** Phase 1 (thành viên, quyền), Phase 3 (`trip_days`, `itinerary_items`, `ItineraryOrdering`), Phase 4 (tab Bình chọn)
**Trạng thái:** Đã triển khai

---

## 1. Mục tiêu & Phạm vi

### 1.1 Mục tiêu
Trước khi đưa hoạt động vào lịch trình chính thức, cả nhóm có **một kho ý tưởng chung**: đề xuất quán ăn, homestay, điểm check-in (link Google Maps, link TikTok/Facebook, chi phí dự kiến, ghi chú) và **thả tim** cho nhau.

1. Mọi thành viên (`OWNER`, `EDITOR`, `VIEWER`) đều **thêm đề xuất** và **thả tim / bỏ tim** được.
2. Danh sách tự xếp theo **số tim giảm dần**. Đề xuất đã lên lịch xuống nhóm riêng "Đã lên lịch".
3. **Người tạo hoặc OWNER** sửa và xóa được đề xuất.
4. **EDITOR+** bấm **"Đưa vào lịch trình"**: chọn ngày, giờ và loại hoạt động, rồi tạo một `itinerary_items` và đánh dấu đề xuất đã lên lịch.

### 1.2 Quyết định đã chốt với người dùng
| # | Quyết định |
|---|---|
| 0 | Tab "Bình chọn" đổi thành **"Ý tưởng"**, bên trong có nút chuyển **Wishlist / Bình chọn**, mặc định mở Wishlist |
| 4 | Đưa vào lịch trình chỉ chép `maps_url` và `note`. **Link TikTok giữ ở thẻ đề xuất** |
| 5 | **Không chặn trùng tên** đề xuất (2 chi nhánh cùng tên vẫn hợp lệ) |
| 6 | Có endpoint **sửa đề xuất** `PUT /proposals/{id}` (người tạo / OWNER) |

### 1.3 Ngoài phạm vi
- Bình luận dưới đề xuất, upload ảnh cho đề xuất.
- Đồng bộ 2 chiều: sửa đề xuất **không** sửa hoạt động đã tạo, và ngược lại.
- Kéo đề xuất thả thẳng vào ngày ở tab Lịch trình.

---

## 2. Cơ sở dữ liệu – `V7__trip_proposals.sql`

```sql
CREATE TABLE trip_proposals (
    id                 BIGINT        NOT NULL AUTO_INCREMENT,
    trip_id            BIGINT        NOT NULL,
    title              VARCHAR(150)  NOT NULL,
    category           VARCHAR(20)   NOT NULL,
    maps_url           VARCHAR(2000) NULL,
    reference_url      VARCHAR(2000) NULL,      -- TikTok / Facebook / Instagram…
    estimated_cost     BIGINT        NULL,      -- VND, cùng nghĩa với itinerary_items
    note               VARCHAR(500)  NULL,
    itinerary_item_id  BIGINT        NULL,      -- khác NULL = đã lên lịch
    created_by         BIGINT        NULL,
    created_at         DATETIME(6)   NOT NULL,
    updated_at         DATETIME(6)   NOT NULL,
    CONSTRAINT pk_trip_proposals PRIMARY KEY (id),
    CONSTRAINT fk_proposals_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_proposals_item FOREIGN KEY (itinerary_item_id) REFERENCES itinerary_items (id) ON DELETE SET NULL,
    CONSTRAINT uq_proposals_item UNIQUE (itinerary_item_id),
    CONSTRAINT fk_proposals_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_proposals_category CHECK (category IN
        ('FOOD', 'SIGHTSEEING', 'TRANSPORT', 'STAY', 'SHOPPING', 'ACTIVITY', 'OTHER')),
    CONSTRAINT chk_proposals_cost CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    INDEX idx_proposals_trip (trip_id)
);

CREATE TABLE proposal_votes (
    proposal_id  BIGINT      NOT NULL,
    user_id      BIGINT      NOT NULL,
    voted_at     DATETIME(6) NOT NULL,
    CONSTRAINT pk_proposal_votes PRIMARY KEY (proposal_id, user_id),
    CONSTRAINT fk_pvotes_proposal FOREIGN KEY (proposal_id) REFERENCES trip_proposals (id) ON DELETE CASCADE,
    CONSTRAINT fk_pvotes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

**BCNF:**
- `trip_proposals` có 2 cột xác định được cột khác: `id` và `itinerary_item_id` (UNIQUE). Cả hai đều là khóa ứng viên.
- **Không lưu** số tim (tính bằng `COUNT`) và **không có** cột `status`: "đã lên lịch" suy ra từ `itinerary_item_id IS NOT NULL`.
- `proposal_votes` không lưu `trip_id`, vì cột đó phụ thuộc bắc cầu qua proposal. Cách này giống `poll_votes`. Quy tắc "người vote phải là thành viên" do service kiểm tra.
- `category` dùng lại tập giá trị của `ItineraryCategory`.

**Hệ quả của `ON DELETE SET NULL`:** khi xóa hoạt động trong lịch trình (kể cả xóa ngày thừa), đề xuất **tự quay về wishlist**, không cần code đồng bộ.

---

## 3. Backend – package `com.tripplanner.proposal`

### 3.1 Endpoint (prefix `/api/v1`)
| Method | Endpoint | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/trips/{tripId}/proposals` | VIEWER+ | |
| POST | `/trips/{tripId}/proposals` | VIEWER+ | 201 |
| PUT | `/proposals/{id}` | người tạo / OWNER | |
| DELETE | `/proposals/{id}` | người tạo / OWNER | hoạt động đã tạo trong lịch trình **vẫn giữ** |
| PUT | `/proposals/{id}/vote` | VIEWER+ | idempotent |
| DELETE | `/proposals/{id}/vote` | VIEWER+ | idempotent |
| POST | `/proposals/{id}/schedule` | EDITOR+ | đưa vào lịch trình |

Mọi endpoint (kể cả ghi) trả về **toàn bộ** `ProposalListResponse`.

### 3.2 DTO (record, gom trong `ProposalDtos`)
```text
ProposalRequest(title*, category*, mapsUrl, referenceUrl, estimatedCost, note)
  title ≤150 · link ≤2000 và bắt đầu http(s):// · cost 0..1 tỷ · note ≤500
ScheduleProposalRequest(dayId*, startTime "HH:mm", endTime "HH:mm", category*)
ScheduledInfo(itemId, dayId, dayIndex, date, startTime)        -- date null nếu ngày thừa / chưa chốt
ProposalResponse(id, title, category, mapsUrl, referenceUrl, estimatedCost, note,
                 createdByName, createdAt, voteCount, voterIds, votedByMe,
                 canEdit, canDelete, scheduled: ScheduledInfo | null)
ProposalListResponse(canSchedule, tripLocked, proposals)
```

**Thứ tự** (server sắp):
1. Chưa lên lịch trước: `voteCount` giảm dần, rồi `createdAt` tăng dần, rồi `id`.
2. Đã lên lịch sau: theo `dayIndex`, rồi `startTime` (null xếp cuối).

### 3.3 Phân quyền
- Mọi request đều qua `TripAccessService.require(tripId, userId, …)`. Với route `/proposals/{id}`, `tripId` tìm bằng projection `findTripIdById`.
- `canEdit` = `canDelete` = (người tạo **và vẫn là thành viên**) hoặc OWNER. Người tạo đã rời nhóm thì không còn gọi API được, nên chỉ OWNER xóa.
- `canSchedule` = role ≥ EDITOR.

### 3.4 Transaction "Đưa vào lịch trình" (`@Transactional`)
1. `require(tripId, user, EDITOR)`.
2. Đọc đề xuất bằng `@Lock(PESSIMISTIC_WRITE)`. Nếu đã có `itinerary_item_id` thì trả 409 `PROPOSAL_ALREADY_SCHEDULED`. Khóa hàng chặn trường hợp 2 người bấm cùng lúc tạo ra 2 hoạt động.
3. Trip chưa chốt ngày → 409 `NOT_LOCKED`. Ngày không thuộc trip → 404 `DAY_NOT_FOUND`. Ngày thừa → 400 `BAD_REQUEST`.
4. Gọi `ItineraryService.createItem(dayId, userId, request)`. Phần thân này được tách ra từ `addItem` để trả về entity, và vẫn giữ `ItineraryOrdering` (tự chèn theo giờ) cùng các kiểm tra giờ.
   - `title` ← title
   - `category` ← request
   - `startTime` / `endTime` ← request
   - `mapsUrl` ← mapsUrl
   - `note` ← note
   - `estimatedCost` ← estimatedCost
   - `locationName` ← null
5. `proposal.itineraryItem = item`. Bước nào lỗi thì rollback toàn bộ.

### 3.5 Mã lỗi mới (thêm cả vào `frontend/src/types/api.ts`)
| Code | HTTP | Thông báo |
|---|---|---|
| `PROPOSAL_NOT_FOUND` | 404 | Không tìm thấy đề xuất |
| `PROPOSAL_ALREADY_SCHEDULED` | 409 | Đề xuất này đã được đưa vào lịch trình |

### 3.6 Chỗ phải sửa thêm
- `TripMemberService.removeMembership`: gọi `proposalVoteRepository.deleteAllForMemberInTrip`. Đề xuất do người đó tạo **vẫn giữ**.
- `TripService.delete`: không cần sửa vì đề xuất CASCADE theo trip. Có test xóa trip khi đã có đề xuất lên lịch.
- `DevDataSeeder`: thêm bước idempotent "đề xuất mẫu cho Đà Lạt", gồm vài tim.
- `IntegrationTest.cleanDatabase`: thêm `DELETE FROM trip_proposals` **trước** `itinerary_items`.

---

## 4. Frontend

### 4.1 File
- `types/proposal.ts`: khớp 1-1 với `ProposalDtos`.
- `api/proposal.ts`
- `hooks/useProposals.ts`: key `tripKeys.proposals(tripId)` nằm dưới `detail`.
- `components/proposals/ProposalsPanel.tsx`, `ProposalCard.tsx`, `ProposalFormDialog.tsx`, `ScheduleProposalDialog.tsx`
- `components/IdeasTab.tsx`: nút chuyển Wishlist / Bình chọn.

### 4.2 UX
- **Tab "Ý tưởng"** thay cho "Bình chọn" (value `polls` giữ nguyên). Bên trong có nút chuyển 2 lựa chọn: **Wishlist** (mặc định) và **Bình chọn** (`PollsTab` cũ).
- **Thêm nhanh:** ô nhập ở đầu danh sách, gõ tên rồi Enter là tạo xong (loại mặc định "Khác"). Nút "Chi tiết" mở dialog có đủ loại, link Maps, link tham khảo, chi phí và ghi chú.
- **Thẻ đề xuất:**
  - Emoji loại, tên, chip link (Maps / TikTok / Facebook / Instagram / "Link", đoán từ tên miền), chi phí `formatVnd`, ghi chú tối đa 2 dòng, "đề xuất bởi …".
  - Bên phải là nút ❤️ kèm số tim (vùng chạm ≥ 44px) và chồng avatar người đã thả tim.
  - Menu ⋮ gồm Sửa, Xóa (theo `canEdit` / `canDelete`), **Đưa vào lịch trình** (theo `canSchedule`, chỉ với đề xuất chưa lên lịch).
- **Thả tim:** cập nhật lạc quan và gọi `cancelQueries` trong `onMutate`. **Không sắp xếp lại ngay**, để thẻ không nhảy khỏi chỗ đang chạm; thứ tự mới áp dụng khi server trả về.
- **Dialog "Đưa vào lịch trình":**
  - Danh sách ngày lấy từ `useItinerary`, bỏ ngày thừa, hiển thị dạng "Ngày 2 · T7 15/03".
  - Có giờ bắt đầu và kết thúc; loại điền sẵn từ đề xuất.
  - Trip chưa chốt ngày: nút bị khóa, kèm gợi ý "Chốt ngày đi ở tab Lịch rảnh trước".
  - Thành công: ghi response vào cache, invalidate `tripKeys.itinerary`, toast "Đã thêm vào Ngày N".
- **Đã lên lịch:** nằm trong mục thu gọn "Đã lên lịch (n)", có badge "Ngày 2 · 19:00".
- **Mobile:** danh sách một cột; dialog `max-h-[92svh] overflow-y-auto`.

---

## 5. Kiểm thử
| Loại | Nội dung |
|---|---|
| Integration | VIEWER thêm và thả tim được (idempotent), thứ tự theo tim |
| Integration | EDITOR không phải người tạo: sửa/xóa → 403; OWNER thì được |
| Integration | Chưa chốt ngày → 409 `NOT_LOCKED`. VIEWER schedule → 403. Schedule → có hoạt động đúng giờ; lần 2 → 409 |
| Integration | Xóa hoạt động → đề xuất về wishlist. Xóa đề xuất đã lên lịch → hoạt động vẫn còn |
| Integration | Loại thành viên → tim của họ mất, đề xuất của họ còn. Xóa trip có đề xuất đã lên lịch → 204 |
