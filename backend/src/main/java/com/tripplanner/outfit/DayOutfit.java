package com.tripplanner.outfit;

import com.tripplanner.tripday.TripDay;
import com.tripplanner.user.User;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;
import org.springframework.data.domain.Persistable;

/**
 * Outfit của 1 người cho 1 ngày. Ảnh (có thứ tự) và màu là thuộc tính đa trị nằm ở bảng riêng; đổi thì Hibernate
 * xóa rồi chèn lại cả tập (tối đa 4 ảnh, 3 màu nên không đáng kể).
 */
@Entity
@Table(name = "day_outfits")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DayOutfit implements Persistable<DayOutfitId> {

    @Transient
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private boolean isNew = true;

    @EmbeddedId
    private DayOutfitId id;

    @MapsId("tripDayId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_day_id")
    private TripDay tripDay;

    @MapsId("userId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "note", length = 300)
    private String note;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @ElementCollection
    @CollectionTable(name = "day_outfit_photos", joinColumns = {
            @JoinColumn(name = "trip_day_id", referencedColumnName = "trip_day_id"),
            @JoinColumn(name = "user_id", referencedColumnName = "user_id")})
    @OrderColumn(name = "position", columnDefinition = "TINYINT")
    @Column(name = "image_url", length = 2000, nullable = false)
    @BatchSize(size = 100)
    private List<String> photoUrls = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "day_outfit_colors", joinColumns = {
            @JoinColumn(name = "trip_day_id", referencedColumnName = "trip_day_id"),
            @JoinColumn(name = "user_id", referencedColumnName = "user_id")})
    @Column(name = "color_key", length = 20, nullable = false)
    @BatchSize(size = 100)
    private Set<String> colors = new LinkedHashSet<>();

    public DayOutfit(TripDay tripDay, User user) {
        this.id = new DayOutfitId(tripDay.getId(), user.getId());
        this.tripDay = tripDay;
        this.user = user;
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
