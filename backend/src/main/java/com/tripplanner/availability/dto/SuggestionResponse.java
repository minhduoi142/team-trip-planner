package com.tripplanner.availability.dto;

import com.tripplanner.availability.AvailabilitySuggester;
import java.time.LocalDate;
import java.util.List;

public record SuggestionResponse(
        LocalDate startDate,
        LocalDate endDate,
        int availableCount,
        int maybeCount,
        int totalMembers,
        List<Long> availableUserIds,
        List<Long> maybeUserIds,
        List<Long> unavailableUserIds) {

    public static SuggestionResponse from(AvailabilitySuggester.Window w, int totalMembers) {
        return new SuggestionResponse(w.startDate(), w.endDate(), w.availableUserIds().size(),
                w.maybeUserIds().size(), totalMembers, w.availableUserIds(), w.maybeUserIds(),
                w.unavailableUserIds());
    }
}
