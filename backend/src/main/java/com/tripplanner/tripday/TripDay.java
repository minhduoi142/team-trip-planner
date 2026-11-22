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

/** Một ngày của chuyến đi đã chốt. Chỉ được tạo/xóa bởi thao tác chốt / mở lại ngày. */
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

    @Column(name = "actual_date", nullable = false)
    private LocalDate actualDate;

    @Column(name = "note", length = 500)
    private String note;
}
