package com.tripplanner.availability;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Gợi ý các khoảng {@code length} ngày liên tiếp có nhiều người đi được nhất. Class thuần, không
 * phụ thuộc Spring, để unit test.
 *
 * <ul>
 *   <li>Rảnh trọn: mọi ngày AVAILABLE → 2 điểm</li>
 *   <li>Có thể: mọi ngày ∈ {AVAILABLE, MAYBE}, có ít nhất 1 MAYBE → 1 điểm</li>
 *   <li>BUSY hoặc chưa khai bất kỳ ngày nào → không đi được</li>
 * </ul>
 * Xếp hạng: điểm ↓, rảnh trọn ↓, ngày bắt đầu ↑; chọn tối đa {@value #MAX_SUGGESTIONS} khoảng không chồng nhau.
 */
public final class AvailabilitySuggester {

    public static final int MAX_SUGGESTIONS = 3;

    public enum Note { NO_RESPONSES, RANGE_TOO_SHORT, NO_MATCH }

    public record Window(
            LocalDate startDate,
            LocalDate endDate,
            List<Long> availableUserIds,
            List<Long> maybeUserIds,
            List<Long> unavailableUserIds) {

        int score() {
            return 2 * availableUserIds.size() + maybeUserIds.size();
        }

        boolean overlaps(Window other) {
            return !endDate.isBefore(other.startDate) && !other.endDate.isBefore(startDate);
        }
    }

    public record Result(List<Window> suggestions, Note note) {
    }

    private AvailabilitySuggester() {
    }

    /**
     * @param days     các ngày đủ điều kiện, liên tục và tăng dần (đã bỏ ngày quá khứ)
     * @param length   số ngày muốn đi (≥ 1)
     * @param memberIds toàn bộ thành viên, theo thứ tự hiển thị
     * @param statuses userId → (ngày → trạng thái); thiếu = chưa khai
     */
    public static Result suggest(List<LocalDate> days, int length, List<Long> memberIds,
                                 Map<Long, Map<LocalDate, AvailabilityStatus>> statuses) {
        boolean anyResponse = statuses.values().stream().anyMatch(m -> !m.isEmpty());
        if (!anyResponse) {
            return new Result(List.of(), Note.NO_RESPONSES);
        }
        if (days.size() < length) {
            return new Result(List.of(), Note.RANGE_TOO_SHORT);
        }

        List<Window> candidates = new ArrayList<>();
        for (int start = 0; start + length <= days.size(); start++) {
            List<LocalDate> window = days.subList(start, start + length);
            List<Long> available = new ArrayList<>();
            List<Long> maybe = new ArrayList<>();
            List<Long> unavailable = new ArrayList<>();
            for (Long userId : memberIds) {
                switch (classify(window, statuses.getOrDefault(userId, Map.of()))) {
                    case AVAILABLE -> available.add(userId);
                    case MAYBE -> maybe.add(userId);
                    default -> unavailable.add(userId);
                }
            }
            Window w = new Window(window.getFirst(), window.getLast(), available, maybe, unavailable);
            if (w.score() > 0) {
                candidates.add(w);
            }
        }

        candidates.sort(Comparator.comparingInt(Window::score).reversed()
                .thenComparing(w -> w.availableUserIds().size(), Comparator.reverseOrder())
                .thenComparing(Window::startDate));

        List<Window> picked = new ArrayList<>();
        for (Window candidate : candidates) {
            if (picked.size() == MAX_SUGGESTIONS) {
                break;
            }
            if (picked.stream().noneMatch(candidate::overlaps)) {
                picked.add(candidate);
            }
        }
        return new Result(picked, picked.isEmpty() ? Note.NO_MATCH : null);
    }

    /** AVAILABLE = rảnh trọn, MAYBE = có thể, BUSY = không đi được (gồm cả chưa khai). */
    private static AvailabilityStatus classify(List<LocalDate> window, Map<LocalDate, AvailabilityStatus> byDate) {
        boolean hasMaybe = false;
        for (LocalDate date : window) {
            AvailabilityStatus status = byDate.get(date);
            if (status == null || status == AvailabilityStatus.BUSY) {
                return AvailabilityStatus.BUSY;
            }
            hasMaybe |= status == AvailabilityStatus.MAYBE;
        }
        return hasMaybe ? AvailabilityStatus.MAYBE : AvailabilityStatus.AVAILABLE;
    }
}
