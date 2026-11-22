package com.tripplanner.proposal;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProposalVoteRepository extends JpaRepository<ProposalVote, ProposalVoteId> {

    @Query("""
            select v from ProposalVote v
            where v.id.proposalId in (select p.id from TripProposal p where p.trip.id = :tripId)
            order by v.votedAt asc
            """)
    List<ProposalVote> findAllByTripId(@Param("tripId") Long tripId);

    /** Khi thành viên rời nhóm: xóa mọi tim của họ trong chuyến đó. */
    @Modifying(flushAutomatically = true)
    @Query("""
            delete from ProposalVote v where v.id.userId = :userId
            and v.id.proposalId in (select p.id from TripProposal p where p.trip.id = :tripId)
            """)
    void deleteAllForMemberInTrip(@Param("tripId") Long tripId, @Param("userId") Long userId);
}
