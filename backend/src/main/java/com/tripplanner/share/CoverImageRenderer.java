package com.tripplanner.share;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.LinearGradientPaint;
import java.awt.RenderingHints;
import java.awt.geom.Ellipse2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Component;

/**
 * Vẽ ảnh xem trước 1200×630 cho ảnh bìa dạng preset (gradient). Màu khớp lib/covers.ts ở FE (màu Tailwind).
 * Không vẽ chữ để không phụ thuộc font tiếng Việt trên server. Chạy headless (Spring Boot mặc định).
 */
@Component
public class CoverImageRenderer {

    public static final int WIDTH = 1200;
    public static final int HEIGHT = 630;

    /** Thứ tự = COVER_PRESETS ở FE (dùng cho ảnh mặc định theo trip id). */
    static final List<String> PRESET_ORDER = List.of("sunset", "ocean", "lavender", "tropical", "mountain", "forest");

    private static final Map<String, Color[]> PRESETS = Map.of(
            "sunset", colors(0xfda4af, 0xfed7aa, 0xfde68a),     // rose-300 → orange-200 → amber-200
            "ocean", colors(0x7dd3fc, 0xa5f3fc, 0x99f6e4),      // sky-300 → cyan-200 → teal-200
            "lavender", colors(0xc4b5fd, 0xf5d0fe, 0xfbcfe8),   // violet-300 → fuchsia-200 → pink-200
            "tropical", colors(0x6ee7b7, 0xd9f99d, 0xfef08a),   // emerald-300 → lime-200 → yellow-200
            "mountain", colors(0xa5b4fc, 0xbae6fd, 0xf1f5f9),   // indigo-300 → sky-200 → slate-100
            "forest", colors(0x2dd4bf, 0xa7f3d0, 0xdcfce7));    // teal-400 → emerald-200 → green-100

    /** Key preset từ giá trị cover ("preset:ocean"); không hợp lệ / null → theo trip id như FE. */
    public static String presetKey(String coverValue, long tripId) {
        if (coverValue != null && coverValue.startsWith("preset:")) {
            String key = coverValue.substring("preset:".length());
            if (PRESETS.containsKey(key)) {
                return key;
            }
        }
        return PRESET_ORDER.get((int) Math.floorMod(tripId, PRESET_ORDER.size()));
    }

    public byte[] renderPng(String presetKey) {
        Color[] c = PRESETS.getOrDefault(presetKey, PRESETS.get("sunset"));
        BufferedImage image = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            // Gradient chéo (giống bg-gradient-to-br)
            g.setPaint(new LinearGradientPaint(0, 0, WIDTH, HEIGHT, new float[] {0f, 0.5f, 1f}, c));
            g.fillRect(0, 0, WIDTH, HEIGHT);
            // Vài vòng tròn mờ cho đỡ trống
            g.setColor(new Color(255, 255, 255, 70));
            g.fill(new Ellipse2D.Double(WIDTH - 420, HEIGHT - 360, 560, 560));
            g.setColor(new Color(255, 255, 255, 45));
            g.fill(new Ellipse2D.Double(-160, -200, 520, 520));
        } finally {
            g.dispose();
        }
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    static Color colorOf(String presetKey, int index) {
        return PRESETS.get(presetKey)[index];
    }

    private static Color[] colors(int... rgb) {
        Color[] result = new Color[rgb.length];
        for (int i = 0; i < rgb.length; i++) {
            result[i] = new Color(rgb[i]);
        }
        return result;
    }
}
