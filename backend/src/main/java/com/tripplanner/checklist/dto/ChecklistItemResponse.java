package com.tripplanner.checklist.dto;

import com.tripplanner.checklist.ChecklistCategory;
import com.tripplanner.checklist.ChecklistItem;
import com.tripplanner.trip.dto.MemberPreview;
import java.time.Instant;

/** {@code assignee} null = chưa ai nhận. */
public record ChecklistItemResponse(
        Long id,
        ChecklistCategory category,
        String itemName,
        int quantity,
        MemberPreview assignee,
        boolean checked,
        Instant createdAt) {

    public static ChecklistItemResponse from(ChecklistItem item) {
        return new ChecklistItemResponse(item.getId(), item.getCategory(), item.getItemName(), item.getQuantity(),
                item.getAssignee() == null ? null : MemberPreview.from(item.getAssignee()),
                item.isChecked(), item.getCreatedAt());
    }
}
