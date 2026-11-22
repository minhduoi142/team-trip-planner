package com.tripplanner.tripday;

import com.tripplanner.trip.Trip;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * "Ngày N" của chuyến đi. Ngày thực KHÔNG lưu (Phase 3): = trips.start_date + (dayIndex - 1) khi đã
 * chốt, null khi chưa chốt. Ngày có dayIndex vượt số ngày đã chốt là "ngày thừa" (overflow).
 */
@Entity
@Table(name = "trip_days")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false, updatable = false)
    private Trip trip;

    @Column(name = "day_index", nullable = false, columnDefinition = "SMALLINT")
    private Integer dayIndex;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "dress_theme", length = 100)
    private String dressTheme;

    @Column(name = "dress_note", length = 500)
    private String dressNote;

    @Column(name = "dress_image_url", length = 2000)
    private String dressImageUrl;

    /** Số ngày của chuyến đã chốt; null nếu chưa chốt. */
    public static Integer lockedLength(Trip trip) {
        if (!trip.isLocked()) {
            return null;
        }
        return (int) (trip.getEndDate().toEpochDay() - trip.getStartDate().toEpochDay()) + 1;
    }

    public boolean isOverflow(Trip trip) {
        Integer length = lockedLength(trip);
        return length != null && dayIndex > length;
    }

    /** Ngày thực; null nếu chưa chốt hoặc là ngày thừa. */
    public LocalDate dateIn(Trip trip) {
        return !trip.isLocked() || isOverflow(trip) ? null : trip.getStartDate().plusDays(dayIndex - 1L);
    }

    public boolean hasOwnFields() {
        return note != null || dressTheme != null || dressNote != null || dressImageUrl != null;
    }
}
