package com.tripplanner.itinerary;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/**
 * Đặt 1 item vào danh sách của ngày theo quy tắc "kéo thả + tự chèn theo giờ" (SDD Phase 3 mục 4).
 * Class thuần, generic để unit test không cần entity.
 */
public final class ItineraryOrdering {

    private ItineraryOrdering() {
    }

    /**
     * @param items    danh sách hiện tại theo thứ tự (có thể đã chứa {@code target})
     * @param target   item cần đặt
     * @param timeOf   lấy giờ bắt đầu (null = không có giờ)
     * @param keepSlotIfUntimed true khi SỬA item không có giờ: giữ vị trí cũ; false khi THÊM: đặt cuối
     * @return danh sách mới (caller đánh lại sort_order theo vị trí)
     */
    public static <T> List<T> place(List<T> items, T target, Function<T, LocalTime> timeOf, boolean keepSlotIfUntimed) {
        List<T> result = new ArrayList<>(items);
        int oldIndex = result.indexOf(target);
        if (oldIndex >= 0) {
            result.remove(oldIndex);
        }

        LocalTime time = timeOf.apply(target);
        if (time == null) {
            if (keepSlotIfUntimed && oldIndex >= 0) {
                result.add(oldIndex, target);
            } else {
                result.add(target);
            }
            return result;
        }

        for (int i = 0; i < result.size(); i++) {
            LocalTime other = timeOf.apply(result.get(i));
            if (other != null && other.isAfter(time)) {
                result.add(i, target);
                return result;
            }
        }
        // Không có item nào giờ muộn hơn: đặt cuối danh sách
        result.add(target);
        return result;
    }

    /** Có cặp item có giờ nằm ngược thứ tự (dùng cho cảnh báo nhẹ, FE tính tương tự). */
    public static <T> boolean isTimeOrderBroken(List<T> items, Function<T, LocalTime> timeOf) {
        LocalTime previous = null;
        for (T item : items) {
            LocalTime time = timeOf.apply(item);
            if (time == null) {
                continue;
            }
            if (previous != null && time.isBefore(previous)) {
                return true;
            }
            previous = time;
        }
        return false;
    }
}
