package com.tripplanner.room.dto;

import com.tripplanner.trip.dto.MemberPreview;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/** DTO (record) của package room, gom 1 file. */
public final class RoomDtos {

    private RoomDtos() {
    }

    /** {@code capacity} null = không giới hạn. */
    public record RoomRequest(
            @NotBlank(message = "Tên phòng không được để trống")
            @Size(max = 100, message = "Tên phòng tối đa 100 ký tự")
            String name,

            @Min(value = 1, message = "Sức chứa từ 1 đến 30")
            @Max(value = 30, message = "Sức chứa từ 1 đến 30")
            Integer capacity,

            @Size(max = 300, message = "Ghi chú tối đa 300 ký tự")
            String note) {
    }

    public record RoomResponse(Long id, String name, Integer capacity, String note, List<MemberPreview> members) {
    }

    /** {@code unassigned}: thành viên chưa có phòng. */
    public record RoomListResponse(List<RoomResponse> rooms, List<MemberPreview> unassigned) {
    }
}
