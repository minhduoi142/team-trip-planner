package com.tripplanner.expense;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripFundRepository extends JpaRepository<TripFund, Long> {

    @Query("select f from TripFund f join fetch f.treasurer where f.tripId = :tripId")
    Optional<TripFund> findWithTreasurer(@Param("tripId") Long tripId);

    /** Quỹ đã có giao dịch: có người nộp quỹ (mọi trạng thái) hoặc có khoản chi từ quỹ. */
    @Query("""
            select (count(s) > 0) from Settlement s
            where s.trip.id = :tripId and s.kind = com.tripplanner.expense.ExpenseEnums.SettlementKind.FUND
            """)
    boolean hasFundSettlements(@Param("tripId") Long tripId);

    @Query("select (count(e) > 0) from Expense e where e.trip.id = :tripId and e.fromFund = true")
    boolean hasFundExpenses(@Param("tripId") Long tripId);

    @Modifying(flushAutomatically = true)
    @Query("delete from TripFund f where f.tripId = :tripId")
    void deleteByTripId(@Param("tripId") Long tripId);
}
