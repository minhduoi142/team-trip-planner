package com.tripplanner.outfit;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DayOutfitRepository extends JpaRepository<DayOutfit, DayOutfitId> {

    /** Kèm người đăng và ngày; ảnh + màu nạp theo lô (@BatchSize). */
    @Query("""
            select o from DayOutfit o join fetch o.user join fetch o.tripDay d
            where d.trip.id = :tripId
            """)
    List<DayOutfit> findAllByTripId(@Param("tripId") Long tripId);

    @Query("select count(o) from DayOutfit o where o.id.tripDayId = :dayId")
    long countByDayId(@Param("dayId") Long dayId);

    /** Rời nhóm: xóa outfit của người đó ở mọi ngày của chuyến (ảnh + màu xóa theo FK CASCADE). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            delete from DayOutfit o
            where o.id.userId = :userId
              and o.id.tripDayId in (select d.id from TripDay d where d.trip.id = :tripId)
            """)
    int deleteAllForMemberInTrip(@Param("tripId") Long tripId, @Param("userId") Long userId);
}
