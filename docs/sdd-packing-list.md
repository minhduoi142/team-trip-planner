# SDD – Hành lý cá nhân

**Dự án:** Team Trip Planner
**Phụ thuộc:** Phase 3 (checklist chung, tab "Chuẩn bị"), thời tiết W2 (`WeatherAdvice`), outfit từng ngày (`docs/sdd-golden-hour-outfit.md` phần B), email đếm ngược N3
**Trạng thái:** Đã triển khai (29/11/2026). Người dùng đã duyệt cả 3 mặc định ở mục 1.2; xem "Ghi chú khi triển khai" ở cuối

---

## 1. Mục tiêu & Phạm vi

### 1.1 Mục tiêu
Checklist hiện có là **đồ chung của nhóm** (lều, loa, thuốc chung…), giao cho từng người mang. Còn đồ **riêng của mỗi người** (quần áo, skincare, sạc, giấy tờ, băng vệ sinh…) thì chưa có chỗ ghi. Tính năng này thêm **danh sách hành lý cá nhân**:

1. Mỗi thành viên có một danh sách hành lý **riêng tư** cho mỗi chuyến. Chỉ chính người đó xem và sửa được, kể cả trưởng nhóm cũng không thấy.
2. **Thêm nhanh từ danh sách mẫu** soạn sẵn: Thiết yếu, Skincare & makeup, Đồ chụp ảnh, Đi biển, Trời lạnh, Sức khỏe cá nhân. Món đã có thì bỏ qua, không thêm trùng.
3. **Gợi ý tự động** (chỉ tính trên FE, không lưu):
   - **Theo thời tiết:** dự báo có mưa, lạnh hoặc UV cao thì gợi ý áo mưa, áo ấm, kem chống nắng (dùng lại `WeatherAdvice`).
   - **Theo outfit:** ngày nào mình đã đăng outfit thì gợi ý thêm món "Outfit Ngày 2: váy maxi trắng + mũ cói".
4. Tích "Đã xếp" từng món, có thanh tiến độ "Đã xếp 12/20".
5. **Email đếm ngược** thêm khối "Hành lý của bạn: còn N món chưa xếp", kèm tối đa 8 món.

### 1.2 Quyết định cần bạn duyệt
| # | Mặc định mình đề xuất |
|---|---|
| 1 | Tab "Chuẩn bị" có nút chuyển **Đồ chung / Hành lý của tôi**. **Mặc định mở "Hành lý của tôi"**, vì ai cũng dùng còn đồ chung ít người sửa. Lựa chọn được nhớ theo trình duyệt (localStorage). |
| 2 | Email đếm ngược **có** thêm khối hành lý (mục 1.1 ý 5). Ai không có món nào chưa xếp thì không hiện khối này. |
| 3 | Nội dung các danh sách mẫu ở mục 3.4 (bạn sửa thoải mái). |

### 1.3 Ngoài phạm vi
- Dùng lại danh sách giữa các chuyến (tủ đồ cá nhân), chia sẻ danh sách cho người khác.
- Kéo thả đổi thứ tự (món xếp theo nhóm, rồi theo lúc thêm).
- Tự gợi ý từ ảnh hoặc màu của outfit (chỉ dùng ghi chú outfit, xem 4.3).

---

## 2. Cơ sở dữ liệu – `V13__packing_items.sql`

```sql
CREATE TABLE packing_items (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    trip_id     BIGINT       NOT NULL,
    user_id     BIGINT       NOT NULL,
    category    VARCHAR(20)  NOT NULL,
    item_name   VARCHAR(150) NOT NULL,
    quantity    SMALLINT     NOT NULL DEFAULT 1,
    is_packed   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  DATETIME(6)  NOT NULL,
    CONSTRAINT pk_packing_items PRIMARY KEY (id),
    -- Rời nhóm / bị loại → hành lý của người đó tự xóa (như member_availabilities)
    CONSTRAINT fk_packing_member FOREIGN KEY (trip_id, user_id)
        REFERENCES trip_members (trip_id, user_id) ON DELETE CASCADE,
    CONSTRAINT chk_packing_category CHECK (category IN
        ('CLOTHES', 'BEAUTY', 'DOCUMENTS', 'ELECTRONICS', 'HEALTH', 'OTHER')),
    CONSTRAINT chk_packing_quantity CHECK (quantity BETWEEN 1 AND 99),
    INDEX idx_packing_owner (trip_id, user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
```
- **BCNF:** khóa chính là `id`. `(trip_id, user_id)` là chủ sở hữu, không phải khóa. **Không** ràng buộc UNIQUE theo tên món: người dùng có thể cố ý ghi hai dòng giống nhau. Việc chống trùng khi thêm từ mẫu làm ở service.
- `TripService.delete` xóa thành viên trước khi xóa trip, nên hành lý đi theo nhờ CASCADE. `TripMemberService.removeMembership` cũng **không cần sửa**.
- `IntegrationTest.cleanDatabase`: thêm `DELETE FROM packing_items` trước `trip_members`.

---

## 3. Backend – package `com.tripplanner.packing`

### 3.1 Endpoint (prefix `/api/v1`)
Mọi endpoint cần là **thành viên** (VIEWER+) và **chỉ chạm tới món của chính mình**. Món của người khác thì trả **404** `PACKING_ITEM_NOT_FOUND`, không trả 403, để không lộ món đó có tồn tại.

| Method | Endpoint | Ghi chú |
|---|---|---|
| GET | `/trips/{tripId}/packing` | danh sách của mình |
| POST | `/trips/{tripId}/packing` | thêm 1 món, 201 |
| POST | `/trips/{tripId}/packing/templates/{key}` | thêm cả danh sách mẫu, bỏ món trùng tên |
| PUT | `/packing-items/{id}` | sửa tên, nhóm, số lượng |
| PATCH | `/packing-items/{id}/packed` | `{packed: true/false}` |
| DELETE | `/packing-items/{id}` | |
| GET | `/packing-templates` | danh sách mẫu (tĩnh, để FE hiện tên và số món) |

Mọi thao tác ghi trả về **toàn bộ** `PackingListResponse`.

### 3.2 DTO (`PackingDtos`)
```text
PackingItemRequest(itemName* ≤150, category*, quantity 1..99 (mặc định 1))
PackedRequest(packed*)
PackingItemResponse(id, itemName, category, quantity, packed, createdAt)
PackingListResponse(items, total, packedCount, addedCount)
    -- items theo thứ tự nhóm (enum) rồi createdAt, id
    -- addedCount: số món vừa thêm (chỉ có nghĩa với lệnh thêm từ mẫu; các lệnh khác = 0)
PackingTemplateResponse(key, label, items: [TemplateItem(itemName, category, quantity)])
```

### 3.3 Quy tắc
- Tối đa **200 món/người/chuyến**. Vượt thì trả 400 `PACKING_LIMIT_REACHED` "Danh sách đã đủ 200 món".
- **Chống trùng khi thêm từ mẫu:** so tên sau khi `trim`, gộp khoảng trắng, chuyển chữ thường và **bỏ dấu**. Như vậy "Kem chống nắng" trùng "kem chong nang". Hàm thuần `PackingNames.key(...)` có unit test.
- Thêm từng món thủ công **không** chặn trùng.
- Khóa mẫu không tồn tại thì trả 404 `NOT_FOUND`.

### 3.4 Danh sách mẫu – `PackingTemplates` (pure, hằng số trong code)
| key | Nhãn | Các món |
|---|---|---|
| `ESSENTIALS` | Thiết yếu | CCCD/hộ chiếu, Ví + thẻ ngân hàng, Tiền mặt, Điện thoại + sạc, Sạc dự phòng, Tai nghe, Chìa khóa nhà |
| `BEAUTY` | Skincare & makeup | Sữa rửa mặt, Tẩy trang, Toner, Kem dưỡng, Kem chống nắng, Son, Phấn/cushion, Mascara, Dầu gội + sữa tắm mini, Lược, Kẹp/dây buộc tóc |
| `PHOTO` | Đồ chụp ảnh | Váy/đồ chụp ảnh, Mũ, Kính râm, Phụ kiện (khuyên tai, vòng), Gậy selfie/tripod, Thẻ nhớ |
| `BEACH` | Đi biển | Đồ bơi, Khăn tắm, Dép lê, Túi chống nước, Kem chống nắng, Áo khoác mỏng |
| `COLD` | Trời lạnh | Áo khoác ấm, Khăn quàng, Tất, Găng tay, Son dưỡng, Kem dưỡng ẩm |
| `HEALTH` | Sức khỏe cá nhân | Thuốc cá nhân, Thuốc say xe, Thuốc đau bụng, Băng cá nhân, Băng vệ sinh, Khẩu trang |

Nhóm (`PackingCategory`):

| Mã | Tên hiển thị |
|---|---|
| `CLOTHES` | Quần áo |
| `BEAUTY` | Mỹ phẩm & vệ sinh |
| `DOCUMENTS` | Giấy tờ & tiền |
| `ELECTRONICS` | Đồ điện tử |
| `HEALTH` | Sức khỏe |
| `OTHER` | Khác |

### 3.5 Email đếm ngược
- `CountdownContentBuilder` thêm `myPacking` (tối đa 8 món chưa xếp, kèm số lượng) và `myPackingMore`. Dữ liệu đọc bằng JDBC như `myChecklist`.
- Template `countdown.html` và `countdown.txt` thêm khối "Hành lý của bạn còn N món chưa xếp", link tới `?tab=checklist&view=mine`.
- Khối đặt sau "Bạn nhận mang". Rỗng thì ẩn.

### 3.6 Mã lỗi mới (thêm cả vào `frontend/src/types/api.ts`)
| Code | HTTP | Thông báo |
|---|---|---|
| `PACKING_ITEM_NOT_FOUND` | 404 | Không tìm thấy món này |
| `PACKING_LIMIT_REACHED` | 400 | Danh sách đã đủ 200 món |

---

## 4. Frontend

### 4.1 File
- `types/packing.ts`, `api/packing.ts`
- `hooks/usePacking.ts`:
  - key `tripKeys.packing(tripId)` nằm dưới `detail`, poll 15 giây mặc định (người dùng có thể mở trên hai máy)
  - tích "Đã xếp" cập nhật lạc quan và có `cancelQueries`
  - `usePackingTemplates` không poll
- `components/packing/PackingPanel.tsx`, `PackingSuggestions.tsx`, `PackingItemRow.tsx`
- `components/checklist/ChecklistTab.tsx` → đổi vỏ thành `PrepareTab` có nút chuyển **Hành lý của tôi / Đồ chung** (`ChoiceChips`). Lựa chọn nhớ ở localStorage (bọc try/catch) và đọc được từ `?view=mine|shared` (link trong email).

### 4.2 `PackingPanel`
- **Đầu panel:** "Đã xếp 12/20" kèm thanh tiến độ và dòng nhỏ "Chỉ mình bạn thấy danh sách này".
- **Thêm nhanh:** ô nhập tên, chọn nhóm bằng chip (mặc định nhóm vừa dùng), Enter là thêm.
- **"Thêm từ mẫu":** hàng chip cuộn ngang ("Thiết yếu · 7", "Skincare & makeup · 11"…). Bấm một chip thì thêm cả mẫu, rồi hiện toast "Đã thêm 9 món, bỏ qua 2 món đã có".
- **Danh sách theo nhóm:** món chưa xếp ở trên, món đã xếp gạch ngang ở dưới. Mỗi dòng có checkbox (vùng chạm ≥44px), tên, "× 2", menu ⋮ (Sửa / Xóa).
- **Trống:** `EmptyState` "Chưa có món nào", có các nút mẫu ngay bên trong.

### 4.3 `PackingSuggestions` (khối gợi ý, ẩn khi không còn gì để gợi ý)
- **Thời tiết:** gom `advice[].checklistItem` của mọi ngày có dự báo, bỏ món đã có (so tên theo cùng quy tắc bỏ dấu như backend, `lib/packingNames.ts`). Mỗi gợi ý là một chip "+ Áo mưa (dự báo mưa Ngày 2)". Nhóm được đổi theo bảng: `MEDICAL` → `HEALTH`, `OTHER` → `CLOTHES` (áo mưa, áo ấm).
- **Outfit:** với mỗi ngày mình đã đăng outfit, gợi ý "Outfit Ngày N: {ghi chú}". Không có ghi chú thì dùng tên các màu, ví dụ "Outfit Ngày 1: Trắng, Be". Nhóm `CLOTHES`. Món đã có (cùng tên) thì không gợi ý lại.
- Bấm gợi ý nào thì `POST` món đó. Có nút "Thêm tất cả".

---

## 5. Kiểm thử
| Loại | Nội dung |
|---|---|
| Unit `PackingNamesTest` | Bỏ dấu, chữ hoa/thường, khoảng trắng thừa; "Đ" → "d" |
| Unit `PackingTemplatesTest` | Mọi key có nhãn, món không rỗng, tên ≤150, không trùng tên trong cùng mẫu |
| Integration `PackingIntegrationTest` | Thêm/sửa/tích/xóa món của mình; danh sách của A không chứa món của B; B sửa/tích/xóa món của A → 404 |
| Integration | Thêm mẫu 2 lần: lần 2 `addedCount = 0`; mẫu chồng một phần (BEAUTY rồi BEACH: trùng "Kem chống nắng") chỉ thêm món mới; key sai → 404 |
| Integration | Món thứ 201 → 400 `PACKING_LIMIT_REACHED`; thêm mẫu vượt giới hạn → 400, không thêm món nào |
| Integration | Người ngoài chuyến → 403; bị loại khỏi nhóm → món mất; xóa chuyến → 204 |
| Integration (email) | `CountdownJobIntegrationTest`: payload có `myPacking` chỉ với món chưa xếp của đúng người nhận |

---

## Ghi chú khi triển khai (29/11/2026)
**Backend** (test 281, 1 skip, có cả test tích hợp trên MySQL):
- Package `packing`:
  - `PackingItem` map `trip_id`/`user_id` thành cột thuần, không có quan hệ JPA.
  - `PackingNames.key` và `lib/packing.ts` `packingKey` phải giữ giống nhau.
  - `PackingTemplates` là hằng số.
- Email: `myPacking` tối đa 8 món (`MAX_PACKING`). Link `checklistUrl` thêm `&view=shared`, link `packingUrl` là `&view=mine`. Payload cũ không có `myPacking` thì khối hành lý ẩn.

**Frontend:**
- `PrepareTab` thay `ChecklistTab` ở trang chuyến đi, có Tabs "Hành lý của tôi / Đồ chung".
  - Thứ tự ưu tiên: `?view=` → localStorage `tp.prepareView` → `mine`.
  - Mở bằng `?view=` **không** ghi vào localStorage, để link trong email không đổi lựa chọn quen dùng.
- **Khác SDD mục 4.3:** `MEDICAL` đổi sang nhóm `BEAUTY` chứ không phải `HEALTH`, vì món duy nhất có nhóm này là "Kem chống nắng", và mẫu cũng xếp nó vào mỹ phẩm.
- Chip mẫu hiện số món **còn thiếu**, ví dụ "Đi biển · 5". Đủ rồi thì chip bị khóa.
- Xóa một món không hỏi xác nhận: đây là đồ cá nhân, thêm lại rất nhanh.
- **Lỗi tìm ra khi chụp màn hình:** bấm tích 2 món liên tiếp nhanh thì server lưu đúng 2 món, nhưng UI chỉ hiện 1, vì phản hồi về không theo thứ tự.
  - Đã sửa bằng `lib/overlapSafe.ts` (`applyLatest` / `revertLatest`): khi các lần bấm chồng nhau, chỉ lần cuối được ghi vào cache, và lần cuối sẽ tải lại từ server.
  - Áp dụng cho `useSetPacked` **và** `useCheckItem` của checklist chung, vì checklist chung dính đúng lỗi này từ trước.
- Đã chụp màn hình ở 360px và 1280px: không tràn ngang; `?view=shared` mở đúng "Đồ chung"; gợi ý "Áo mưa · mưa Ngày 1" lấy từ dự báo thật, và "Outfit Ngày 1: …" lấy từ outfit đã seed.

**Chưa kiểm chứng:** email đếm ngược có khối hành lý mới có test render, chưa mở trong hộp thư thật.

