package com.tripplanner.tripday;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.util.List;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.domain.Persistable;

/** Một màu trong dress code của 1 ngày (1NF: mỗi màu 1 dòng). */
@Entity
@Table(name = "trip_day_dress_colors")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TripDayDressColor implements Persistable<TripDayDressColorId> {

    /** Bảng màu cố định, đồng bộ với frontend/src/lib/dressColors.ts. */
    public static final List<String> PALETTE = List.of(
            "white", "black", "beige", "brown", "pastel-pink", "hot-pink", "red", "orange",
            "yellow", "mint", "green", "sky", "navy", "lavender", "purple", "denim");
    public static final Set<String> ALLOWED = Set.copyOf(PALETTE);
    public static final int MAX_PER_DAY = 4;

    @Transient
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private boolean isNew = true;

    @EmbeddedId
    private TripDayDressColorId id;

    public TripDayDressColor(Long tripDayId, String colorKey) {
        this.id = new TripDayDressColorId(tripDayId, colorKey);
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
