package com.tripplanner.availability.dto;

import com.tripplanner.availability.AvailabilityStatus;
import java.time.LocalDate;

public record AvailabilityEntryResponse(Long userId, LocalDate date, AvailabilityStatus status) {
}
