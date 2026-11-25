package com.tripplanner.weather;

/** Nhóm thời tiết suy ra từ mã WMO ({@link WeatherCodes}). FE map sang icon, email dùng {@link #emoji()}. */
public enum Condition {
    CLEAR("☀️"),
    PARTLY_CLOUDY("🌤️"),
    CLOUDY("☁️"),
    FOG("🌫️"),
    DRIZZLE("🌦️"),
    RAIN("🌧️"),
    HEAVY_RAIN("🌧️"),
    SNOW("❄️"),
    THUNDERSTORM("⛈️"),
    UNKNOWN("🌡️");

    private final String emoji;

    Condition(String emoji) {
        this.emoji = emoji;
    }

    public String emoji() {
        return emoji;
    }
}
