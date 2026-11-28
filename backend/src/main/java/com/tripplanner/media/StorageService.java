package com.tripplanner.media;

/**
 * Kho lưu file chuẩn S3. Tách interface để test thay bằng bản giả và để Phase 5 đổi sang R2/S3
 * chỉ bằng cấu hình.
 * <p>Hai bucket: bucket chính đọc công khai (ảnh bìa, avatar…), và bucket <b>riêng tư</b> cho giấy tờ chuyến đi
 * (docs/sdd-trip-documents.md): object riêng tư không bao giờ có URL công khai, chỉ backend đọc rồi trả về sau khi
 * kiểm quyền.
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

    /** Lưu vào bucket riêng tư (tự tạo bucket nếu chưa có, không bật đọc công khai). */
    void putPrivate(String objectKey, byte[] content, String contentType);

    /** Đọc object riêng tư. @throws com.tripplanner.common.BusinessException STORAGE_UNAVAILABLE */
    StoredObject getPrivate(String objectKey);

    /** Xóa object riêng tư; không có thì thôi. */
    void deletePrivate(String objectKey);

    record StoredObject(byte[] content, String contentType) {
    }
}
