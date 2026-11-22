package com.tripplanner.poll;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PollOptionRepository extends JpaRepository<PollOption, Long> {

    @Query("""
            select o from PollOption o left join fetch o.createdBy
            where o.poll.id in :pollIds order by o.createdAt asc, o.id asc
            """)
    List<PollOption> findAllByPollIds(@Param("pollIds") Collection<Long> pollIds);

    @Query("select o.poll.trip.id from PollOption o where o.id = :optionId")
    Optional<Long> findTripIdByOptionId(@Param("optionId") Long optionId);
}
