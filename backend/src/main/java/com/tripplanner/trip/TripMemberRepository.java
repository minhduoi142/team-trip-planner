package com.tripplanner.trip;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripMemberRepository extends JpaRepository<TripMember, TripMemberId> {

    /** Các chuyến đi user tham gia, kèm Trip (1 query). */
    @Query("select m from TripMember m join fetch m.trip where m.id.userId = :userId")
    List<TripMember> findMembershipsWithTrip(@Param("userId") Long userId);

    /** Thành viên của nhiều trip một lúc, kèm User (tránh N+1 khi dựng danh sách). */
    @Query("select m from TripMember m join fetch m.user where m.id.tripId in :tripIds order by m.joinedAt asc")
    List<TripMember> findAllWithUserByTripIds(@Param("tripIds") Collection<Long> tripIds);

    @Query("select m from TripMember m join fetch m.user where m.id.tripId = :tripId order by m.joinedAt asc")
    List<TripMember> findAllWithUserByTripId(@Param("tripId") Long tripId);

    @Query("select m from TripMember m where m.id.tripId = :tripId and m.id.userId = :userId")
    Optional<TripMember> findMember(@Param("tripId") Long tripId, @Param("userId") Long userId);

    long countByIdTripId(Long tripId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from TripMember m where m.id.tripId = :tripId")
    void deleteAllByTripId(@Param("tripId") Long tripId);
}
