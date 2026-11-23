package com.tripplanner.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Email nhận thông báo đang chờ xác minh (tối đa 1 / user). Chỉ lưu SHA-256 của token. */
@Entity
@Table(name = "email_verifications")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailVerification {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "email", nullable = false, length = 254)
    private String email;

    @Column(name = "token_hash", nullable = false, unique = true, columnDefinition = "CHAR(64)")
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "last_sent_at", nullable = false)
    private Instant lastSentAt;

    @Column(name = "send_date", nullable = false)
    private LocalDate sendDate;

    @Column(name = "send_count", nullable = false, columnDefinition = "TINYINT")
    private Integer sendCount;

    public boolean isExpired(Instant now) {
        return !expiresAt.isAfter(now);
    }
}
