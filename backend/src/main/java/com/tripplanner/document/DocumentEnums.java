package com.tripplanner.document;

import com.tripplanner.media.ImageType;
import java.util.Optional;

/** Enum của package document (gom 1 file). */
public final class DocumentEnums {

    private DocumentEnums() {
    }

    /** Thứ tự = thứ tự hiển thị chip trên form. */
    public enum Kind {
        FLIGHT, BUS_TRAIN, STAY, TICKET, INSURANCE, ID, OTHER;

        /** Giấy tờ tùy thân và bảo hiểm mặc định chỉ mình người tạo thấy (docs/sdd-trip-documents.md 1.2). */
        public boolean privateByDefault() {
            return this == ID || this == INSURANCE;
        }
    }

    /** SHARED: cả nhóm thấy; PRIVATE: chỉ người tạo thấy (kể cả OWNER cũng không). */
    public enum Visibility { SHARED, PRIVATE }

    /**
     * Loại file đính kèm, nhận diện bằng MAGIC BYTES. Tách riêng khỏi {@link ImageType} để upload ảnh bìa/avatar
     * không vô tình nhận PDF.
     */
    public enum FileType {
        JPEG("image/jpeg", "jpg"),
        PNG("image/png", "png"),
        WEBP("image/webp", "webp"),
        PDF("application/pdf", "pdf");

        private final String contentType;
        private final String extension;

        FileType(String contentType, String extension) {
            this.contentType = contentType;
            this.extension = extension;
        }

        public String contentType() {
            return contentType;
        }

        public String extension() {
            return extension;
        }

        public static Optional<FileType> detect(byte[] bytes) {
            if (bytes == null) {
                return Optional.empty();
            }
            if (bytes.length >= 5 && bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D' && bytes[3] == 'F'
                    && bytes[4] == '-') {
                return Optional.of(PDF);
            }
            return ImageType.detect(bytes).map(t -> switch (t) {
                case JPEG -> JPEG;
                case PNG -> PNG;
                case WEBP -> WEBP;
            });
        }

        /** Content type đã lưu → loại; null nếu lạ. */
        public static FileType fromContentType(String contentType) {
            for (FileType t : values()) {
                if (t.contentType.equals(contentType)) {
                    return t;
                }
            }
            return null;
        }
    }
}
