package com.tripplanner.itinerary.dto;

import java.util.List;

/** {@code colors}: các key trong bảng màu, theo thứ tự của bảng màu. */
public record DressCodeResponse(String theme, String note, String imageUrl, List<String> colors) {
}
