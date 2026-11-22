package com.tripplanner.media;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ImageTypeTest {

    @Test
    void detectsRealImagesByMagicBytes() {
        assertThat(ImageType.detect(TestImages.image("jpg", 8, 8))).contains(ImageType.JPEG);
        assertThat(ImageType.detect(TestImages.image("png", 8, 8))).contains(ImageType.PNG);
        assertThat(ImageType.detect(TestImages.webpHeader())).contains(ImageType.WEBP);
    }

    @Test
    void rejectsNonImagesEvenWithImageExtension() {
        assertThat(ImageType.detect(TestImages.pdf())).isEmpty();
        assertThat(ImageType.detect("GIF89a....".getBytes())).isEmpty();
        assertThat(ImageType.detect(new byte[0])).isEmpty();
        assertThat(ImageType.detect(new byte[] {(byte) 0xFF, (byte) 0xD8})).isEmpty();
        assertThat(ImageType.detect(null)).isEmpty();
        // RIFF nhưng không phải WEBP (vd file WAV)
        byte[] wav = TestImages.webpHeader();
        wav[8] = 'W';
        wav[9] = 'A';
        wav[10] = 'V';
        wav[11] = 'E';
        assertThat(ImageType.detect(wav)).isEmpty();
    }
}
