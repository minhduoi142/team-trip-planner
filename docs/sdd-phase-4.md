# SDD – PHASE 4: Bình chọn & Chia tiền (VietQR)

**Dự án:** Team Trip Planner
**Phụ thuộc:** Phase 1 (members, quyền), Phase 3 (lịch trình: bình chọn chốt xong thêm vào ngày), Media upload (ảnh hóa đơn)
**Thời lượng dự kiến:** 1,5 ngày làm tập trung
**Trạng thái:** Đã triển khai (xem mục 9)

---

## 1. Mục tiêu & Phạm vi

### 1.1 Mục tiêu
1. **Bình chọn:** tạo câu hỏi như "Tối ngày 2 ăn gì?". Ai cũng thêm được lựa chọn (tên + link Maps). Mỗi người **tick nhiều lựa chọn**, hiện avatar người đã vote. Chốt xong thì có thể **tự thêm vào lịch trình** của một ngày.
2. **Chi tiêu:** ghi các khoản chi (ai trả, bao nhiêu, cho những ai). Mặc định **chia đều**, có thể **nhập số tiền riêng từng người**, kèm ảnh hóa đơn.
3. **Số dư & thanh toán:** tự tính ai cần trả ai với **số lần chuyển ít nhất**. Mỗi dòng có **mã VietQR tạo ngay trong app**. Bấm "Đã chuyển" thì người nhận xác nhận, số dư cập nhật theo.
4. **Thông tin ngân hàng** của từng người (ngân hàng, số tài khoản, tên) để tạo QR.

### 1.2 Quyết định đã chốt với người dùng
| # | Quyết định |
|---|---|
| 1 | Bình chọn **chọn nhiều**, **mọi thành viên đề xuất được**, công khai ai đã vote. Người tạo hoặc EDITOR+ chốt, có thể thêm kết quả vào lịch trình |
| 2 | Chia tiền **chia đều cho người tham gia + tùy chỉnh số tiền**. Phần lẻ khi chia đều tính cho **người trả** |
| 3 | **Tính gọn số lần chuyển + đánh dấu đã chuyển.** Người nhận xác nhận. Thanh toán được cả giữa chuyến |
| 4 | **VietQR tạo trong app** (chuẩn EMVCo/NAPAS, sinh trên trình duyệt). Số tài khoản không đi qua dịch vụ ngoài |

### 1.3 Ngoài phạm vi
- Nhiều người cùng trả 1 khoản (chỉ 1 người trả, khoản khác thì tách ra).
- Ngoại tệ (chỉ dùng VND).
- Đọc hóa đơn bằng OCR, nhắc nợ qua thông báo.
- Thời hạn bình chọn, bình chọn ẩn danh.
- Tự kiểm tra tài khoản ngân hàng có tồn tại không (không có API, người dùng tự nhập đúng).

---

## 2. Cơ sở dữ liệu – `V5__polls_expenses.sql`

```sql
-- Thông tin ngân hàng: thuộc về user (dùng chung mọi chuyến). Tên ngân hàng suy ra từ BIN → không lưu.
ALTER TABLE users
    ADD COLUMN bank_bin          CHAR(6)     NULL,
    ADD COLUMN bank_account_no   VARCHAR(19) NULL,
    ADD COLUMN bank_account_name VARCHAR(50) NULL,
    ADD CONSTRAINT chk_users_bank CHECK (
        (bank_bin IS NULL AND bank_account_no IS NULL AND bank_account_name IS NULL)
        OR (bank_bin IS NOT NULL AND bank_account_no IS NOT NULL AND bank_account_name IS NOT NULL));

-- Ảnh hóa đơn dùng chung kho MinIO
ALTER TABLE media_files DROP CHECK chk_media_purpose,
    ADD CONSTRAINT chk_media_purpose CHECK (purpose IN ('TRIP_COVER', 'AVATAR', 'DRESS_CODE', 'RECEIPT'));

-- ---------- Bình chọn
CREATE TABLE polls (
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    trip_id            BIGINT       NOT NULL,
    title              VARCHAR(150) NOT NULL,
    created_by         BIGINT       NULL,
    created_at         DATETIME(6)  NOT NULL,
    closed_at          DATETIME(6)  NULL,      -- NULL = đang mở
    winning_option_id  BIGINT       NULL,
    CONSTRAINT pk_polls PRIMARY KEY (id),
    CONSTRAINT fk_polls_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_polls_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE poll_options (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    poll_id     BIGINT        NOT NULL,
    name        VARCHAR(150)  NOT NULL,
    maps_url    VARCHAR(2000) NULL,
    note        VARCHAR(300)  NULL,
    created_by  BIGINT        NULL,
    created_at  DATETIME(6)   NOT NULL,
    CONSTRAINT pk_poll_options PRIMARY KEY (id),
    CONSTRAINT fk_options_poll FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE,
    CONSTRAINT fk_options_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT uq_options_name UNIQUE (poll_id, name)   -- collation _ai_ci: "Bún bò" = "bun bo"
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

ALTER TABLE polls ADD CONSTRAINT fk_polls_winner
    FOREIGN KEY (winning_option_id) REFERENCES poll_options (id) ON DELETE SET NULL;

CREATE TABLE poll_votes (
    option_id  BIGINT      NOT NULL,
    user_id    BIGINT      NOT NULL,
    voted_at   DATETIME(6) NOT NULL,
    CONSTRAINT pk_poll_votes PRIMARY KEY (option_id, user_id),
    CONSTRAINT fk_votes_option FOREIGN KEY (option_id) REFERENCES poll_options (id) ON DELETE CASCADE,
    CONSTRAINT fk_votes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------- Chi tiêu (VND, số nguyên)
CREATE TABLE expenses (
    id           BIGINT        NOT NULL AUTO_INCREMENT,
    trip_id      BIGINT        NOT NULL,
    title        VARCHAR(150)  NOT NULL,
    category     VARCHAR(20)   NOT NULL,
    amount       BIGINT        NOT NULL,
    paid_by      BIGINT        NOT NULL,
    split_mode   VARCHAR(10)   NOT NULL,     -- EQUAL | CUSTOM (để form sửa hiển thị đúng chế độ)
    spent_on     DATE          NULL,
    note         VARCHAR(500)  NULL,
    receipt_url  VARCHAR(2000) NULL,
    created_by   BIGINT        NULL,
    created_at   DATETIME(6)   NOT NULL,
    updated_at   DATETIME(6)   NOT NULL,
    CONSTRAINT pk_expenses PRIMARY KEY (id),
    CONSTRAINT fk_expenses_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    -- Người trả phải là thành viên của CHÍNH trip này
    CONSTRAINT fk_expenses_payer FOREIGN KEY (trip_id, paid_by) REFERENCES trip_members (trip_id, user_id),
    CONSTRAINT fk_expenses_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_expenses_amount CHECK (amount BETWEEN 1 AND 1000000000),
    CONSTRAINT chk_expenses_split CHECK (split_mode IN ('EQUAL', 'CUSTOM')),
    CONSTRAINT chk_expenses_category CHECK (category IN
        ('FOOD', 'TRANSPORT', 'STAY', 'TICKET', 'SHOPPING', 'OTHER')),
    INDEX idx_expenses_trip (trip_id, spent_on)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE expense_shares (
    expense_id  BIGINT NOT NULL,
    user_id     BIGINT NOT NULL,
    amount      BIGINT NOT NULL,
    CONSTRAINT pk_expense_shares PRIMARY KEY (expense_id, user_id),
    CONSTRAINT fk_shares_expense FOREIGN KEY (expense_id) REFERENCES expenses (id) ON DELETE CASCADE,
    CONSTRAINT fk_shares_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT chk_shares_amount CHECK (amount >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------- Thanh toán giữa các thành viên
CREATE TABLE settlements (
    id            BIGINT      NOT NULL AUTO_INCREMENT,
    trip_id       BIGINT      NOT NULL,
    from_user     BIGINT      NOT NULL,
    to_user       BIGINT      NOT NULL,
    amount        BIGINT      NOT NULL,
    status        VARCHAR(10) NOT NULL,      -- PENDING (người trả báo đã chuyển) | CONFIRMED (người nhận xác nhận)
    created_at    DATETIME(6) NOT NULL,
    confirmed_at  DATETIME(6) NULL,
    CONSTRAINT pk_settlements PRIMARY KEY (id),
    CONSTRAINT fk_settlements_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_settlements_from FOREIGN KEY (trip_id, from_user) REFERENCES trip_members (trip_id, user_id),
    CONSTRAINT fk_settlements_to FOREIGN KEY (trip_id, to_user) REFERENCES trip_members (trip_id, user_id),
    CONSTRAINT chk_settlements_users CHECK (from_user <> to_user),
    CONSTRAINT chk_settlements_amount CHECK (amount BETWEEN 1 AND 1000000000),
    CONSTRAINT chk_settlements_status CHECK (status IN ('PENDING', 'CONFIRMED'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
```

### 2.1 Ghi chú thiết kế
- **BCNF và ràng buộc thành viên:**
  - Bảng có `trip_id` trực tiếp (`expenses.paid_by`, `settlements`) thì dùng **FK tổ hợp** `(trip_id, user_id)` → `trip_members`.
  - `expense_shares` và `poll_votes` **không lưu `trip_id`**, vì nó suy ra được qua `expense_id` / `option_id`. Lưu thêm sẽ thành phụ thuộc bắc cầu. Ràng buộc "phải là thành viên" ở hai bảng này do **service kiểm tra**.
  - `polls` **không lưu ngày hay hoạt động liên quan**. Ngày đích chọn lúc chốt, rồi tạo hoạt động qua `ItineraryService`, nên không phát sinh tham chiếu bắc cầu.
- **Bất biến tiền:**
  - `sum(expense_shares.amount) = expenses.amount`, kiểm ở service trong cùng transaction.
  - Số dư **chỉ tính các settlement `CONFIRMED`**. Settlement `PENDING` chỉ để hiển thị.
- **Xóa thành viên** (`TripMemberService.removeMember`):
  - Còn dính tiền (là người trả, có phần chia, hoặc có settlement) thì **chặn**, trả `409 MEMBER_HAS_EXPENSES`, để không làm sai số dư.
  - Phiếu bầu của người đó **bị xóa**.
- **Xóa trip** (`TripService.delete`), theo thứ tự: settlements → expenses (shares bị xóa theo) → polls (options, votes bị xóa theo) → checklist → members → trip. Lý do: các FK tổ hợp tới `trip_members` không có CASCADE.
- `users.bank_account_name`: lưu **chữ in hoa không dấu** (vd `NGUYEN THI LINH`), đúng chuẩn của QR và ngân hàng. Server tự chuẩn hóa.

---

## 3. Thuật toán (class thuần, có unit test)

### 3.1 `ExpenseSplitter`: chia đều
`amount` chia cho N người tham gia: mỗi người nhận `floor(amount / N)`, phần dư `r = amount mod N` cộng vào **người trả** nếu người trả có tham gia. Nếu người trả không tham gia, phần dư chia `+1đ` cho r người đầu tiên theo `userId`.
Ví dụ: 100.000đ cho 3 người, Linh trả → Linh 33.334, Mai 33.333, Ngọc 33.333.

### 3.2 `BalanceCalculator`: số dư & gợi ý chuyển khoản
- `net(u) = đã trả(u) − phần phải chịu(u) + đã chuyển đi CONFIRMED(u) − đã nhận CONFIRMED(u)`
  - `net > 0`: người khác còn nợ u.
  - `net < 0`: u còn nợ người khác.
  - Tổng mọi `net` luôn bằng 0.
- **Gợi ý chuyển khoản (thuật toán tham lam):** lặp lại "người nợ nhiều nhất chuyển cho người được nhận nhiều nhất, số tiền = min của hai bên" cho đến khi mọi số dư về 0. Hòa thì xét `userId` nhỏ hơn trước, để kết quả ổn định. Cách này cho tối đa N−1 lần chuyển (với nhóm 10–15 người là đủ tốt).

### 3.3 VietQR (FE: `lib/vietqr.ts`)
Payload theo chuẩn **EMVCo / NAPAS VietQR**, ghép các trường dạng ID + độ dài + giá trị:
`00=01 · 01=12 (QR động vì có số tiền) · 38={00=A000000727, 01={00=BIN, 01=STK}, 02=QRIBFTTA} · 53=704 · 54=số tiền · 58=VN · 62={08=nội dung} · 63=CRC16`
- CRC16-CCITT (đa thức 0x1021, khởi tạo 0xFFFF) tính trên chuỗi đã có `6304`.
- **Nội dung chuyển khoản:** không dấu, in hoa, tối đa 25 ký tự. Ví dụ `TRIP DA LAT NGOC`.
- Vẽ mã bằng thư viện `qrcode` (npm), xuất SVG/PNG data URL. Có unit test FE cho CRC với một chuỗi mẫu đã biết.

---

## 4. Đặc tả API (base `/api/v1`)

### 4.1 Ngân hàng
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/banks` | đã đăng nhập | Danh sách ngân hàng `{ bin, shortName, name }`, cố định trong code (khoảng 22 ngân hàng phổ biến) |
| PUT | `/users/me/bank` | đã đăng nhập | `{ bankBin, accountNo, accountName }`: BIN phải có trong danh sách, STK 6–19 chữ số |
| DELETE | `/users/me/bank` | đã đăng nhập | Xóa thông tin ngân hàng |

`UserResponse` (của chính mình) có thêm `bank: { bin, shortName, accountNo, accountName } | null`.

### 4.2 Bình chọn
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/trips/{id}/polls` | thành viên | Mọi bình chọn: đang mở xếp trước, kèm lựa chọn, số phiếu, danh sách người vote, lựa chọn của tôi |
| POST | `/trips/{id}/polls` | EDITOR+ | `{ title, options?: [{ name, mapsUrl?, note? }] }` |
| DELETE | `/polls/{pollId}` | người tạo / EDITOR+ | Xóa bình chọn |
| POST | `/polls/{pollId}/options` | thành viên | Thêm lựa chọn (chỉ khi bình chọn đang mở) |
| DELETE | `/poll-options/{optionId}` | người thêm / EDITOR+ | Xóa lựa chọn (khi đang mở) |
| PUT | `/poll-options/{optionId}/vote` | thành viên | Vote (idempotent, khi đang mở) |
| DELETE | `/poll-options/{optionId}/vote` | thành viên | Bỏ vote |
| POST | `/polls/{pollId}/close` | người tạo / EDITOR+ | `{ optionId, addToItinerary?: { dayId, startTime?, category } }` |
| POST | `/polls/{pollId}/reopen` | người tạo / EDITOR+ | Mở lại. Hoạt động đã thêm vào lịch trình (nếu có) vẫn giữ |

Mọi thao tác ghi đều trả lại toàn bộ `PollListResponse`.
```jsonc
{ "polls": [ { "id": 3, "title": "Tối ngày 2 ăn gì?", "createdByName": "Linh", "closed": false,
    "winningOptionId": null, "canManage": true,
    "options": [ { "id": 9, "name": "Lẩu gà lá é", "mapsUrl": null, "note": null, "createdByName": "Mai",
                   "voteCount": 4, "voterIds": [1, 2, 5, 7], "votedByMe": true, "canDelete": false } ] } ] }
```

### 4.3 Chi tiêu & thanh toán
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/trips/{id}/expenses` | thành viên | Tổng hợp: khoản chi, số dư, gợi ý chuyển khoản, settlements, thông tin ngân hàng của thành viên |
| POST | `/trips/{id}/expenses` | thành viên | Ai cũng ghi được khoản **mình trả**. **Chỉ OWNER** ghi hộ người khác |
| PUT | `/expenses/{id}` | người tạo / người trả / **OWNER** | Sửa. Đổi người trả sang người khác cần OWNER |
| DELETE | `/expenses/{id}` | người tạo / người trả / **OWNER** | Xóa |
| POST | `/trips/{id}/settlements` | người chuyển hoặc người nhận | `{ fromUserId, toUserId, amount }`. Mình là người chuyển → `PENDING`. Mình là người nhận → `CONFIRMED` luôn (vd nhận tiền mặt) |
| POST | `/settlements/{id}/confirm` | người nhận | `PENDING` → `CONFIRMED` |
| DELETE | `/settlements/{id}` | người chuyển (khi PENDING) / người nhận | Hủy hoặc từ chối |

```jsonc
// POST/PUT expense
{ "title": "Lẩu gà lá é", "category": "FOOD", "amount": 1200000, "paidBy": 1, "spentOn": "2027-01-05",
  "splitMode": "EQUAL", "participantIds": [1, 2, 3, 5],          // EQUAL
  "shares": null,                                                  // CUSTOM: [{ "userId": 1, "amount": 400000 }, ...]
  "note": null, "receiptUrl": "http://localhost:9000/trip-planner/receipt/2027/01/….webp" }

// GET /trips/{id}/expenses → 200 (mọi thao tác ghi trả lại đúng dạng này)
{ "totalAmount": 8450000,
  "byCategory": [ { "category": "FOOD", "amount": 3200000 } ],
  "members": [ { "userId": 1, "displayName": "Linh", "avatarUrl": null,
                 "paid": 5000000, "share": 1690000, "net": 3310000,
                 "bank": { "bin": "970436", "shortName": "Vietcombank", "accountNo": "0123456789",
                           "accountName": "NGUYEN THI LINH" } } ],
  "transfers": [ { "fromUserId": 5, "toUserId": 1, "amount": 1690000 } ],
  "settlements": [ { "id": 2, "fromUserId": 3, "toUserId": 1, "amount": 500000, "status": "PENDING",
                     "createdAt": "…", "confirmedAt": null } ],
  "expenses": [ { "id": 10, "title": "Lẩu gà lá é", "category": "FOOD", "amount": 1200000, "paidBy": 1,
                  "spentOn": "2027-01-05", "splitMode": "EQUAL", "note": null, "receiptUrl": null,
                  "createdByName": "Linh", "canEdit": true,
                  "shares": [ { "userId": 1, "amount": 300000 } ] } ] }
```
**Thông tin ngân hàng** của thành viên chỉ trả cho người **cùng chuyến**, đúng mục đích quét QR chuyển khoản. UI có ghi rõ "Số tài khoản của bạn sẽ hiện với thành viên các chuyến bạn tham gia".

### 4.4 Lỗi mới (`ErrorCode` + `frontend/src/types/api.ts`)
| HTTP | code | Khi nào |
|---|---|---|
| 404 | `POLL_NOT_FOUND`, `OPTION_NOT_FOUND`, `EXPENSE_NOT_FOUND`, `SETTLEMENT_NOT_FOUND` | Không tồn tại |
| 409 | `POLL_CLOSED` | Thêm/xóa lựa chọn hoặc vote khi bình chọn đã chốt |
| 409 | `DUPLICATE_OPTION` | Trùng tên lựa chọn trong cùng bình chọn |
| 400 | `INVALID_SPLIT` | Không có người tham gia. Tổng số tiền tùy chỉnh khác tổng khoản chi. Số tiền âm. Trùng người |
| 400 | `NOT_A_MEMBER` | Người trả, người tham gia, hoặc người chuyển/nhận không ở trong nhóm |
| 400 | `INVALID_BANK_ACCOUNT` | BIN không có trong danh sách, STK sai định dạng, tên rỗng |
| 400 | `INVALID_SETTLEMENT` | Chuyển cho chính mình. Thao tác không phải của người chuyển/nhận |
| 409 | `MEMBER_HAS_EXPENSES` | Xóa hoặc rời nhóm khi còn dính khoản chi hay thanh toán |

---

## 5. Backend: cấu trúc
```
bank/        BankDirectory (danh sách BIN cố định), BankController, UserBankService (+ dto)
poll/        Poll, PollOption, PollVote(+Id), repositories, PollService, PollController, dto/
expense/     Expense, ExpenseShare(+Id), Settlement, ExpenseCategory, SplitMode, SettlementStatus,
             ExpenseSplitter (thuần), BalanceCalculator (thuần), ExpenseService, SettlementService,
             ExpenseController, dto/
```
- Chốt bình chọn có `addToItinerary`: gọi `ItineraryService` (thêm hàm public `addItemFromPoll`). Hàm này kiểm tra `dayId` thuộc cùng trip, tạo hoạt động với tên + link Maps của lựa chọn, rồi tự chèn theo giờ.
- `MediaPurpose` thêm `RECEIPT` (thư mục `receipt/`).
- **Seeder** (idempotent): Đà Lạt có 1 bình chọn đang mở (3 lựa chọn, vài phiếu). Phú Quốc có khoảng 6 khoản chi (có khoản chia tùy chỉnh) và 1 settlement `PENDING`. `linh` và `mai` có sẵn thông tin ngân hàng mẫu (số tài khoản giả).

---

## 6. Frontend
- **Tab "Bình chọn"** (mới, nằm giữa Lịch trình và Chuẩn bị):
  - Mỗi bình chọn là một thẻ. Mỗi lựa chọn là một dòng có thanh tỷ lệ phiếu, avatar người vote, và nút tick để vote hoặc bỏ vote (cập nhật ngay trên giao diện).
  - Có ô "Thêm lựa chọn" (tên + link Maps).
  - Nút **"Chốt"** mở dialog: chọn lựa chọn thắng (mặc định là lựa chọn nhiều phiếu nhất), bật/tắt "Thêm vào lịch trình", rồi chọn ngày, giờ và loại hoạt động.
  - Bình chọn đã chốt hiện huy hiệu 🏆 ở lựa chọn thắng, kèm nút "Mở lại".
- **Tab "Chi tiêu"** (bỏ nhãn "Sắp có"):
  - **Thẻ tổng quan:** tổng chi của chuyến, bạn đã trả, và **bạn đang được nhận hay cần trả**.
  - **Thanh toán:**
    - Danh sách gợi ý chuyển khoản. Dòng của mình có nút **"Hiện QR"**: dialog có mã QR to, ngân hàng, STK (bấm để copy), số tiền, nội dung, và nút **"Tôi đã chuyển"**.
    - Mục "Chờ bạn xác nhận" có 2 nút Xác nhận / Từ chối.
    - Người nhận chưa có thông tin ngân hàng thì hiện "Linh chưa thêm tài khoản ngân hàng".
  - **Danh sách khoản chi:** nhóm theo ngày, mỗi dòng có icon loại, người trả, số tiền, phần của tôi, và ảnh hóa đơn (bấm để xem lớn).
  - **Dialog thêm/sửa khoản chi:**
    - Số tiền: bàn phím số, hiện định dạng `1.200.000 ₫`.
    - Người trả: mặc định là mình. EDITOR+ chọn được người khác.
    - Loại: chip có icon. Ngày chi. Danh sách người tham gia: tick chọn, có nút "Chọn tất cả".
    - Công tắc **"Chia không đều"**: hiện ô nhập số tiền từng người, kèm dòng "Còn thiếu / Thừa X ₫".
    - Nút tải ảnh hóa đơn (dùng lại `ImageUploadButton`, purpose `RECEIPT`).
- **Hồ sơ:** thêm mục **"Tài khoản nhận tiền"**: chọn ngân hàng (có ô tìm), STK, tên chủ tài khoản (tự viết hoa, bỏ dấu), nút xóa.
- **Thư viện mới:** `qrcode` (vẽ QR). Bộ tạo payload VietQR tự viết trong `lib/vietqr.ts`.

---

## 7. Kiểm thử
| Loại | Nội dung |
|---|---|
| Unit `ExpenseSplitterTest` | Chia đều chẵn. Có phần lẻ (người trả tham gia / không tham gia). 1 người tham gia |
| Unit `BalanceCalculatorTest` | Tổng `net` = 0. Settlement CONFIRMED làm giảm nợ, PENDING không tính. Gợi ý chuyển khoản trả hết nợ và ≤ N−1 dòng. Hòa thì ra kết quả ổn định. Không ai nợ ai |
| Unit FE (thủ công) | CRC16 của payload mẫu khớp giá trị đã biết. Quét QR bằng app ngân hàng thật: hiện đúng người nhận, số tiền, nội dung (**người dùng tự thử**) |
| Integration bình chọn | Tạo, thêm lựa chọn (VIEWER được), trùng tên → 409, vote/bỏ vote idempotent, chốt + thêm vào lịch trình, vote khi đã chốt → 409, mở lại, xóa thành viên thì phiếu của họ mất |
| Integration chi tiêu | EQUAL và CUSTOM (sai tổng → 400). VIEWER ghi khoản mình trả được, ghi hộ người khác → 403. Người tham gia ngoài nhóm → 400. Số dư và gợi ý chuyển khoản đúng. Luồng settlement PENDING → xác nhận → số dư đổi. Xóa thành viên còn dính tiền → 409. Xóa trip có đủ dữ liệu không lỗi FK |
| Integration ngân hàng | Lưu, đọc, xóa. BIN lạ / STK sai → 400. Tên tự viết hoa bỏ dấu |

## 8. Tiêu chí nghiệm thu
- [ ] `linh` → Đà Lạt → tab Bình chọn: vote, thêm lựa chọn, chốt và thêm vào lịch trình ngày 2 → thấy hoạt động mới ở tab Lịch trình.
- [ ] Phú Quốc → tab Chi tiêu: thấy tổng, số dư, gợi ý chuyển khoản. Thêm khoản chia không đều đúng tổng.
- [ ] `ngoc` mở QR chuyển cho Linh → quét bằng app ngân hàng thấy đúng STK, số tiền, nội dung → "Tôi đã chuyển" → `linh` xác nhận → số dư cập nhật.
- [ ] Hồ sơ: thêm và xóa tài khoản ngân hàng.
- [ ] Test BE pass, FE build và lint pass, `CLAUDE.md` cập nhật.

---

## 9. Ghi chú contract đã chốt khi triển khai
- **CUSTOM:** phần **0đ bị bỏ qua** (coi như người đó không tham gia). Cần ít nhất 1 phần > 0, và tổng phải bằng số tiền khoản chi.
- **Quyền khoản chi (sửa sau phản hồi của người dùng).** Ban đầu EDITOR+ sửa/xóa được mọi khoản chi. Vì người vào qua link mời mặc định là EDITOR, gần như cả nhóm sửa/xóa được tiền của nhau. Quy tắc mới:
  - Sửa/xóa: chỉ **người tạo, người trả hoặc OWNER**.
  - Ghi hộ (`paidBy` khác mình): chỉ **OWNER**.
  - Khi sửa, giữ nguyên người trả cũ thì không cần OWNER. Đổi người trả sang người khác thì cần OWNER.
  - Vi phạm trả 403 `FORBIDDEN`, kèm `detail` riêng.
- **Bình chọn:** lỗi trùng tên được bắt từ UNIQUE của DB (collation `_ai_ci`), nên "Lẩu gà" và "LAU GA" bị coi là trùng. Tạo bình chọn kèm danh sách lựa chọn ban đầu mà có trùng tên thì rollback cả bình chọn.
- **Chốt bình chọn có `addToItinerary`:** gọi `ItineraryService.addItem` (kiểm tra quyền EDITOR+ trên ngày đó). Hoạt động được tạo với: tên = tên lựa chọn, `locationName` = tên lựa chọn, `mapsUrl` và `note` lấy từ lựa chọn. `dayId` thuộc trip khác thì trả `DAY_NOT_FOUND`.
- Settlement của **người nhận** có thể bị chính người nhận xóa cả khi đã `CONFIRMED` (hoàn tác khi xác nhận nhầm).
- **`/banks`:** 26 ngân hàng (BIN NAPAS), cố định trong `BankDirectory`. `UserResponse.bank` có thêm `shortName`. Tên chủ tài khoản được backend chuẩn hóa in hoa, không dấu.
- **VietQR (FE `lib/vietqr.ts`):** đã kiểm CRC16-CCITT-FALSE với vector chuẩn (`"123456789"` → `29B1`). Nội dung chuyển khoản tối đa 25 ký tự, gồm `A-Z 0-9` và khoảng trắng. **Chưa quét thử bằng app ngân hàng thật.**
- **Kiểm tra trên DB dev:** dữ liệu seed Phú Quốc cho tổng số dư = 0, gợi ý 2 lần chuyển, settlement PENDING không được tính.
