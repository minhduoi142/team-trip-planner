package com.tripplanner.tripday;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripDayDressColorRepository extends JpaRepository<TripDayDressColor, TripDayDressColorId> {

    @Query("select c from TripDayDressColor c where c.id.tripDayId in :dayIds")
    List<TripDayDressColor> findByDayIds(@Param("dayIds") Collection<Long> dayIds);

    long countByIdTripDayId(Long tripDayId);

    @Modifying(flushAutomatically = true)
    @Query("delete from TripDayDressColor c where c.id.tripDayId = :dayId")
    void deleteByDayId(@Param("dayId") Long dayId);
}
