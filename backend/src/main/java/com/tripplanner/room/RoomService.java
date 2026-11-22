package com.tripplanner.room;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.room.dto.RoomDtos.RoomListResponse;
import com.tripplanner.room.dto.RoomDtos.RoomRequest;
import com.tripplanner.room.dto.RoomDtos.RoomResponse;
import com.tripplanner.trip.TripAccessService;
import com.tripplanner.trip.TripMember;
import com.tripplanner.trip.TripMemberRepository;
import com.tripplanner.trip.TripRole;
import com.tripplanner.trip.dto.MemberPreview;
import com.tripplanner.user.User;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Quyền: tạo/sửa/xóa phòng EDITOR+; vào/ra phòng: chính mình (mọi thành viên) hoặc EDITOR+ xếp hộ.
 * Bất biến giữ ở đây: mỗi người ≤ 1 phòng/chuyến, không vượt sức chứa, người được xếp là thành viên.
 */
@Service
@RequiredArgsConstructor
public class RoomService {

    private final TripAccessService accessService;
    private final TripMemberRepository memberRepository;
    private final TripRoomRepository roomRepository;
    private final RoomAssignmentRepository assignmentRepository;

    @Transactional(readOnly = true)
    public RoomListResponse list(Long tripId, Long userId) {
        accessService.require(tripId, userId, TripRole.VIEWER);
        return build(tripId);
    }

    @Transactional
    public RoomListResponse create(Long tripId, Long userId, RoomRequest request) {
        TripMember me = accessService.require(tripId, userId, TripRole.EDITOR);
        TripRoom room = TripRoom.builder().trip(me.getTrip()).build();
        apply(room, request);
        saveUnique(room);
        return build(tripId);
    }

    @Transactional
    public RoomListResponse update(Long roomId, Long userId, RoomRequest request) {
        Access access = require(roomId, userId, TripRole.EDITOR);
        long occupants = assignmentRepository.countByIdRoomId(roomId);
        if (request.capacity() != null && request.capacity() < occupants) {
            throw new BusinessException(ErrorCode.ROOM_FULL,
                    "Phòng đang có " + occupants + " người, không giảm sức chứa xuống " + request.capacity() + " được");
        }
        apply(access.room(), request);
        saveUnique(access.room());
        return build(access.tripId());
    }

    /** Người trong phòng về "chưa có phòng" (xếp phòng tự xóa theo bằng CASCADE). */
    @Transactional
    public RoomListResponse delete(Long roomId, Long userId) {
        Access access = require(roomId, userId, TripRole.EDITOR);
        roomRepository.delete(access.room());
        roomRepository.flush();
        return build(access.tripId());
    }

    /** Vào phòng; đang ở phòng khác cùng chuyến thì tự chuyển sang. */
    @Transactional
    public RoomListResponse assign(Long roomId, Long targetUserId, Long actorId) {
        Access access = require(roomId, actorId, TripRole.VIEWER);
        requireSelfOrEditor(access.me(), targetUserId);
        if (memberRepository.findMember(access.tripId(), targetUserId).isEmpty()) {
            throw new BusinessException(ErrorCode.NOT_A_MEMBER);
        }
        RoomAssignment current = assignmentRepository.findForMemberInTrip(access.tripId(), targetUserId).orElse(null);
        if (current != null && current.getId().getRoomId().equals(roomId)) {
            return build(access.tripId()); // đã ở phòng này
        }
        Integer capacity = access.room().getCapacity();
        if (capacity != null && assignmentRepository.countByIdRoomId(roomId) >= capacity) {
            throw new BusinessException(ErrorCode.ROOM_FULL);
        }
        if (current != null) {
            assignmentRepository.delete(current);
            assignmentRepository.flush();
        }
        assignmentRepository.saveAndFlush(new RoomAssignment(roomId, targetUserId));
        return build(access.tripId());
    }

    @Transactional
    public RoomListResponse unassign(Long roomId, Long targetUserId, Long actorId) {
        Access access = require(roomId, actorId, TripRole.VIEWER);
        requireSelfOrEditor(access.me(), targetUserId);
        assignmentRepository.findById(new RoomAssignmentId(roomId, targetUserId))
                .ifPresent(assignmentRepository::delete);
        assignmentRepository.flush();
        return build(access.tripId());
    }

    // ---------------------------------------------------------------- build

    private RoomListResponse build(Long tripId) {
        List<TripMember> members = memberRepository.findAllWithUserByTripId(tripId);
        Map<Long, User> usersById = members.stream()
                .collect(Collectors.toMap(m -> m.getUser().getId(), TripMember::getUser));
        List<TripRoom> rooms = roomRepository.findAllByTripId(tripId);
        Map<Long, List<Long>> userIdsByRoom = rooms.isEmpty() ? Map.of()
                : assignmentRepository.findAllByRoomIds(rooms.stream().map(TripRoom::getId).toList()).stream()
                        .collect(Collectors.groupingBy(a -> a.getId().getRoomId(),
                                Collectors.mapping(a -> a.getId().getUserId(), Collectors.toList())));

        Set<Long> assigned = new HashSet<>();
        List<RoomResponse> roomRows = rooms.stream().map(room -> {
            List<MemberPreview> occupants = userIdsByRoom.getOrDefault(room.getId(), List.of()).stream()
                    .map(usersById::get)
                    .filter(Objects::nonNull)
                    .map(MemberPreview::from)
                    .toList();
            occupants.forEach(m -> assigned.add(m.userId()));
            return new RoomResponse(room.getId(), room.getName(), room.getCapacity(), room.getNote(), occupants);
        }).toList();
        List<MemberPreview> unassigned = members.stream()
                .map(TripMember::getUser)
                .filter(u -> !assigned.contains(u.getId()))
                .map(MemberPreview::from)
                .toList();
        return new RoomListResponse(roomRows, unassigned);
    }

    // ---------------------------------------------------------------- helpers

    private void apply(TripRoom room, RoomRequest request) {
        room.setName(request.name().trim());
        room.setCapacity(request.capacity());
        room.setNote(StringUtils.hasText(request.note()) ? request.note().trim() : null);
    }

    private void saveUnique(TripRoom room) {
        try {
            roomRepository.saveAndFlush(room);
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(ErrorCode.DUPLICATE_ROOM);
        }
    }

    private static void requireSelfOrEditor(TripMember me, Long targetUserId) {
        if (!me.getId().getUserId().equals(targetUserId) && !me.getRole().atLeast(TripRole.EDITOR)) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Bạn chỉ tự xếp phòng cho mình được");
        }
    }

    private record Access(TripRoom room, Long tripId, TripMember me) {
    }

    private Access require(Long roomId, Long userId, TripRole minRole) {
        Long tripId = roomRepository.findTripIdByRoomId(roomId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));
        TripMember me = accessService.require(tripId, userId, minRole);
        TripRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));
        return new Access(room, tripId, me);
    }
}
