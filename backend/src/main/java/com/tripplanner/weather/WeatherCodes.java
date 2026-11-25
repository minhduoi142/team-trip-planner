package com.tripplanner.weather;

/** Mã thời tiết WMO (Open-Meteo {@code weather_code}) → {@link Condition} + nhãn tiếng Việt. Thuần, có unit test. */
public final class WeatherCodes {

    private WeatherCodes() {
    }

    public static Condition condition(Integer code) {
        if (code == null) {
            return Condition.UNKNOWN;
        }
        return switch (code) {
            case 0 -> Condition.CLEAR;
            case 1, 2 -> Condition.PARTLY_CLOUDY;
            case 3 -> Condition.CLOUDY;
            case 45, 48 -> Condition.FOG;
            case 51, 53, 55, 56, 57 -> Condition.DRIZZLE;
            case 61, 63, 80, 81 -> Condition.RAIN;
            case 65, 66, 67, 82 -> Condition.HEAVY_RAIN;
            case 71, 73, 75, 77, 85, 86 -> Condition.SNOW;
            case 95, 96, 99 -> Condition.THUNDERSTORM;
            default -> Condition.UNKNOWN;
        };
    }

    public static String label(Integer code) {
        if (code == null) {
            return "Không rõ";
        }
        return switch (code) {
            case 0 -> "Trời quang";
            case 1 -> "Nắng, ít mây";
            case 2 -> "Có mây";
            case 3 -> "Nhiều mây";
            case 45, 48 -> "Sương mù";
            case 51 -> "Mưa phùn nhẹ";
            case 53 -> "Mưa phùn";
            case 55 -> "Mưa phùn dày";
            case 56, 57 -> "Mưa phùn lạnh";
            case 61 -> "Mưa nhẹ";
            case 63 -> "Mưa vừa";
            case 65 -> "Mưa to";
            case 66, 67 -> "Mưa lạnh";
            case 71 -> "Tuyết nhẹ";
            case 73 -> "Có tuyết";
            case 75 -> "Tuyết dày";
            case 77 -> "Hạt tuyết";
            case 80 -> "Mưa rào nhẹ";
            case 81 -> "Mưa rào";
            case 82 -> "Mưa rào rất to";
            case 85, 86 -> "Mưa tuyết";
            case 95 -> "Dông";
            case 96, 99 -> "Dông kèm mưa đá";
            default -> "Không rõ";
        };
    }
}
