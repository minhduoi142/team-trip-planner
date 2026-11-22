package com.tripplanner.media.dto;

/** {@code width}/{@code height} null với WebP (ImageIO mặc định không đọc được). */
public record MediaResponse(Long id, String url, String contentType, int sizeBytes, Integer width, Integer height) {
}
