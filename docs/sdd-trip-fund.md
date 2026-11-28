# SDD – Quỹ chung

**Dự án:** Team Trip Planner
**Phụ thuộc:** Phase 4 (chi tiêu, `BalanceCalculator`, thanh toán PENDING/CONFIRMED, VietQR, tài khoản ngân hàng của thành viên)
**Trạng thái:** Đã triển khai (29/11/2026). Người dùng đã duyệt cả 4 mặc định ở mục 1.3; xem "Ghi chú khi triển khai" ở cuối

---

## 1. Mục tiêu & Phạm vi

### 1.1 Mục tiêu
Nhóm Việt hay đi chơi theo kiểu **thu trước mỗi người một khoản** (ví dụ 2 triệu) đưa cho **một người giữ quỹ**, rồi người đó trả các khoản chung. Cuối chuyến tiền còn thừa thì trả lại, thiếu thì góp thêm. Hiện app chỉ có kiểu "ai trả nấy rồi chia lại", nên chưa làm được cách này.

1. OWNER bật quỹ chung cho chuyến: chọn **thủ quỹ** và **mức nộp mỗi người**.
2. Mỗi thành viên bấm **"Nộp quỹ"**: hiện mã VietQR tới tài khoản của thủ quỹ, đúng số còn thiếu. Chuyển xong bấm "Tôi đã chuyển", rồi thủ quỹ xác nhận. Luồng này giống trả nợ hiện có.
3. Thủ quỹ (hoặc OWNER) ghi khoản chi **"Chi từ quỹ chung"**. Khoản đó chia cho mọi người như khoản chi bình thường.
4. Thẻ quỹ trong tab Chi tiêu hiện:
   - quỹ còn bao nhiêu, đã thu, đã chi
   - từng người đã nộp bao nhiêu trên mức nộp (đang chờ xác nhận ghi riêng)
   - cảnh báo khi quỹ sắp hết
5. **Cuối chuyến không cần thao tác riêng.** Phần "Gợi ý chuyển tiền" hiện có tự tính ai được hoàn lại tiền thừa, ai phải góp thêm (xem 1.2).

### 1.2 Vì sao số dư tự đúng: dựng trên những thứ đã có
- **Nộp quỹ** là một `settlement` từ thành viên tới thủ quỹ, có `kind = FUND`. `BalanceCalculator` đã tính `+ đã chuyển − đã nhận`, nên người nộp được ghi có, thủ quỹ được ghi nợ.
- **Chi từ quỹ** là một `expense` có `paid_by = thủ quỹ`, `from_fund = TRUE`. Thủ quỹ được ghi "đã trả", mọi người chịu phần của mình.
- Cộng lại, gợi ý chuyển tiền tự ra "thủ quỹ chuyển lại phần thừa" hoặc "A góp thêm cho thủ quỹ". **Không** cần sửa `BalanceCalculator`.
- **Phần của thủ quỹ:** thủ quỹ không tự chuyển tiền cho chính mình được, nên phần của họ **coi như đã nộp đủ mức nộp** (tiền nằm sẵn trong túi họ). Về số dư thì không ảnh hưởng gì: thủ quỹ trả các khoản chi từ quỹ, phần chưa ai nộp chính là tiền thủ quỹ tự bỏ ra.
- **Số dư quỹ** = tổng nộp quỹ đã xác nhận + mức nộp (phần của thủ quỹ) − tổng chi từ quỹ. Chỉ để hiển thị, không lưu.

### 1.3 Quyết định cần bạn duyệt
| # | Mặc định mình đề xuất |
|---|---|
| 1 | Chỉ **OWNER** bật, sửa hoặc tắt quỹ. Thủ quỹ mặc định là OWNER, đổi được sang thành viên khác. |
| 2 | **Không đổi được thủ quỹ khi quỹ đã có giao dịch** (đã có người nộp hoặc đã chi từ quỹ), trả 409 `FUND_IN_USE`. Đổi thủ quỹ giữa chừng thì phải tính bàn giao tiền giữa hai người, phức tạp mà ít khi cần. Tương tự, chỉ **tắt được quỹ** khi chưa có giao dịch. |
| 3 | Mức nộp **sửa được bất cứ lúc nào**. Ví dụ "thu thêm đợt 2" thì nâng từ 2 triệu lên 3 triệu, mọi người thấy mình còn thiếu 1 triệu. Mức nộp là số tiền **tổng cộng mỗi người**, giống cho tất cả. |
| 4 | Ghi "Chi từ quỹ" được: **thủ quỹ và OWNER**. Người trả luôn bị đặt là thủ quỹ. |

### 1.4 Ngoài phạm vi
- Mức nộp khác nhau cho từng người (ví dụ trẻ em đóng nửa).
- Nhiều quỹ trong một chuyến.
- Bàn giao quỹ giữa hai thủ quỹ.
- Lịch sử từng đợt thu.

---

## 2. Cơ sở dữ liệu – `V14__trip_fund.sql`

```sql
-- 1 chuyến có tối đa 1 quỹ. Thủ quỹ phải là thành viên (FK tổ hợp, không cascade:
-- loại thủ quỹ khỏi nhóm bị chặn ở service).
CREATE TABLE trip_funds (
    trip_id            BIGINT       NOT NULL,
    treasurer_id       BIGINT       NOT NULL,
    per_person_target  BIGINT       NOT NULL,
    note               VARCHAR(300) NULL,
    created_at         DATETIME(6)  NOT NULL,
    updated_at         DATETIME(6)  NOT NULL,
    CONSTRAINT pk_trip_funds PRIMARY KEY (trip_id),
    CONSTRAINT fk_funds_treasurer FOREIGN KEY (trip_id, treasurer_id) REFERENCES trip_members (trip_id, user_id),
    CONSTRAINT chk_funds_target CHECK (per_person_target BETWEEN 1000 AND 100000000)
);

ALTER TABLE settlements
    ADD COLUMN kind VARCHAR(10) NOT NULL DEFAULT 'DEBT' AFTER amount,
    ADD CONSTRAINT chk_settlements_kind CHECK (kind IN ('DEBT', 'FUND'));

ALTER TABLE expenses
    ADD COLUMN from_fund BOOLEAN NOT NULL DEFAULT FALSE AFTER paid_by;
```
- **BCNF:**
  - Khóa của `trip_funds` là `trip_id`.
  - `kind` và `from_fund` là thuộc tính của chính giao dịch đó.
  - Số dư quỹ và số đã nộp của từng người **không lưu**, tính khi đọc.
- **Không có FK** `trip_id → trips` riêng: FK tổ hợp tới `trip_members` đã đảm bảo trip tồn tại.
- **`TripService.delete`:** xóa `trip_funds` **trước** `trip_members` (FK không cascade).
- **`TripMemberService.removeMembership`:** nếu người bị loại là thủ quỹ thì trả 409 `MEMBER_IS_TREASURER` "Đổi thủ quỹ hoặc tắt quỹ trước". Thường thì thủ quỹ đã có giao dịch nên đã bị chặn sẵn bởi `MEMBER_HAS_EXPENSES`.
- **`IntegrationTest.cleanDatabase`:** thêm `DELETE FROM trip_funds` trước `trip_members`.

---

## 3. Backend

### 3.1 Endpoint (prefix `/api/v1`)
| Method | Endpoint | Quyền | Ghi chú |
|---|---|---|---|
| PUT | `/trips/{tripId}/fund` | OWNER | bật hoặc sửa quỹ: `{treasurerId, perPersonTarget, note}` |
| DELETE | `/trips/{tripId}/fund` | OWNER | tắt quỹ; đã có giao dịch quỹ thì trả 409 `FUND_IN_USE` |
| POST | `/trips/{tripId}/settlements` | như cũ | thêm trường `kind` (mặc định `DEBT`) |
| POST/PUT | `/trips/{tripId}/expenses`, `/expenses/{id}` | như cũ | thêm trường `fromFund` (mặc định `false`) |

Mọi endpoint trả về **toàn bộ** `ExpenseSummaryResponse` như hiện nay, có thêm trường `fund`. Tab Chi tiêu vẫn chỉ cần một query.

### 3.2 Quy tắc
**Nộp quỹ** (`kind = FUND`):
- Quỹ phải đang bật. Không bật thì trả 400 `FUND_NOT_ENABLED`.
- Người nhận phải là thủ quỹ hiện tại, người chuyển phải khác thủ quỹ. Sai thì trả 400 `INVALID_TRANSFER_TARGET`.
- **Không** chặn nộp quá mức nộp. Phần dư được hoàn lại ở gợi ý chuyển tiền.
- Ai được tạo hay xác nhận thì giữ như thanh toán hiện có: người chuyển báo đã chuyển, người nhận (thủ quỹ) xác nhận, và xóa khi còn PENDING.

**Chi từ quỹ** (`fromFund = true`):
- Quỹ phải đang bật.
- Người gọi phải là thủ quỹ hoặc OWNER, không thì trả 403.
- `paidBy` bị **ghi đè** thành thủ quỹ (FE vẫn gửi `paidBy`; khác thủ quỹ thì backend tự đổi).
- Sửa khoản chi: `fromFund` đổi được theo cùng điều kiện.
- Tắt quỹ khi đã có khoản chi từ quỹ thì bị chặn (xem 1.3 mục 2).

**Gợi ý chuyển tiền:**
- `pendingByPair` chỉ tính settlement có `kind = DEBT`. Khoản nộp quỹ đang chờ xác nhận không làm gợi ý trả nợ hiện "đang chờ".
- `BalanceCalculator` **không đổi**: tính mọi settlement đã CONFIRMED, cả DEBT lẫn FUND.

**Thông báo email:** nộp quỹ đi qua sự kiện settlement hiện có (thủ quỹ nhận mail "X đã chuyển…"). Nội dung email thêm chữ "nộp quỹ" khi `kind = FUND`.

### 3.3 DTO
```text
FundRequest(treasurerId*, perPersonTarget* 1.000..100.000.000, note ≤300)
SettlementRequest(... + kind: DEBT|FUND, mặc định DEBT)
ExpenseRequest(... + fromFund: boolean, mặc định false)
SettlementResponse(... + kind)
ExpenseResponse(... + fromFund)
FundMemberResponse(userId, contributed, pending, remaining, treasurer)
    -- contributed: tổng FUND CONFIRMED (thủ quỹ: = target); pending: tổng FUND PENDING;
    -- remaining = max(0, target − contributed − pending)
FundResponse(treasurerId, perPersonTarget, note, totalContributed, totalPending, totalSpent, balance,
             members, inUse, canManage, canSpend)
    -- totalContributed đã gồm phần của thủ quỹ; balance = totalContributed − totalSpent (âm: thủ quỹ đang ứng tiền)
    -- inUse: đã có giao dịch quỹ (để FE khóa "đổi thủ quỹ / tắt quỹ")
ExpenseSummaryResponse(... + fund: FundResponse | null)
```

### 3.4 Mã lỗi mới (thêm cả vào `frontend/src/types/api.ts`)
| Code | HTTP | Thông báo |
|---|---|---|
| `FUND_NOT_ENABLED` | 400 | Chuyến này chưa bật quỹ chung |
| `FUND_IN_USE` | 409 | Quỹ đã có người nộp hoặc đã chi, không đổi thủ quỹ hay tắt quỹ được nữa |
| `MEMBER_IS_TREASURER` | 409 | Người này đang giữ quỹ chung. Đổi thủ quỹ hoặc tắt quỹ trước |
| `INVALID_TRANSFER_TARGET` | 400 | Tiền nộp quỹ phải chuyển cho thủ quỹ |

---

## 4. Frontend

### 4.1 Thẻ "Quỹ chung" (đầu tab Chi tiêu)
- **Chưa bật quỹ:**
  - OWNER thấy một dòng gợi ý "Thu trước quỹ chung? Mỗi người nộp một khoản cho một người giữ, chi tiêu chung trừ dần." và nút **"Bật quỹ chung"**.
  - Người khác không thấy gì.
- **Đã bật quỹ:**
  - **Dòng đầu:** "Quỹ còn **2.350.000 ₫**" (âm thì "Thủ quỹ đang ứng 150.000 ₫"), kèm dòng nhỏ "Đã thu 6.000.000 · Đã chi 3.650.000 · Thủ quỹ: Mai".
  - **Thanh tiến độ thu:** đã thu / (mức nộp × số người).
  - **Phần của tôi:**
    - Còn thiếu thì có nút **"Nộp quỹ 500.000 ₫"**. Nút mở `TransferQrDialog` hiện có, người nhận là thủ quỹ, số tiền là phần còn thiếu (sửa được). Bấm "Tôi đã chuyển" thì tạo settlement `kind = FUND`.
    - Thủ quỹ chưa có tài khoản ngân hàng thì hiện câu "Thủ quỹ chưa thêm tài khoản nhận tiền".
  - **Danh sách thành viên** (thu gọn, bấm "Xem ai đã nộp" để mở):
    - Mỗi dòng: avatar, "1.500.000 / 2.000.000", chip "Đủ" hoặc "Chờ xác nhận 500.000".
    - Thủ quỹ thấy nút "Xác nhận" trên các khoản đang chờ, dùng lại endpoint confirm.
  - **Quỹ sắp hết** (số dư < 10% tổng đã thu, hoặc âm): hiện dòng cảnh báo. OWNER có thêm nút "Thu thêm", mở form sửa mức nộp.
  - **OWNER** có menu ⋮: Sửa quỹ (mức nộp, ghi chú, đổi thủ quỹ khi chưa `inUse`), Tắt quỹ (khi chưa `inUse`).

### 4.2 Form khoản chi
- Thủ quỹ và OWNER thấy công tắc **"Chi từ quỹ chung"** khi quỹ đang bật.
  - Bật lên thì ô "Người trả" khóa thành thủ quỹ, kèm dòng "Quỹ còn 2.350.000 ₫".
  - Số tiền lớn hơn số dư quỹ thì cảnh báo nhẹ, không chặn: thủ quỹ ứng trước.
- Trong danh sách chi tiêu, khoản chi từ quỹ có chip "Từ quỹ".

### 4.3 Lịch sử thanh toán
Khoản nộp quỹ hiện chip "Nộp quỹ" để phân biệt với trả nợ.

---

## 5. Kiểm thử
| Loại | Nội dung |
|---|---|
| Integration `FundIntegrationTest` | OWNER bật quỹ; EDITOR bật/sửa → 403; thủ quỹ phải là thành viên |
| Integration | A nộp 2tr (PENDING): `pending` = 2tr, `balance` chưa đổi; thủ quỹ xác nhận → `contributed` = 2tr; nộp cho người không phải thủ quỹ → 400; quỹ chưa bật → 400 `FUND_NOT_ENABLED` |
| Integration | Thủ quỹ chi 3tr từ quỹ (gửi `paidBy` là người khác → bị đổi thành thủ quỹ); EDITOR không phải thủ quỹ ghi `fromFund` → 403 |
| Integration | **Kịch bản trọn vẹn:** 3 người (T là thủ quỹ), mức nộp 2tr; A và B nộp 2tr và được xác nhận → quỹ 6tr. T chi 4,5tr từ quỹ, chia đều 1,5tr/người → quỹ còn 1,5tr; gợi ý chuyển tiền: T trả A 500k và T trả B 500k, không có gợi ý nào khác |
| Integration | Đổi thủ quỹ / tắt quỹ khi `inUse` → 409; trước khi có giao dịch thì được; loại thủ quỹ khỏi nhóm → 409 `MEMBER_IS_TREASURER`; xóa chuyến có quỹ → 204 |
| Integration | Nộp quỹ PENDING không làm gợi ý trả nợ cùng chiều có `pendingAmount` |

---

## Ghi chú khi triển khai (29/11/2026)
**Backend** (test 288, 1 skip, có cả test tích hợp trên MySQL):
- `TripFund`, `TripFundRepository` và `FundService` nằm trong package `expense`, để dùng chung `ExpenseSummaryBuilder` (package-private).
- `ExpenseSummaryBuilder.fund(...)` tính tình trạng quỹ; `pendingByPair` chỉ còn tính `kind = DEBT`.
- `ExpenseRequest.withPaidBy` dùng để ghi đè người trả khi chi từ quỹ. Người gọi phải là thủ quỹ hoặc OWNER; khoản chi thường vẫn giữ quy tắc "ghi hộ cần OWNER".
- "Đã dùng quỹ" (`inUse`) tính cả khoản nộp quỹ **đang chờ**. Có test kịch bản trọn vẹn khớp đúng mục 5: thủ quỹ trả mỗi người 500k.
- Thủ quỹ ghi nhận tiền mặt (người nhận tự tạo) thì xác nhận luôn, như thanh toán thường.
- Email: `SettlementChanged` thêm trường `fund`; `DigestItemFormatter` đổi câu thành "báo đã nộp quỹ chung cho bạn" / "… tiền nộp quỹ của bạn". Có `DigestItemFormatterTest`.

**Frontend:**
- `FundCard` / `FundPrompt` / `FundDialog` nằm trong `components/expenses`. Thẻ quỹ hiện ngay cả khi chưa có khoản chi nào.
- Nộp quỹ dùng lại `TransferQrDialog` (`fund: true`): tiêu đề "Nộp quỹ cho …", nội dung chuyển khoản bắt đầu bằng "QUY ".
- `ExpenseFormDialog` có công tắc "Chi từ quỹ chung": khóa ô người trả thành thủ quỹ, hiện số dư, và cảnh báo khi số tiền vượt số dư ("thủ quỹ sẽ ứng trước").
- Danh sách "Thanh toán" ghi "đã nộp quỹ"; lịch sử có chip "Nộp quỹ"; khoản chi có chip "Từ quỹ".
- `MoneyInput` được export từ `ExpenseFormDialog` để form quỹ dùng lại.
- Đã chụp màn hình ở 360px và 1280px với 3 vai trò: Linh (đã báo nộp, đang chờ), Thảo (chưa nộp, có nút "Nộp quỹ" và mã QR), Mai (OWNER kiêm thủ quỹ: xác nhận, chi từ quỹ, sửa quỹ). Không tràn ngang.
- **Lỗi tìm ra khi chụp màn hình, đã sửa:** ở 360px, tên trong danh sách "Xem ai đã nộp" bị cắt khi có chip "Chờ …". Giờ mỗi dòng chỉ hiện một trạng thái.

**Chưa kiểm chứng:** quét mã QR nộp quỹ bằng app ngân hàng thật; email "nộp quỹ" trong hộp thư thật.

