package com.tripplanner.share;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

class CoverImageRendererTest {

    private final CoverImageRenderer renderer = new CoverImageRenderer();

    @Test
    void rendersReadable1200x630PngWithPresetColours() throws Exception {
        BufferedImage img = ImageIO.read(new ByteArrayInputStream(renderer.renderPng("lavender")));
        assertThat(img.getWidth()).isEqualTo(CoverImageRenderer.WIDTH);
        assertThat(img.getHeight()).isEqualTo(CoverImageRenderer.HEIGHT);
        // Góc trên-trái gần màu đầu của gradient (có lớp tròn trắng mờ phủ lên nên cho phép sai lệch)
        Color corner = new Color(img.getRGB(400, 5));
        Color expected = CoverImageRenderer.colorOf("lavender", 0);
        assertThat(Math.abs(corner.getBlue() - expected.getBlue())).isLessThan(60);
        assertThat(corner.getBlue()).isGreaterThan(corner.getGreen()); // tím: xanh dương > xanh lá
    }

    @Test
    void presetKeyFromCoverValueOrTripIdFallback() {
        assertThat(CoverImageRenderer.presetKey("preset:ocean", 1)).isEqualTo("ocean");
        assertThat(CoverImageRenderer.presetKey("preset:unknown", 2)).isEqualTo("lavender");
        assertThat(CoverImageRenderer.presetKey(null, 6)).isEqualTo("sunset");
        assertThat(CoverImageRenderer.presetKey("https://img/x.jpg", 1)).isEqualTo("ocean");
    }
}
