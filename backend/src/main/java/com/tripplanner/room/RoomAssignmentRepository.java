package com.tripplanner.room;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoomAssignmentRepository extends JpaRepository<RoomAssignment, RoomAssignmentId> {

    @Query("select a from RoomAssignment a where a.id.roomId in :roomIds order by a.assignedAt asc")
    List<RoomAssignment> findAllByRoomIds(@Param("roomIds") Collection<Long> roomIds);

    long countByIdRoomId(Long roomId);

    /** Phòng hiện tại của 1 người trong chuyến (tối đa 1 — bất biến do service giữ). */
    @Query("""
            select a from RoomAssignment a where a.id.userId = :userId
            and a.id.roomId in (select r.id from TripRoom r where r.trip.id = :tripId)
            """)
    Optional<RoomAssignment> findForMemberInTrip(@Param("tripId") Long tripId, @Param("userId") Long userId);

    /** Khi thành viên rời nhóm. */
    @Modifying(flushAutomatically = true)
    @Query("""
            delete from RoomAssignment a where a.id.userId = :userId
            and a.id.roomId in (select r.id from TripRoom r where r.trip.id = :tripId)
            """)
    void deleteAllForMemberInTrip(@Param("tripId") Long tripId, @Param("userId") Long userId);
}
