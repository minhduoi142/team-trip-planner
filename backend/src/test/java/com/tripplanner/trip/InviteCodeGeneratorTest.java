package com.tripplanner.trip;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class InviteCodeGeneratorTest {

    private final InviteCodeGenerator generator = new InviteCodeGenerator();

    @Test
    void generatesCodesOfFixedLengthFromUnambiguousAlphabet() {
        for (int i = 0; i < 500; i++) {
            String code = generator.generate();
            assertThat(code).hasSize(InviteCodeGenerator.LENGTH);
            assertThat(code.chars()).allMatch(c -> InviteCodeGenerator.ALPHABET.indexOf(c) >= 0);
            assertThat(code).doesNotContain("0", "O", "1", "I", "L");
        }
    }

    @Test
    void codesAreRandom() {
        Set<String> codes = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            codes.add(generator.generate());
        }
        assertThat(codes).hasSizeGreaterThan(995);
    }

    @Test
    void normalizeTrimsAndUppercases() {
        assertThat(InviteCodeGenerator.normalize("  k7mp4qxt ")).isEqualTo("K7MP4QXT");
        assertThat(InviteCodeGenerator.normalize(null)).isEmpty();
    }
}
