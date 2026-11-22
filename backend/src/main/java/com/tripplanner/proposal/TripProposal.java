package com.tripplanner.proposal;

import com.tripplanner.itinerary.ItineraryCategory;
import com.tripplanner.itinerary.ItineraryItem;
import com.tripplanner.trip.Trip;
import com.tripplanner.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Đề xuất trong wishlist của chuyến. "Đã lên lịch" = {@link #itineraryItem} khác null (DB tự SET NULL khi
 * hoạt động bị xóa → đề xuất quay về wishlist). Số tim không lưu, đếm từ proposal_votes.
 */
@Entity
@Table(name = "trip_proposals")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripProposal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false, updatable = false)
    private Trip trip;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "category", nullable = false, length = 20)
    private ItineraryCategory category;

    @Column(name = "maps_url", length = 2000)
    private String mapsUrl;

    @Column(name = "reference_url", length = 2000)
    private String referenceUrl;

    /** VND */
    @Column(name = "estimated_cost")
    private Long estimatedCost;

    @Column(name = "note", length = 500)
    private String note;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "itinerary_item_id", unique = true)
    private ItineraryItem itineraryItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public boolean isScheduled() {
        return itineraryItem != null;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
