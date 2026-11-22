package com.tripplanner.availability;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberAvailabilityRepository extends JpaRepository<MemberAvailability, MemberAvailabilityId> {

    /** Toàn bộ lịch rảnh của trip trong khoảng ngày (1 query cho cả ma trận). */
    @Query("""
            select a from MemberAvailability a
            where a.id.tripId = :tripId and a.id.availDate between :from and :to
            """)
    List<MemberAvailability> findInRange(@Param("tripId") Long tripId,
                                         @Param("from") LocalDate from,
                                         @Param("to") LocalDate to);

    @Query("""
            select a from MemberAvailability a
            where a.id.tripId = :tripId and a.id.userId = :userId and a.id.availDate in :dates
            """)
    List<MemberAvailability> findForUserAndDates(@Param("tripId") Long tripId,
                                                 @Param("userId") Long userId,
                                                 @Param("dates") Collection<LocalDate> dates);

    long countByIdTripId(Long tripId);
}
