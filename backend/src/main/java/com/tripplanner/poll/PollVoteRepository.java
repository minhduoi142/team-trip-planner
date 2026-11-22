package com.tripplanner.poll;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PollVoteRepository extends JpaRepository<PollVote, PollVoteId> {

    @Query("select v from PollVote v where v.id.optionId in :optionIds order by v.votedAt asc")
    List<PollVote> findAllByOptionIds(@Param("optionIds") Collection<Long> optionIds);

    /** Khi thành viên rời nhóm: xóa mọi phiếu của họ trong chuyến đó. */
    @Modifying(flushAutomatically = true)
    @Query("""
            delete from PollVote v where v.id.userId = :userId
            and v.id.optionId in (select o.id from PollOption o where o.poll.trip.id = :tripId)
            """)
    void deleteAllForMemberInTrip(@Param("tripId") Long tripId, @Param("userId") Long userId);
}
