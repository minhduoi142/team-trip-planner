package com.tripplanner.media;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.config.AppProperties;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import java.io.ByteArrayInputStream;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Lưu ảnh vào MinIO (hoặc kho chuẩn S3 bất kỳ). Bucket được tạo + bật đọc công khai bởi
 * docker-compose (minio-init); service này không tự đổi policy để tránh mở quyền ngoài ý muốn.
 */
@Slf4j
@Service
public class MinioStorageService implements StorageService {

    /** Key chứa UUID nên nội dung không bao giờ đổi → cache lâu dài. */
    private static final String CACHE_CONTROL = "public, max-age=31536000, immutable";

    private final AppProperties.Storage config;
    private final MinioClient client;

    public MinioStorageService(AppProperties properties) {
        this.config = properties.storage();
        this.client = config != null && config.isConfigured()
                ? MinioClient.builder()
                        .endpoint(config.endpoint())
                        .credentials(config.accessKey(), config.secretKey())
                        .build()
                : null;
        if (client == null) {
            log.warn("Chưa cấu hình MINIO_ENDPOINT: chức năng upload ảnh sẽ trả 503");
        }
    }

    @Override
    public void put(String objectKey, byte[] content, String contentType) {
        if (client == null) {
            throw new BusinessException(ErrorCode.STORAGE_UNAVAILABLE, "Máy chủ chưa cấu hình kho lưu ảnh");
        }
        try {
            client.putObject(PutObjectArgs.builder()
                    .bucket(config.bucket())
                    .object(objectKey)
                    .stream(new ByteArrayInputStream(content), content.length, -1)
                    .contentType(contentType)
                    .headers(Map.of("Cache-Control", CACHE_CONTROL))
                    .build());
        } catch (Exception e) {
            log.error("Upload lên kho ảnh thất bại (key={}): {}", objectKey, e.getMessage());
            throw new BusinessException(ErrorCode.STORAGE_UNAVAILABLE);
        }
    }

    @Override
    public String publicUrl(String objectKey) {
        return config.effectivePublicUrl() + "/" + config.bucket() + "/" + objectKey;
    }
}
