package com.tripplanner.tripday;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripDayRepository extends JpaRepository<TripDay, Long> {

    @Query("select d from TripDay d where d.trip.id = :tripId order by d.dayIndex asc")
    List<TripDay> findAllByTripId(@Param("tripId") Long tripId);

    /** Để kiểm quyền: ngày thuộc trip nào. */
    @Query("select d.trip.id from TripDay d where d.id = :dayId")
    Optional<Long> findTripIdByDayId(@Param("dayId") Long dayId);
}
