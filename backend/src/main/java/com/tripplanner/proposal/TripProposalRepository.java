package com.tripplanner.proposal;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripProposalRepository extends JpaRepository<TripProposal, Long> {

    /** Kèm người tạo + hoạt động + ngày để dựng response không bị N+1. */
    @Query("""
            select p from TripProposal p
            left join fetch p.createdBy
            left join fetch p.itineraryItem i
            left join fetch i.tripDay
            where p.trip.id = :tripId
            """)
    List<TripProposal> findAllByTripId(@Param("tripId") Long tripId);

    @Query("select p.trip.id from TripProposal p where p.id = :proposalId")
    Optional<Long> findTripIdById(@Param("proposalId") Long proposalId);

    /** Khóa hàng khi đưa vào lịch trình: 2 người bấm cùng lúc không tạo ra 2 hoạt động. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from TripProposal p where p.id = :proposalId")
    Optional<TripProposal> findByIdForUpdate(@Param("proposalId") Long proposalId);
}
