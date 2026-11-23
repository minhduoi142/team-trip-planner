package com.tripplanner.notification;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Persistable;

/**
 * Thành viên đã tắt email của 1 chuyến. FK tổ hợp tới trip_members ON DELETE CASCADE: rời nhóm / xoá chuyến tự
 * xoá dòng này. {@link Persistable} để {@code save()} INSERT thẳng thay vì merge (id do mình gán).
 */
@Entity
@Table(name = "trip_notification_mutes")
@Getter
@NoArgsConstructor
public class TripNotificationMute implements Persistable<TripNotificationMuteId> {

    @EmbeddedId
    private TripNotificationMuteId id;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Transient
    private boolean isNew;

    public TripNotificationMute(Long tripId, Long userId, Instant now) {
        this.id = new TripNotificationMuteId(tripId, userId);
        this.createdAt = now;
        this.isNew = true;
    }

    @Override
    public boolean isNew() {
        return isNew;
    }
}
