package com.tripplanner.availability.dto;

import java.time.LocalDate;

public record DaySummaryResponse(LocalDate date, int available, int maybe, int busy, int unknown) {
}
