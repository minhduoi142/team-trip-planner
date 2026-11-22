package com.tripplanner.expense;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExpenseShareRepository extends JpaRepository<ExpenseShare, ExpenseShareId> {

    @Query("select s from ExpenseShare s where s.id.expenseId in :expenseIds")
    List<ExpenseShare> findAllByExpenseIds(@Param("expenseIds") Collection<Long> expenseIds);

    /** Thay toàn bộ phần chia khi sửa khoản chi (clear để không đụng entity cũ cùng khóa). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from ExpenseShare s where s.id.expenseId = :expenseId")
    void deleteAllByExpenseId(@Param("expenseId") Long expenseId);

    @Query("""
            select count(s) > 0 from ExpenseShare s where s.id.userId = :userId
            and s.id.expenseId in (select e.id from Expense e where e.trip.id = :tripId)
            """)
    boolean existsForMember(@Param("tripId") Long tripId, @Param("userId") Long userId);
}
