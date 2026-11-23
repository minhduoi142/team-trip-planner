package com.tripplanner.notification.mail;

import static org.assertj.core.api.Assertions.assertThat;

import com.tripplanner.tripday.TripDayDressColor;
import org.junit.jupiter.api.Test;

class DressColorStylesTest {

    /** Bảng màu email phải phủ đủ khoá của TripDayDressColor.PALETTE (đồng bộ lib/dressColors.ts). */
    @Test
    void coversWholePalette() {
        assertThat(DressColorStyles.all().keySet()).containsExactlyInAnyOrderElementsOf(TripDayDressColor.PALETTE);
        assertThat(DressColorStyles.of("khong-co").label()).isEqualTo("khong-co");
    }
}
