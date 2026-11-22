package com.tripplanner.room;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.domain.Persistable;

/**
 * Người ở phòng. BCNF: (room_id, user_id), không lưu trip_id. "Mỗi người tối đa 1 phòng/chuyến",
 * "phải là thành viên", sức chứa: do RoomService kiểm tra trong cùng transaction.
 */
@Entity
@Table(name = "room_assignments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoomAssignment implements Persistable<RoomAssignmentId> {

    @Transient
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private boolean isNew = true;

    @EmbeddedId
    private RoomAssignmentId id;

    @Column(name = "assigned_at", nullable = false, updatable = false)
    private Instant assignedAt;

    public RoomAssignment(Long roomId, Long userId) {
        this.id = new RoomAssignmentId(roomId, userId);
    }

    @PrePersist
    void onCreate() {
        assignedAt = Instant.now();
    }

    @PostPersist
    @PostLoad
    void markNotNew() {
        this.isNew = false;
    }

    @Override
    public boolean isNew() {
        return isNew;
    }
}
