package com.tripplanner.packing;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class PackingNamesTest {

    @Test
    void ignoresAccentsCaseAndExtraSpaces() {
        assertThat(PackingNames.key("Kem chống nắng")).isEqualTo("kem chong nang");
        assertThat(PackingNames.key("  KEM   chong NẮNG ")).isEqualTo("kem chong nang");
        assertThat(PackingNames.key("Đồ bơi")).isEqualTo("do boi");
        assertThat(PackingNames.key("đồ BƠI")).isEqualTo("do boi");
        assertThat(PackingNames.key("Sạc dự phòng")).isEqualTo(PackingNames.key("sac du phong"));
        assertThat(PackingNames.key(null)).isEmpty();
    }

    @Test
    void differentWordsStayDifferent() {
        assertThat(PackingNames.key("Son")).isNotEqualTo(PackingNames.key("Sơn dưỡng"));
        assertThat(PackingNames.key("Son dưỡng")).isNotEqualTo(PackingNames.key("Son"));
    }

    @Test
    void templatesAreWellFormed() {
        assertThat(PackingTemplates.ALL).extracting(PackingTemplates.Template::key)
                .containsExactly("ESSENTIALS", "BEAUTY", "PHOTO", "BEACH", "COLD", "HEALTH");
        for (PackingTemplates.Template t : PackingTemplates.ALL) {
            assertThat(t.label()).isNotBlank();
            assertThat(t.items()).isNotEmpty();
            Set<String> keys = new HashSet<>();
            for (PackingTemplates.Item item : t.items()) {
                assertThat(item.itemName()).isNotBlank().hasSizeLessThanOrEqualTo(150);
                assertThat(item.quantity()).isBetween(1, 99);
                assertThat(keys.add(PackingNames.key(item.itemName()))).as("trùng trong mẫu %s: %s", t.key(),
                        item.itemName()).isTrue();
            }
        }
        assertThat(PackingTemplates.find("beauty")).isPresent();
        assertThat(PackingTemplates.find("KHONG_CO")).isEmpty();
    }
}
