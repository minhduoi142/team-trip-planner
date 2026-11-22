package com.tripplanner.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.support.IntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/** Kho lưu trữ được thay bằng mock; test MinIO thật ở MinioStorageServiceIT. */
class MediaIntegrationTest extends IntegrationTest {

    @MockitoBean
    private StorageService storage;

    @Autowired
    private MediaFileRepository mediaRepository;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = register("linh", "Linh");
        given(storage.publicUrl(anyString()))
                .willAnswer(inv -> "http://minio.test/trip-planner/" + inv.getArgument(0));
    }

    @Test
    void uploadsPngAndRecordsMetadata() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "anh.png", "image/png", TestImages.image("png", 40, 30));

        mvc.perform(auth(multipart("/api/v1/media").file(file).param("purpose", "TRIP_COVER"), token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contentType").value("image/png"))
                .andExpect(jsonPath("$.width").value(40))
                .andExpect(jsonPath("$.height").value(30))
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.matchesPattern(
                        "http://minio\\.test/trip-planner/cover/\\d{4}/\\d{2}/[0-9a-f-]{36}\\.png")));

        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        verify(storage).put(key.capture(), any(byte[].class), eq("image/png"));
        assertThat(mediaRepository.findAll()).singleElement()
                .satisfies(m -> {
                    assertThat(m.getObjectKey()).isEqualTo(key.getValue());
                    assertThat(m.getPurpose()).isEqualTo(MediaPurpose.TRIP_COVER);
                    assertThat(m.getUploadedBy()).isNotNull();
                });
    }

    @Test
    void contentTypeIsDetectedFromBytesNotFromClient() throws Exception {
        // Client nói là PNG nhưng thực ra là JPEG
        MockMultipartFile file = new MockMultipartFile("file", "x.png", "image/png", TestImages.image("jpg", 10, 10));
        mvc.perform(auth(multipart("/api/v1/media").file(file).param("purpose", "avatar"), token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contentType").value("image/jpeg"))
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.containsString("/avatar/")));
    }

    @Test
    void webpIsAcceptedWithoutDimensions() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "a.webp", "image/webp", TestImages.webpHeader());
        mvc.perform(auth(multipart("/api/v1/media").file(file).param("purpose", "DRESS_CODE"), token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contentType").value("image/webp"))
                .andExpect(jsonPath("$.width").value(org.hamcrest.Matchers.nullValue()));
    }

    @Test
    void rejectsFakeImage() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "hoadon.jpg", "image/jpeg", TestImages.pdf());
        mvc.perform(auth(multipart("/api/v1/media").file(file).param("purpose", "TRIP_COVER"), token))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));
        verify(storage, never()).put(anyString(), any(byte[].class), anyString());
    }

    @Test
    void rejectsTooLargeFile() throws Exception {
        byte[] big = new byte[(int) MediaService.MAX_BYTES + 1];
        big[0] = (byte) 0xFF;
        big[1] = (byte) 0xD8;
        big[2] = (byte) 0xFF;
        MockMultipartFile file = new MockMultipartFile("file", "big.jpg", "image/jpeg", big);
        mvc.perform(auth(multipart("/api/v1/media").file(file).param("purpose", "TRIP_COVER"), token))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.code").value("FILE_TOO_LARGE"));
    }

    @Test
    void validationErrors() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "a.png", "image/png", TestImages.image("png", 4, 4));
        mvc.perform(auth(multipart("/api/v1/media").file(file).param("purpose", "ALBUM"), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mvc.perform(auth(multipart("/api/v1/media").param("purpose", "TRIP_COVER"), token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void requiresLogin() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "a.png", "image/png", TestImages.image("png", 4, 4));
        mvc.perform(multipart("/api/v1/media").file(file).param("purpose", "TRIP_COVER"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void storageDownGives503AndNoMetadata() throws Exception {
        willThrow(new BusinessException(ErrorCode.STORAGE_UNAVAILABLE))
                .given(storage).put(anyString(), any(byte[].class), anyString());
        MockMultipartFile file = new MockMultipartFile("file", "a.png", "image/png", TestImages.image("png", 4, 4));
        mvc.perform(auth(multipart("/api/v1/media").file(file).param("purpose", "TRIP_COVER"), token))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("STORAGE_UNAVAILABLE"));
        assertThat(mediaRepository.count()).isZero();
    }
}
