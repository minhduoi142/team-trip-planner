package com.tripplanner.document;

import com.tripplanner.document.DocumentEnums.Kind;
import com.tripplanner.document.DocumentEnums.Visibility;
import com.tripplanner.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Một giấy tờ trong ví của chuyến (docs/sdd-trip-documents.md). {@code startsAt}/{@code endsAt} là giờ địa phương nơi
 * đến, không múi giờ (cột DATETIME), không đổi theo hibernate.jdbc.time_zone vì là LocalDateTime.
 * File (nếu có) nằm ở bucket riêng tư: 4 cột file đủ cả hoặc không có.
 */
@Entity
@Table(name = "trip_documents")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false, updatable = false)
    private Long tripId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "kind", nullable = false, length = 20)
    private Kind kind;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "booking_code", length = 50)
    private String bookingCode;

    /*
     * Giờ địa phương nơi đến, lưu NGUYÊN (không đổi múi giờ). LOCAL_DATE_TIME bind thẳng LocalDateTime cho JDBC, bỏ qua
     * hibernate.jdbc.time_zone=UTC (cái đó chỉ dành cho Instant): nếu không, 08:00 bị lưu thành 01:00 và đổi theo
     * múi giờ của JVM.
     */
    @JdbcTypeCode(SqlTypes.LOCAL_DATE_TIME)
    @Column(name = "starts_at", columnDefinition = "DATETIME")
    private LocalDateTime startsAt;

    @JdbcTypeCode(SqlTypes.LOCAL_DATE_TIME)
    @Column(name = "ends_at", columnDefinition = "DATETIME")
    private LocalDateTime endsAt;

    @Column(name = "place", length = 150)
    private String place;

    @Column(name = "contact_name", length = 100)
    private String contactName;

    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @Column(name = "note", length = 500)
    private String note;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "visibility", nullable = false, length = 10)
    private Visibility visibility;

    @Column(name = "file_key", length = 200)
    private String fileKey;

    @Column(name = "file_type", length = 50)
    private String fileType;

    @Column(name = "file_name", length = 150)
    private String fileName;

    @Column(name = "file_size")
    private Integer fileSize;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public boolean isCreatedBy(Long userId) {
        return createdBy != null && createdBy.getId().equals(userId);
    }

    public void clearFile() {
        fileKey = null;
        fileType = null;
        fileName = null;
        fileSize = null;
    }
}
