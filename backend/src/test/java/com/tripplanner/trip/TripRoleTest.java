package com.tripplanner.trip;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TripRoleTest {

    @Test
    void roleHierarchy() {
        assertThat(TripRole.OWNER.atLeast(TripRole.EDITOR)).isTrue();
        assertThat(TripRole.OWNER.atLeast(TripRole.OWNER)).isTrue();
        assertThat(TripRole.EDITOR.atLeast(TripRole.VIEWER)).isTrue();
        assertThat(TripRole.EDITOR.atLeast(TripRole.OWNER)).isFalse();
        assertThat(TripRole.VIEWER.atLeast(TripRole.EDITOR)).isFalse();
        assertThat(TripRole.VIEWER.atLeast(TripRole.VIEWER)).isTrue();
    }
}
