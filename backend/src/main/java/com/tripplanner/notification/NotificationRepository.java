package com.tripplanner.notification;

import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /** Dọn rác: các dòng đã xong (SENT/SKIPPED/CANCELLED) quá hạn giữ, FAILED giữ lâu hơn để tra lỗi. */
    @Modifying
    @Query("""
            delete from Notification n
            where (n.status in (com.tripplanner.notification.NotificationStatus.SENT,
                                com.tripplanner.notification.NotificationStatus.SKIPPED,
                                com.tripplanner.notification.NotificationStatus.CANCELLED)
                   and n.updatedAt < :doneBefore)
               or (n.status = com.tripplanner.notification.NotificationStatus.FAILED and n.updatedAt < :failedBefore)
            """)
    int deleteFinishedBefore(@Param("doneBefore") Instant doneBefore, @Param("failedBefore") Instant failedBefore);
}
