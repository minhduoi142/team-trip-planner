package com.tripplanner.itinerary;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ItineraryItemRepository extends JpaRepository<ItineraryItem, Long> {

    /** Toàn bộ item của nhiều ngày, kèm người tạo (1 query cho cả lịch trình). */
    @Query("""
            select i from ItineraryItem i left join fetch i.createdBy
            where i.tripDay.id in :dayIds order by i.sortOrder asc, i.id asc
            """)
    List<ItineraryItem> findAllByDayIds(@Param("dayIds") Collection<Long> dayIds);

    @Query("select i from ItineraryItem i where i.tripDay.id = :dayId order by i.sortOrder asc, i.id asc")
    List<ItineraryItem> findAllByDayId(@Param("dayId") Long dayId);

    @Query("select count(i) from ItineraryItem i where i.tripDay.id = :dayId")
    long countByDayId(@Param("dayId") Long dayId);

    /** Để kiểm quyền: item thuộc trip nào (đi qua trip_day). */
    @Query("select i.tripDay.trip.id from ItineraryItem i where i.id = :itemId")
    Optional<Long> findTripIdByItemId(@Param("itemId") Long itemId);
}
