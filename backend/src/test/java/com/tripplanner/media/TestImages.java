package com.tripplanner.media;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** Ảnh thật (sinh bằng ImageIO) để test nhận diện + đọc kích thước. */
final class TestImages {

    private TestImages() {
    }

    static byte[] image(String format, int width, int height) {
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        img.getGraphics().setColor(Color.PINK);
        img.getGraphics().fillRect(0, 0, width, height);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            javax.imageio.ImageIO.write(img, format, out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Header WebP hợp lệ về magic bytes (đủ để nhận diện, không cần ảnh WebP thật). */
    static byte[] webpHeader() {
        byte[] bytes = new byte[32];
        System.arraycopy("RIFF".getBytes(StandardCharsets.US_ASCII), 0, bytes, 0, 4);
        System.arraycopy("WEBPVP8 ".getBytes(StandardCharsets.US_ASCII), 0, bytes, 8, 8);
        return bytes;
    }

    static byte[] pdf() {
        return "%PDF-1.7\n%âãÏÓ\n1 0 obj".getBytes(StandardCharsets.ISO_8859_1);
    }
}
