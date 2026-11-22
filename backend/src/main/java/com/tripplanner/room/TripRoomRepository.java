package com.tripplanner.room;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripRoomRepository extends JpaRepository<TripRoom, Long> {

    @Query("select r from TripRoom r where r.trip.id = :tripId order by r.createdAt asc, r.id asc")
    List<TripRoom> findAllByTripId(@Param("tripId") Long tripId);

    @Query("select r.trip.id from TripRoom r where r.id = :roomId")
    Optional<Long> findTripIdByRoomId(@Param("roomId") Long roomId);
}
