package com.tripplanner.media;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.media.dto.MediaResponse;
import com.tripplanner.user.UserRepository;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Iterator;
import java.util.Locale;
import java.util.UUID;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class MediaService {

    /** Phòng hờ: giới hạn multipart của servlet đã chặn ở 10 MB, kiểm lại ở đây (MockMvc không qua servlet). */
    static final long MAX_BYTES = 10L * 1024 * 1024;

    private final StorageService storage;
    private final MediaFileRepository mediaRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    @Transactional
    public MediaResponse upload(Long userId, MultipartFile file, String purposeValue) {
        MediaPurpose purpose = parsePurpose(purposeValue);
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Chưa chọn ảnh");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BusinessException(ErrorCode.FILE_TOO_LARGE);
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Không đọc được file ảnh");
        }
        ImageType type = ImageType.detect(bytes)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNSUPPORTED_MEDIA_TYPE));

        LocalDate today = LocalDate.now(clock);
        String key = "%s/%d/%02d/%s.%s".formatted(purpose.getFolder(), today.getYear(), today.getMonthValue(),
                UUID.randomUUID(), type.getExtension());

        storage.put(key, bytes, type.getContentType());

        int[] size = readDimensions(bytes, type);
        MediaFile media = mediaRepository.save(MediaFile.builder()
                .objectKey(key)
                .purpose(purpose)
                .contentType(type.getContentType())
                .sizeBytes(bytes.length)
                .width(size == null ? null : size[0])
                .height(size == null ? null : size[1])
                .uploadedBy(userRepository.getReferenceById(userId))
                .build());
        return new MediaResponse(media.getId(), storage.publicUrl(key), media.getContentType(), media.getSizeBytes(),
                media.getWidth(), media.getHeight());
    }

    private static MediaPurpose parsePurpose(String value) {
        try {
            return MediaPurpose.valueOf(value == null ? "" : value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Loại ảnh (purpose) không hợp lệ");
        }
    }

    /** Đọc kích thước từ header ảnh (không giải nén toàn bộ ảnh); null nếu không đọc được (vd WebP). */
    private static int[] readDimensions(byte[] bytes, ImageType type) {
        if (type == ImageType.WEBP) {
            return null;
        }
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                return null;
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                return new int[] {reader.getWidth(0), reader.getHeight(0)};
            } finally {
                reader.dispose();
            }
        } catch (IOException | RuntimeException e) {
            log.debug("Không đọc được kích thước ảnh: {}", e.getMessage());
            return null;
        }
    }
}
