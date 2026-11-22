package com.tripplanner.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "google_sub", unique = true)
    private String googleSub;

    @Column(name = "email", unique = true)
    private String email;

    @Column(name = "username", unique = true, length = 30)
    private String username;

    @Column(name = "password_hash", length = 100)
    private String passwordHash;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "avatar_url", length = 1000)
    private String avatarUrl;

    /** Tài khoản nhận tiền (VietQR): 3 trường cùng có hoặc cùng null (CHECK ở DB). Tên ngân hàng suy ra từ BIN. */
    @Column(name = "bank_bin", columnDefinition = "CHAR(6)")
    private String bankBin;

    @Column(name = "bank_account_no", length = 19)
    private String bankAccountNo;

    /** In hoa, không dấu (chuẩn QR/ngân hàng). */
    @Column(name = "bank_account_name", length = 50)
    private String bankAccountName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
