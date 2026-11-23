package com.tripplanner.notification;

import com.tripplanner.notification.event.ExpenseChanged.Kind;

/**
 * Quyết định làm gì với outbox của 1 người nhận khi khoản chi đổi (docs/sdd-email-notifications.md §6.3).
 * Trong cửa sổ chờ thì sửa/huỷ dòng PENDING thay vì tạo thêm; người chưa từng được báo thì không báo "đã xoá".
 * Class thuần, có unit test.
 */
public final class CoalescePlanner {

    private CoalescePlanner() {
    }

    public enum Action {
        /** Chèn dòng mới loại {@link Plan#type()}. */
        INSERT,
        /** Ghi đè payload của dòng PENDING đang có (giữ type, giữ send_after). */
        UPDATE,
        /** Huỷ dòng PENDING đang có. */
        CANCEL,
        /** Huỷ dòng PENDING đang có rồi chèn dòng mới loại {@link Plan#type()}. */
        CANCEL_AND_INSERT,
        NOOP
    }

    /** {@code type}: loại dòng sẽ chèn (INSERT, CANCEL_AND_INSERT) hoặc giữ nguyên (UPDATE); null nếu không cần. */
    public record Plan(Action action, NotificationType type) {

        static Plan of(Action action) {
            return new Plan(action, null);
        }

        static Plan insert(NotificationType type) {
            return new Plan(Action.INSERT, type);
        }
    }

    /**
     * @param pendingType type của dòng PENDING mới nhất cùng coalesce_key cho người này, null nếu không có
     * @param everSent    đã từng gửi email cùng coalesce_key cho người này
     * @param oldShare    phần chia trước thay đổi (0 = không tham gia)
     * @param newShare    phần chia sau thay đổi (0 = không tham gia)
     */
    public static Plan forExpense(Kind kind, NotificationType pendingType, boolean everSent, long oldShare,
                                  long newShare) {
        boolean pending = pendingType != null;
        return switch (kind) {
            case CREATED -> newShare > 0 ? Plan.insert(NotificationType.EXPENSE_ADDED) : Plan.of(Action.NOOP);
            case UPDATED -> {
                if (newShare > 0) {
                    yield pending ? new Plan(Action.UPDATE, pendingType) : Plan.insert(NotificationType.EXPENSE_UPDATED);
                }
                if (oldShare <= 0) {
                    yield Plan.of(Action.NOOP);   // không liên quan tới người này
                }
                // Bị bỏ khỏi phần chia: chưa từng được báo thì im lặng, đã báo thì nói "không còn trong khoản này"
                if (pending) {
                    yield pendingType == NotificationType.EXPENSE_UPDATED && everSent
                            ? new Plan(Action.UPDATE, pendingType) : Plan.of(Action.CANCEL);
                }
                yield everSent ? Plan.insert(NotificationType.EXPENSE_UPDATED) : Plan.of(Action.NOOP);
            }
            case DELETED -> {
                if (pending) {
                    yield everSent ? new Plan(Action.CANCEL_AND_INSERT, NotificationType.EXPENSE_DELETED)
                            : Plan.of(Action.CANCEL);
                }
                yield everSent ? Plan.insert(NotificationType.EXPENSE_DELETED) : Plan.of(Action.NOOP);
            }
        };
    }
}
