package com.tripplanner.notification;

import com.tripplanner.notification.CoalescePlanner.Plan;
import com.tripplanner.notification.NotificationAudience.Snapshot;
import com.tripplanner.notification.NotificationOutbox.NewNotification;
import com.tripplanner.notification.NotificationOutbox.PendingRef;
import com.tripplanner.notification.event.ExpenseChanged;
import com.tripplanner.notification.event.MemberJoined;
import com.tripplanner.notification.event.MemberLeft;
import com.tripplanner.notification.event.SettlementChanged;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Biến domain event thành dòng outbox (docs/sdd-email-notifications.md §6). Chạy BEFORE_COMMIT trong chính transaction
 * nghiệp vụ: nghiệp vụ rollback thì không có thông báo. Mọi lỗi đều bị bắt và log: thông báo hỏng không được làm hỏng
 * thao tác chính (đọc/ghi đều bằng JDBC nên lỗi không đánh dấu rollback-only).
 */
@Slf4j
@Component
public class NotificationEventListener {

    static final String REASON_EVENT = "EVENT_CANCELLED";

    private final NotificationAudience audience;
    private final NotificationOutbox outbox;

    public NotificationEventListener(NotificationAudience audience, NotificationOutbox outbox) {
        this.audience = audience;
        this.outbox = outbox;
    }

    // ---------------------------------------------------------------- thành viên

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void onMemberJoined(MemberJoined event) {
        safely("MemberJoined", () -> {
            Snapshot s = audience.load(event.tripId(), true, List.of(event.userId()));
            Map<String, Object> payload = payload(s, "memberName", s.name(event.userId()));
            for (long recipient : s.memberIds()) {
                if (recipient != event.userId()) {
                    enqueue(s, recipient, event.tripId(), NotificationType.MEMBER_JOINED, payload, null);
                }
            }
        });
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void onMemberLeft(MemberLeft event) {
        safely("MemberLeft", () -> {
            Long removedBy = event.removedById();
            Set<Long> extra = new LinkedHashSet<>(List.of(event.userId()));
            if (removedBy != null) {
                extra.add(removedBy);
            }
            Snapshot s = audience.load(event.tripId(), true, extra);
            Map<String, Object> payload = payload(s, "memberName", s.name(event.userId()));
            payload.put("removedByName", removedBy == null ? null : s.name(removedBy));
            NotificationType type = removedBy == null ? NotificationType.MEMBER_LEFT : NotificationType.MEMBER_REMOVED;
            for (long recipient : s.memberIds()) {
                // Hibernate có thể chưa flush lệnh xoá → tự loại người vừa rời; OWNER tự mời ra thì khỏi báo OWNER
                if (recipient != event.userId() && (removedBy == null || recipient != removedBy)) {
                    enqueue(s, recipient, event.tripId(), type, payload, null);
                }
            }
            if (removedBy != null) {
                enqueue(s, event.userId(), event.tripId(), NotificationType.YOU_WERE_REMOVED,
                        payload(s, "removedByName", s.name(removedBy)), null);
            }
        });
    }

    // ---------------------------------------------------------------- chi tiêu

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void onExpenseChanged(ExpenseChanged event) {
        safely("ExpenseChanged", () -> {
            Set<Long> recipients = new LinkedHashSet<>(event.oldShares().keySet());
            recipients.addAll(event.newShares().keySet());
            recipients.remove(event.actorId());   // người thao tác không cần email
            if (recipients.isEmpty()) {
                return;
            }
            Set<Long> extra = new LinkedHashSet<>(recipients);
            extra.add(event.actorId());
            extra.add(event.paidById());
            Snapshot s = audience.load(event.tripId(), false, extra);
            String key = "EXP:" + event.expenseId();

            for (long recipient : recipients) {
                long oldShare = event.oldShares().getOrDefault(recipient, 0L);
                long newShare = event.newShares().getOrDefault(recipient, 0L);
                List<PendingRef> pending = outbox.findPending(key, recipient);
                NotificationType pendingType = pending.isEmpty() ? null : pending.get(0).type();
                Plan plan = CoalescePlanner.forExpense(event.kind(), pendingType, outbox.wasSent(key, recipient),
                        oldShare, newShare);

                Map<String, Object> payload = payload(s, "actorName", s.name(event.actorId()));
                payload.put("expenseTitle", event.title());
                payload.put("amount", event.amount());
                payload.put("paidByName", s.name(event.paidById()));
                payload.put("yourShare", newShare);
                apply(s, plan, pending, recipient, event.tripId(), key, payload);
            }
        });
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void onSettlementChanged(SettlementChanged event) {
        safely("SettlementChanged", () -> {
            Snapshot s = audience.load(event.tripId(), false, List.of(event.fromUserId(), event.toUserId()));
            String key = "STL:" + event.settlementId();
            Map<String, Object> payload = payload(s, "fromName", s.name(event.fromUserId()));
            payload.put("toName", s.name(event.toUserId()));
            payload.put("amount", event.amount());
            if (event.fund()) {
                payload.put("fund", true);
            }
            long from = event.fromUserId();
            long to = event.toUserId();

            switch (event.kind()) {
                case PENDING_CREATED -> enqueue(s, to, event.tripId(), NotificationType.SETTLEMENT_PENDING, payload, key);
                case CONFIRMED -> {
                    outbox.cancelPending(key, to, REASON_EVENT);   // người nhận đã tự xác nhận
                    enqueue(s, from, event.tripId(), NotificationType.SETTLEMENT_CONFIRMED, payload, key);
                }
                case REJECTED -> {
                    outbox.cancelPending(key, to, REASON_EVENT);
                    enqueue(s, from, event.tripId(), NotificationType.SETTLEMENT_REJECTED, payload, key);
                }
                case CONFIRMED_DELETED -> {
                    // Người chuyển chưa kịp nhận mail "đã xác nhận" thì huỷ luôn, khỏi báo gì
                    boolean everSent = outbox.wasSent(key, from);
                    outbox.cancelPending(key, from, REASON_EVENT);
                    if (everSent) {
                        enqueue(s, from, event.tripId(), NotificationType.SETTLEMENT_REJECTED, payload, key);
                    }
                }
                case CANCELLED_BY_SENDER -> outbox.cancelPending(key, to, REASON_EVENT);
            }
        });
    }

    // ---------------------------------------------------------------- helpers

    private void apply(Snapshot s, Plan plan, List<PendingRef> pending, long recipient, long tripId, String key,
                       Map<String, Object> payload) {
        List<Long> pendingIds = pending.stream().map(PendingRef::id).toList();
        switch (plan.action()) {
            case INSERT -> enqueue(s, recipient, tripId, plan.type(), payload, key);
            case UPDATE -> outbox.updatePayload(pendingIds.get(0), payload);
            case CANCEL -> outbox.cancel(pendingIds, REASON_EVENT);
            case CANCEL_AND_INSERT -> {
                outbox.cancel(pendingIds, REASON_EVENT);
                enqueue(s, recipient, tripId, plan.type(), payload, key);
            }
            case NOOP -> {
            }
        }
    }

    /** Lọc lúc tạo: không có email / đã tắt loại / đã tắt chuyến thì khỏi ghi (dispatcher vẫn kiểm tra lại). */
    private void enqueue(Snapshot s, long recipient, long tripId, NotificationType type, Map<String, Object> payload,
                         String coalesceKey) {
        if (s.canReceive(recipient, type)) {
            outbox.enqueue(new NewNotification(recipient, tripId, type, payload, null, coalesceKey, null));
        }
    }

    private static Map<String, Object> payload(Snapshot s, String key, Object value) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("tripTitle", s.tripTitle());
        payload.put(key, value);
        return payload;
    }

    private static void safely(String event, Runnable action) {
        try {
            action.run();
        } catch (RuntimeException e) {
            log.error("Không tạo được thông báo email cho sự kiện {}: {}", event, e.getMessage(), e);
        }
    }
}
