package com.tripplanner.availability;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.domain.Persistable;

/**
 * Trạng thái của 1 thành viên cho 1 ngày. PK tự nhiên (trip_id, user_id, avail_date); FK tổ hợp
 * (trip_id, user_id) → trip_members nằm ở DB, không map quan hệ để giữ entity gọn.
 */
@Entity
@Table(name = "member_availabilities")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberAvailability implements Persistable<MemberAvailabilityId> {

    @Transient
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private boolean isNew = true;

    @EmbeddedId
    private MemberAvailabilityId id;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "status", nullable = false, length = 10)
    private AvailabilityStatus status;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public MemberAvailability(Long tripId, Long userId, LocalDate date, AvailabilityStatus status) {
        this.id = new MemberAvailabilityId(tripId, userId, date);
        this.status = status;
    }

    public LocalDate getDate() {
        return id.getAvailDate();
    }

    public Long getUserId() {
        return id.getUserId();
    }

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
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
