package com.tripplanner.document.dto;

import com.tripplanner.document.DocumentEnums.Kind;
import com.tripplanner.document.DocumentEnums.Visibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

/** DTO (record) của package document (docs/sdd-trip-documents.md 3.2), gom 1 file. */
public final class DocumentDtos {

    private DocumentDtos() {
    }

    /**
     * Gửi đủ trường (sửa = thay toàn bộ). {@code startsAt}/{@code endsAt}: giờ địa phương nơi đến dạng
     * "yyyy-MM-ddTHH:mm", không múi giờ; endsAt ≥ startsAt (kiểm ở service).
     */
    public record DocumentRequest(
            @NotNull(message = "Chọn loại giấy tờ") Kind kind,
            @NotBlank(message = "Nhập tên giấy tờ") @Size(max = 150, message = "Tên tối đa 150 ký tự") String title,
            @Size(max = 50, message = "Mã đặt chỗ tối đa 50 ký tự") String bookingCode,
            LocalDateTime startsAt,
            LocalDateTime endsAt,
            @Size(max = 150, message = "Địa điểm tối đa 150 ký tự") String place,
            @Size(max = 100, message = "Tên người liên hệ tối đa 100 ký tự") String contactName,
            @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
            @Pattern(regexp = "^$|^[0-9+()\\-. ]+$", message = "Số điện thoại chỉ gồm chữ số và + - . ( )")
            String contactPhone,
            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String note,
            @NotNull(message = "Chọn ai được xem") Visibility visibility) {
    }

    /** Thông tin file, KHÔNG có URL: FE tải qua GET /documents/{id}/file (cần đăng nhập + quyền xem). */
    public record FileInfo(String type, String name, int size) {
    }

    /** {@code mine}: mình tạo; {@code canEdit}: SHARED → người tạo hoặc OWNER, PRIVATE → chỉ người tạo. */
    public record DocumentResponse(
            Long id,
            Kind kind,
            String title,
            String bookingCode,
            LocalDateTime startsAt,
            LocalDateTime endsAt,
            String place,
            String contactName,
            String contactPhone,
            String note,
            Visibility visibility,
            FileInfo file,
            String createdByName,
            boolean mine,
            boolean canEdit,
            Instant updatedAt) {
    }

    /** Có giờ trước (startsAt tăng dần), không giờ xếp sau (theo lúc tạo). */
    public record DocumentListResponse(List<DocumentResponse> documents) {
    }
}
