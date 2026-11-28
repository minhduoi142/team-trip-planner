package com.tripplanner.document;

import static org.assertj.core.api.Assertions.assertThat;

import com.tripplanner.document.DocumentEnums.FileType;
import com.tripplanner.document.DocumentEnums.Kind;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class DocumentFileTest {

    @Test
    void detectsPdfAndImagesByMagicBytes() {
        assertThat(FileType.detect("%PDF-1.7\n...".getBytes(StandardCharsets.US_ASCII))).contains(FileType.PDF);
        assertThat(FileType.detect(new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0})).contains(FileType.JPEG);
        assertThat(FileType.detect("<html>%PDF-</html>".getBytes(StandardCharsets.US_ASCII))).isEmpty();
        assertThat(FileType.detect("%PDF".getBytes(StandardCharsets.US_ASCII))).isEmpty();   // thiếu "-"
        assertThat(FileType.detect(null)).isEmpty();
        assertThat(FileType.fromContentType("application/pdf")).isEqualTo(FileType.PDF);
        assertThat(FileType.fromContentType("text/html")).isNull();
    }

    @Test
    void fileNameDropsPathAndControlCharacters() {
        assertThat(DocumentService.fileName("C:\\Users\\an\\Vé máy bay.pdf", FileType.PDF)).isEqualTo("Vé máy bay.pdf");
        assertThat(DocumentService.fileName("../../etc/passwd\"\n.png", FileType.PNG)).isEqualTo("passwd.png");
        assertThat(DocumentService.fileName("   ", FileType.JPEG)).isEqualTo("giay-to.jpg");
        assertThat(DocumentService.fileName(null, FileType.PDF)).isEqualTo("giay-to.pdf");
        assertThat(DocumentService.fileName("a".repeat(200) + ".pdf", FileType.PDF)).hasSize(150).endsWith(".pdf");
    }

    @Test
    void idAndInsuranceArePrivateByDefault() {
        assertThat(Kind.ID.privateByDefault()).isTrue();
        assertThat(Kind.INSURANCE.privateByDefault()).isTrue();
        assertThat(Kind.FLIGHT.privateByDefault()).isFalse();
        assertThat(Kind.STAY.privateByDefault()).isFalse();
    }
}
