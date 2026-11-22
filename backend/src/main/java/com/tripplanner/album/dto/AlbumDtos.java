package com.tripplanner.album.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

/** DTO (record) của package album, gom 1 file. */
public final class AlbumDtos {

    private AlbumDtos() {
    }

    /** {@code url} rỗng/null = gỡ link thư mục. */
    public record SetFolderRequest(@Size(max = 2000, message = "Link quá dài") String url) {
    }

    public record AddPhotosRequest(
            @NotEmpty(message = "Dán ít nhất 1 link")
            @Size(max = 50, message = "Tối đa 50 link mỗi lần")
            List<String> links,
            Long dayId,
            @Size(max = 300, message = "Chú thích tối đa 300 ký tự") String caption) {
    }

    /** Sửa chú thích + ngày gắn; null = xóa chú thích / bỏ gắn ngày. */
    public record UpdatePhotoRequest(
            @Size(max = 300, message = "Chú thích tối đa 300 ký tự") String caption,
            Long dayId) {
    }

    public record PhotoResponse(
            Long id,
            String driveFileId,
            String viewUrl,
            String thumbnailUrl,
            String caption,
            Long dayId,
            Integer dayIndex,
            String addedByName,
            Instant createdAt,
            boolean canEdit) {
    }

    /** Ảnh mới nhất trước. {@code folderEmbedUrl} null nếu chưa gắn thư mục. */
    public record AlbumResponse(
            String folderUrl,
            String folderId,
            String folderEmbedUrl,
            List<PhotoResponse> photos) {
    }

    /** {@code reason}: INVALID (không phải link file Drive) | DUPLICATE (đã có trong album). */
    public record SkippedLink(String link, String reason) {
    }

    public record AddPhotosResponse(AlbumResponse album, int added, List<SkippedLink> skipped) {
    }
}
