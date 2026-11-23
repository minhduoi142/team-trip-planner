package com.tripplanner.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Tuỳ chọn nhận email. Không có dòng = mọi thứ bật ({@link #defaults(Long, Instant)}). */
@Entity
@Table(name = "user_notification_prefs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserNotificationPrefs {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "email_enabled", nullable = false)
    private boolean emailEnabled;

    @Column(name = "countdown_enabled", nullable = false)
    private boolean countdownEnabled;

    @Column(name = "member_enabled", nullable = false)
    private boolean memberEnabled;

    @Column(name = "expense_enabled", nullable = false)
    private boolean expenseEnabled;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static UserNotificationPrefs defaults(Long userId, Instant now) {
        return new UserNotificationPrefs(userId, true, true, true, true, now);
    }

    public boolean isCategoryEnabled(NotificationCategory category) {
        return switch (category) {
            case COUNTDOWN -> countdownEnabled;
            case MEMBER -> memberEnabled;
            case EXPENSE -> expenseEnabled;
        };
    }

    public void setCategoryEnabled(NotificationCategory category, boolean enabled) {
        switch (category) {
            case COUNTDOWN -> countdownEnabled = enabled;
            case MEMBER -> memberEnabled = enabled;
            case EXPENSE -> expenseEnabled = enabled;
        }
    }
}
