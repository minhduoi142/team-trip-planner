package com.tripplanner.poll;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PollRepository extends JpaRepository<Poll, Long> {

    @Query("select p from Poll p left join fetch p.createdBy where p.trip.id = :tripId order by p.createdAt desc")
    List<Poll> findAllByTripId(@Param("tripId") Long tripId);

    @Query("select p.trip.id from Poll p where p.id = :pollId")
    Optional<Long> findTripIdByPollId(@Param("pollId") Long pollId);
}
