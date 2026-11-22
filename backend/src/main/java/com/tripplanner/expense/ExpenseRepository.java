package com.tripplanner.expense;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    @Query("select e from Expense e left join fetch e.createdBy where e.trip.id = :tripId")
    List<Expense> findAllByTripId(@Param("tripId") Long tripId);

    @Query("select e.trip.id from Expense e where e.id = :expenseId")
    Optional<Long> findTripIdByExpenseId(@Param("expenseId") Long expenseId);

    @Query("select count(e) > 0 from Expense e where e.trip.id = :tripId and e.paidBy.id = :userId")
    boolean existsPaidBy(@Param("tripId") Long tripId, @Param("userId") Long userId);

    /** Xóa trip: phải xóa trước trip_members (FK tổ hợp paid_by); shares tự xóa theo (CASCADE). */
    @Modifying(flushAutomatically = true)
    @Query("delete from Expense e where e.trip.id = :tripId")
    void deleteAllByTripId(@Param("tripId") Long tripId);
}
