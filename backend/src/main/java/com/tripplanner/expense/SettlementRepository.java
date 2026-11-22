package com.tripplanner.expense;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    @Query("select s from Settlement s where s.trip.id = :tripId order by s.createdAt desc, s.id desc")
    List<Settlement> findAllByTripId(@Param("tripId") Long tripId);

    @Query("select s.trip.id from Settlement s where s.id = :id")
    Optional<Long> findTripIdById(@Param("id") Long id);

    @Query("""
            select count(s) > 0 from Settlement s
            where s.trip.id = :tripId and (s.fromUser.id = :userId or s.toUser.id = :userId)
            """)
    boolean existsForMember(@Param("tripId") Long tripId, @Param("userId") Long userId);

    @Modifying(flushAutomatically = true)
    @Query("delete from Settlement s where s.trip.id = :tripId")
    void deleteAllByTripId(@Param("tripId") Long tripId);
}
