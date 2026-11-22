package com.tripplanner.checklist;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChecklistRepository extends JpaRepository<ChecklistItem, Long> {

    @Query("select c from ChecklistItem c left join fetch c.assignee where c.trip.id = :tripId order by c.createdAt asc, c.id asc")
    List<ChecklistItem> findAllWithAssigneeByTripId(@Param("tripId") Long tripId);

    @Query("select c.trip.id from ChecklistItem c where c.id = :itemId")
    Optional<Long> findTripIdByItemId(@Param("itemId") Long itemId);

    long countByTripId(Long tripId);

    /** Trước khi xóa thành viên: bỏ giao + bỏ tick các món của họ (FK tổ hợp không CASCADE được). */
    @Modifying(flushAutomatically = true)
    @Query("update ChecklistItem c set c.assignee = null, c.checked = false where c.trip.id = :tripId and c.assignee.id = :userId")
    void unassignAllForMember(@Param("tripId") Long tripId, @Param("userId") Long userId);

    /** Trước khi xóa trip: xóa checklist trước trip_members (vì FK tổ hợp tới trip_members). */
    @Modifying(flushAutomatically = true)
    @Query("delete from ChecklistItem c where c.trip.id = :tripId")
    void deleteAllByTripId(@Param("tripId") Long tripId);
}
