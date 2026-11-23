package com.tripplanner.notification;

import static com.tripplanner.notification.CoalescePlanner.Action.CANCEL;
import static com.tripplanner.notification.CoalescePlanner.Action.CANCEL_AND_INSERT;
import static com.tripplanner.notification.CoalescePlanner.Action.INSERT;
import static com.tripplanner.notification.CoalescePlanner.Action.NOOP;
import static com.tripplanner.notification.CoalescePlanner.Action.UPDATE;
import static com.tripplanner.notification.NotificationType.EXPENSE_ADDED;
import static com.tripplanner.notification.NotificationType.EXPENSE_DELETED;
import static com.tripplanner.notification.NotificationType.EXPENSE_UPDATED;
import static org.assertj.core.api.Assertions.assertThat;

import com.tripplanner.notification.CoalescePlanner.Plan;
import com.tripplanner.notification.event.ExpenseChanged.Kind;
import org.junit.jupiter.api.Test;

class CoalescePlannerTest {

    @Test
    void created() {
        assertThat(plan(Kind.CREATED, null, false, 0, 100)).isEqualTo(new Plan(INSERT, EXPENSE_ADDED));
        assertThat(plan(Kind.CREATED, null, false, 0, 0).action()).isEqualTo(NOOP);
    }

    @Test
    void updatedWhileStillInSplit() {
        // Còn trong cửa sổ chờ: sửa dòng đang chờ, giữ type (ADDED vẫn là ADDED)
        assertThat(plan(Kind.UPDATED, EXPENSE_ADDED, false, 100, 120)).isEqualTo(new Plan(UPDATE, EXPENSE_ADDED));
        assertThat(plan(Kind.UPDATED, EXPENSE_UPDATED, true, 100, 120)).isEqualTo(new Plan(UPDATE, EXPENSE_UPDATED));
        // Đã gửi rồi (hoặc mới được thêm vào phần chia) → dòng "đã sửa" mới
        assertThat(plan(Kind.UPDATED, null, true, 100, 120)).isEqualTo(new Plan(INSERT, EXPENSE_UPDATED));
        assertThat(plan(Kind.UPDATED, null, false, 0, 120)).isEqualTo(new Plan(INSERT, EXPENSE_UPDATED));
    }

    @Test
    void updatedRemovedFromSplit() {
        // Chưa từng biết → huỷ / im lặng
        assertThat(plan(Kind.UPDATED, EXPENSE_ADDED, false, 100, 0).action()).isEqualTo(CANCEL);
        assertThat(plan(Kind.UPDATED, null, false, 100, 0).action()).isEqualTo(NOOP);
        // Đã được báo → nói "bạn không còn trong khoản này"
        assertThat(plan(Kind.UPDATED, null, true, 100, 0)).isEqualTo(new Plan(INSERT, EXPENSE_UPDATED));
        assertThat(plan(Kind.UPDATED, EXPENSE_UPDATED, true, 100, 0)).isEqualTo(new Plan(UPDATE, EXPENSE_UPDATED));
        assertThat(plan(Kind.UPDATED, EXPENSE_UPDATED, false, 100, 0).action()).isEqualTo(CANCEL);
        // Không liên quan trước lẫn sau
        assertThat(plan(Kind.UPDATED, null, false, 0, 0).action()).isEqualTo(NOOP);
    }

    @Test
    void deleted() {
        assertThat(plan(Kind.DELETED, EXPENSE_ADDED, false, 100, 0).action()).isEqualTo(CANCEL);
        assertThat(plan(Kind.DELETED, EXPENSE_UPDATED, true, 100, 0)).isEqualTo(new Plan(CANCEL_AND_INSERT, EXPENSE_DELETED));
        assertThat(plan(Kind.DELETED, null, true, 100, 0)).isEqualTo(new Plan(INSERT, EXPENSE_DELETED));
        assertThat(plan(Kind.DELETED, null, false, 100, 0).action()).isEqualTo(NOOP);
    }

    private static Plan plan(Kind kind, NotificationType pending, boolean everSent, long oldShare, long newShare) {
        return CoalescePlanner.forExpense(kind, pending, everSent, oldShare, newShare);
    }
}
