package com.tripplanner.media;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.config.AppProperties;
import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.GetObjectResponse;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
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

    // ---------------------------------------------------------------- bucket riêng tư (giấy tờ)

    /** Đã kiểm/ tạo bucket riêng tư trong phiên chạy này chưa (tránh hỏi MinIO mỗi lần ghi). */
    private volatile boolean privateBucketReady;

    @Override
    public void putPrivate(String objectKey, byte[] content, String contentType) {
        MinioClient c = requireClient();
        try {
            ensurePrivateBucket(c);
            c.putObject(PutObjectArgs.builder()
                    .bucket(config.privateBucket())
                    .object(objectKey)
                    .stream(new ByteArrayInputStream(content), content.length, -1)
                    .contentType(contentType)
                    .build());
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Upload giấy tờ lên kho riêng tư thất bại (key={}): {}", objectKey, e.getMessage());
            throw new BusinessException(ErrorCode.STORAGE_UNAVAILABLE);
        }
    }

    @Override
    public StoredObject getPrivate(String objectKey) {
        MinioClient c = requireClient();
        try (GetObjectResponse response = c.getObject(GetObjectArgs.builder()
                .bucket(config.privateBucket())
                .object(objectKey)
                .build())) {
            String type = response.headers().get("Content-Type");
            return new StoredObject(response.readAllBytes(), type == null ? "application/octet-stream" : type);
        } catch (Exception e) {
            log.error("Đọc giấy tờ từ kho riêng tư thất bại (key={}): {}", objectKey, e.getMessage());
            throw new BusinessException(ErrorCode.STORAGE_UNAVAILABLE);
        }
    }

    @Override
    public void deletePrivate(String objectKey) {
        if (client == null) {
            return;
        }
        try {
            client.removeObject(RemoveObjectArgs.builder().bucket(config.privateBucket()).object(objectKey).build());
        } catch (Exception e) {
            log.warn("Xóa giấy tờ khỏi kho riêng tư thất bại (key={}): {}", objectKey, e.getMessage());
        }
    }

    private MinioClient requireClient() {
        if (client == null) {
            throw new BusinessException(ErrorCode.STORAGE_UNAVAILABLE, "Máy chủ chưa cấu hình kho lưu file");
        }
        return client;
    }

    /** Bucket mới tạo ở MinIO mặc định là riêng tư; tuyệt đối không đặt policy đọc công khai ở đây. */
    private void ensurePrivateBucket(MinioClient c) throws Exception {
        if (privateBucketReady) {
            return;
        }
        String bucket = config.privateBucket();
        if (!c.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())) {
            c.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            log.info("Đã tạo bucket riêng tư {}", bucket);
        }
        privateBucketReady = true;
    }
}
