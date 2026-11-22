package com.tripplanner.trip.dto;

import com.tripplanner.trip.TripRole;

public record JoinTripResponse(Long tripId, TripRole role, boolean alreadyMember) {
}
