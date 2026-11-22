package com.tripplanner.media;

/**
 * Kho lưu file chuẩn S3. Tách interface để test thay bằng bản giả và để Phase 5 đổi sang R2/S3
 * chỉ bằng cấu hình.
 */
public interface StorageService {

    /**
     * Lưu object (ghi đè nếu trùng key).
     *
     * @throws com.tripplanner.common.BusinessException STORAGE_UNAVAILABLE khi kho lỗi / chưa cấu hình
     */
    void put(String objectKey, byte[] content, String contentType);

    /** URL công khai để trình duyệt tải trực tiếp. */
    String publicUrl(String objectKey);
}
