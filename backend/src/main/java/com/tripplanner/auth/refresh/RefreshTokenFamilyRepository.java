package com.tripplanner.auth.refresh;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenFamilyRepository extends JpaRepository<RefreshTokenFamily, Long> {

    /** Khóa hàng họ: các lần xoay trong cùng họ chạy tuần tự (2 tab refresh cùng lúc). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from RefreshTokenFamily f join fetch f.user where f.id = :id")
    Optional<RefreshTokenFamily> findByIdForUpdate(@Param("id") Long id);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            update RefreshTokenFamily f set f.revokedAt = :now, f.revokeReason = :reason
            where f.user.id = :userId and f.revokedAt is null
            """)
    int revokeAllForUser(@Param("userId") Long userId, @Param("reason") RevokeReason reason, @Param("now") Instant now);

    /** Dọn rác: họ đã thu hồi lâu, hoặc đã quá hạn tuyệt đối. Token xóa theo (CASCADE ở DB). */
    @Modifying
    @Query("delete from RefreshTokenFamily f where f.revokedAt < :revokedBefore or f.createdAt < :createdBefore")
    int deleteStale(@Param("revokedBefore") Instant revokedBefore, @Param("createdBefore") Instant createdBefore);
}
