package com.tripplanner.trip;

import com.tripplanner.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.domain.Persistable;

/**
 * Bảng trung gian trips–users, PK tổ hợp (trip_id, user_id). Cột sinh {@code owner_trip_id}
 * chỉ tồn tại ở DB (ràng buộc 1 OWNER/trip) nên không map.
 */
@Entity
@Table(name = "trip_members")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TripMember implements Persistable<TripMemberId> {

    /** Id tổ hợp do ứng dụng gán: báo cho Spring Data biết entity mới để gọi persist thay vì merge. */
    @Transient
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private boolean isNew = true;

    @EmbeddedId
    private TripMemberId id;

    @MapsId("tripId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id")
    private Trip trip;

    @MapsId("userId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    /** VARCHAR thay vì ENUM native của MySQL để khớp migration. */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "role", nullable = false, length = 10)
    private TripRole role;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    public TripMember(Trip trip, User user, TripRole role) {
        this.id = new TripMemberId(trip.getId(), user.getId());
        this.trip = trip;
        this.user = user;
        this.role = role;
    }

    @PrePersist
    void onCreate() {
        if (joinedAt == null) {
            joinedAt = Instant.now();
        }
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
