package com.tripplanner.checklist.dto;

import java.util.List;

/** Items sắp theo nhóm (thứ tự enum ChecklistCategory) rồi theo thời điểm tạo. */
public record ChecklistResponse(int total, int checked, int unassigned, List<ChecklistItemResponse> items) {
}
