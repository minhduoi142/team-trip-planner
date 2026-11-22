package com.tripplanner.tripday;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripDayRepository extends JpaRepository<TripDay, Long> {

    @Query("select d from TripDay d where d.trip.id = :tripId order by d.dayIndex asc")
    List<TripDay> findAllByTripId(@Param("tripId") Long tripId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from TripDay d where d.trip.id = :tripId")
    void deleteAllByTripId(@Param("tripId") Long tripId);
}
