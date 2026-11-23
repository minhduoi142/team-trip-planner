package com.tripplanner.media;

import static org.assertj.core.api.Assertions.assertThat;

import com.tripplanner.config.AppProperties;
import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/**
 * Test với MinIO THẬT (docker compose up -d). Chỉ chạy khi có MINIO_TEST_ENDPOINT,
 * MINIO_TEST_ACCESS_KEY, MINIO_TEST_SECRET_KEY; bucket (mặc định trip-planner) phải đã bật đọc công khai.
 */
@EnabledIfEnvironmentVariable(named = "MINIO_TEST_ENDPOINT", matches = ".+",
        disabledReason = "Chưa đặt MINIO_TEST_ENDPOINT: bỏ qua test với MinIO thật")
class MinioStorageServiceRealTest {

    @Test
    void putThenDownloadThroughPublicUrl() throws Exception {
        String endpoint = System.getenv("MINIO_TEST_ENDPOINT");
        String accessKey = System.getenv("MINIO_TEST_ACCESS_KEY");
        String secretKey = System.getenv("MINIO_TEST_SECRET_KEY");
        String bucket = System.getenv().getOrDefault("MINIO_TEST_BUCKET", "trip-planner");
        AppProperties properties = new AppProperties(null, null, null, null, "Asia/Ho_Chi_Minh",
                new AppProperties.Storage(endpoint, accessKey, secretKey, bucket, endpoint), null, null);
        MinioStorageService storage = new MinioStorageService(properties);

        byte[] png = TestImages.image("png", 12, 12);
        String key = "test/" + UUID.randomUUID() + ".png";
        storage.put(key, png, "image/png");
        try {
            HttpResponse<byte[]> response = HttpClient.newHttpClient().send(
                    HttpRequest.newBuilder(URI.create(storage.publicUrl(key))).GET().build(),
                    HttpResponse.BodyHandlers.ofByteArray());
            assertThat(response.statusCode()).isEqualTo(200);
            assertThat(response.body()).isEqualTo(png);
            assertThat(response.headers().firstValue("Content-Type")).contains("image/png");
            assertThat(response.headers().firstValue("Cache-Control")).hasValueSatisfying(v -> assertThat(v).contains("immutable"));
        } finally {
            MinioClient.builder().endpoint(endpoint).credentials(accessKey, secretKey).build()
                    .removeObject(RemoveObjectArgs.builder().bucket(bucket).object(key).build());
        }
    }
}
