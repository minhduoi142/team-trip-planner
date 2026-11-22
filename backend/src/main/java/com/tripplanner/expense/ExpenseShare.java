package com.tripplanner.expense;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.domain.Persistable;

/**
 * Phần 1 người phải chịu trong 1 khoản chi. Không lưu trip_id (suy ra qua expense): "phải là thành viên" do
 * service kiểm tra. Bất biến: tổng các phần = expenses.amount.
 */
@Entity
@Table(name = "expense_shares")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExpenseShare implements Persistable<ExpenseShareId> {

    @Transient
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private boolean isNew = true;

    @EmbeddedId
    private ExpenseShareId id;

    @Column(name = "amount", nullable = false)
    private Long amount;

    public ExpenseShare(Long expenseId, Long userId, Long amount) {
        this.id = new ExpenseShareId(expenseId, userId);
        this.amount = amount;
    }

    @PostPersist
    @PostLoad
    void markNotNew() {
        this.isNew = false;
    }

    @Override
    public boolean isNew() {
        return isNew;
    }
}
