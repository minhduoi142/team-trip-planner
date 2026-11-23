package com.tripplanner.notification.mail;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripplanner.notification.NotificationType;

/**
 * Chuyển 1 dòng thông báo (type + payload ảnh chụp lúc xảy ra sự kiện) thành 1 dòng trong email tóm tắt.
 * Class thuần, có unit test. Payload xem docs/sdd-email-notifications.md §6.4.
 */
public final class DigestItemFormatter {

    private static final MailFormat FMT = MailFormat.INSTANCE;

    private DigestItemFormatter() {
    }

    /** {@code detail} có thể null. */
    public record DigestItem(String text, String detail) {
    }

    public static DigestItem format(NotificationType type, JsonNode p) {
        return switch (type) {
            case MEMBER_JOINED -> new DigestItem(text(p, "memberName") + " đã tham gia nhóm", null);
            case MEMBER_LEFT -> new DigestItem(text(p, "memberName") + " đã rời nhóm", null);
            case MEMBER_REMOVED -> new DigestItem(text(p, "memberName") + " đã được "
                    + text(p, "removedByName") + " mời ra khỏi nhóm", null);
            case YOU_WERE_REMOVED -> new DigestItem("Bạn không còn ở trong chuyến này",
                    p.hasNonNull("removedByName") ? "Do " + text(p, "removedByName") + " mời ra khỏi nhóm" : null);
            case EXPENSE_ADDED -> new DigestItem(
                    text(p, "actorName") + " đã thêm khoản chi “" + text(p, "expenseTitle") + "”", expenseDetail(p));
            case EXPENSE_UPDATED -> new DigestItem(
                    text(p, "actorName") + " đã sửa khoản chi “" + text(p, "expenseTitle") + "”", expenseDetail(p));
            case EXPENSE_DELETED -> new DigestItem(
                    text(p, "actorName") + " đã xoá khoản chi “" + text(p, "expenseTitle") + "”",
                    "Tổng " + FMT.money(p.path("amount").asLong()));
            case SETTLEMENT_PENDING -> new DigestItem(
                    text(p, "fromName") + " báo đã chuyển cho bạn " + FMT.money(p.path("amount").asLong()),
                    "Vào mục Chi tiêu để xác nhận đã nhận tiền");
            case SETTLEMENT_CONFIRMED -> new DigestItem(
                    text(p, "toName") + " đã xác nhận nhận " + FMT.money(p.path("amount").asLong()) + " từ bạn", null);
            case SETTLEMENT_REJECTED -> new DigestItem(
                    text(p, "toName") + " đã huỷ khoản " + FMT.money(p.path("amount").asLong())
                            + " bạn ghi là đã chuyển", "Kiểm tra lại với " + text(p, "toName") + " nhé");
            case COUNTDOWN -> throw new IllegalArgumentException("COUNTDOWN không nằm trong email tóm tắt");
        };
    }

    /** Tiêu đề email khi nhóm chỉ có 1 dòng. */
    public static String singleSubject(NotificationType type, JsonNode p) {
        DigestItem item = format(type, p);
        if ((type == NotificationType.EXPENSE_ADDED || type == NotificationType.EXPENSE_UPDATED)
                && p.path("yourShare").asLong() > 0) {
            return item.text() + " – phần của bạn " + FMT.money(p.path("yourShare").asLong());
        }
        return item.text();
    }

    private static String expenseDetail(JsonNode p) {
        String base = "Tổng " + FMT.money(p.path("amount").asLong()) + " · " + text(p, "paidByName") + " trả";
        long share = p.path("yourShare").asLong();
        return share > 0 ? base + " · Phần của bạn " + FMT.money(share) : base + " · Bạn không còn trong khoản này";
    }

    private static String text(JsonNode p, String field) {
        JsonNode value = p.get(field);
        return value == null || value.isNull() ? "Ai đó" : value.asText();
    }
}
