package com.tripplanner.expense;

import com.tripplanner.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Quỹ chung của 1 chuyến (docs/sdd-trip-fund.md). Khóa = trip_id. DB có FK tổ hợp (trip_id, treasurer_id) →
 * trip_members nên thủ quỹ luôn là thành viên của chính chuyến này; JPA chỉ map người giữ quỹ.
 */
@Entity
@Table(name = "trip_funds")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripFund {

    @Id
    @Column(name = "trip_id")
    private Long tripId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "treasurer_id", nullable = false)
    private User treasurer;

    /** Tổng số tiền mỗi người cần nộp (VND), giống nhau cho mọi người. */
    @Column(name = "per_person_target", nullable = false)
    private Long perPersonTarget;

    @Column(name = "note", length = 300)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
