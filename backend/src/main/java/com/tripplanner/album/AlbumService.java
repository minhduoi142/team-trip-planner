package com.tripplanner.album;

import com.tripplanner.album.dto.AlbumDtos.AddPhotosRequest;
import com.tripplanner.album.dto.AlbumDtos.AddPhotosResponse;
import com.tripplanner.album.dto.AlbumDtos.AlbumResponse;
import com.tripplanner.album.dto.AlbumDtos.PhotoResponse;
import com.tripplanner.album.dto.AlbumDtos.SkippedLink;
import com.tripplanner.album.dto.AlbumDtos.UpdatePhotoRequest;
import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripAccessService;
import com.tripplanner.trip.TripMember;
import com.tripplanner.trip.TripRole;
import com.tripplanner.tripday.TripDay;
import com.tripplanner.tripday.TripDayRepository;
import com.tripplanner.user.UserRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Album = link thư mục Drive chung + ảnh nổi bật dán link. Quyền: gắn thư mục EDITOR+; thêm ảnh mọi thành viên;
 * sửa/xóa ảnh: người thêm hoặc EDITOR+.
 */
@Service
@RequiredArgsConstructor
public class AlbumService {

    private static final String EMBED = "https://drive.google.com/embeddedfolderview?id=%s#grid";

    private final TripAccessService accessService;
    private final AlbumPhotoRepository photoRepository;
    private final AlbumPhotoDayRepository photoDayRepository;
    private final TripDayRepository dayRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public AlbumResponse get(Long tripId, Long userId) {
        TripMember me = accessService.require(tripId, userId, TripRole.VIEWER);
        return build(me.getTrip(), me);
    }

    @Transactional
    public AlbumResponse setFolder(Long tripId, Long userId, String url) {
        TripMember me = accessService.require(tripId, userId, TripRole.EDITOR);
        Trip trip = me.getTrip();
        if (!StringUtils.hasText(url)) {
            trip.setDriveFolderUrl(null);
        } else {
            DriveLinks.folderId(url).orElseThrow(() -> new BusinessException(ErrorCode.INVALID_DRIVE_LINK,
                    "Hãy dán link THƯ MỤC Google Drive (dạng drive.google.com/drive/folders/…)"));
            trip.setDriveFolderUrl(url.trim());
        }
        return build(trip, me);
    }

    /** Thêm nhiều link 1 lần; link sai/trùng thì bỏ qua và báo lại. */
    @Transactional
    public AddPhotosResponse addPhotos(Long tripId, Long userId, AddPhotosRequest request) {
        TripMember me = accessService.require(tripId, userId, TripRole.VIEWER);
        TripDay day = request.dayId() == null ? null : requireDayOfTrip(request.dayId(), tripId);
        Set<String> existing = new HashSet<>(photoRepository.findFileIdsByTripId(tripId));
        String caption = blankToNull(request.caption());

        List<SkippedLink> skipped = new ArrayList<>();
        int added = 0;
        for (String raw : request.links()) {
            String link = raw == null ? "" : raw.trim();
            if (link.isEmpty()) {
                continue;
            }
            String fileId = DriveLinks.fileId(link).orElse(null);
            if (fileId == null) {
                skipped.add(new SkippedLink(link, "INVALID"));
                continue;
            }
            if (!existing.add(fileId)) {
                skipped.add(new SkippedLink(link, "DUPLICATE"));
                continue;
            }
            AlbumPhoto photo = photoRepository.save(AlbumPhoto.builder()
                    .trip(me.getTrip())
                    .driveFileId(fileId)
                    .caption(caption)
                    .addedBy(userRepository.getReferenceById(userId))
                    .build());
            if (day != null) {
                photoDayRepository.save(new AlbumPhotoDay(photo, day));
            }
            added++;
        }
        photoRepository.flush();
        return new AddPhotosResponse(build(me.getTrip(), me), added, skipped);
    }

    @Transactional
    public AlbumResponse updatePhoto(Long photoId, Long userId, UpdatePhotoRequest request) {
        Access access = requireEditable(photoId, userId);
        AlbumPhoto photo = access.photo();
        photo.setCaption(blankToNull(request.caption()));
        photoDayRepository.findById(photoId).ifPresent(link -> {
            photoDayRepository.delete(link);
            photoDayRepository.flush();
        });
        if (request.dayId() != null) {
            photoDayRepository.save(new AlbumPhotoDay(photo, requireDayOfTrip(request.dayId(), access.tripId())));
        }
        photoDayRepository.flush();
        return build(access.me().getTrip(), access.me());
    }

    /** Chỉ xóa khỏi album; file trên Drive không bị ảnh hưởng. Gắn ngày tự xóa theo (CASCADE). */
    @Transactional
    public AlbumResponse deletePhoto(Long photoId, Long userId) {
        Access access = requireEditable(photoId, userId);
        photoDayRepository.findById(photoId).ifPresent(photoDayRepository::delete);
        photoRepository.delete(access.photo());
        photoRepository.flush();
        return build(access.me().getTrip(), access.me());
    }

    // ---------------------------------------------------------------- build

    private AlbumResponse build(Trip trip, TripMember me) {
        Long myId = me.getId().getUserId();
        boolean isEditor = me.getRole().atLeast(TripRole.EDITOR);
        List<AlbumPhoto> photos = photoRepository.findAllByTripId(trip.getId());
        Map<Long, TripDay> dayByPhoto = photos.isEmpty() ? Map.of()
                : photoDayRepository.findAllByPhotoIds(photos.stream().map(AlbumPhoto::getId).toList()).stream()
                        .collect(Collectors.toMap(AlbumPhotoDay::getPhotoId, AlbumPhotoDay::getTripDay));
        String folderId = trip.getDriveFolderUrl() == null ? null
                : DriveLinks.folderId(trip.getDriveFolderUrl()).orElse(null);

        List<PhotoResponse> rows = photos.stream().map(p -> {
            TripDay day = dayByPhoto.get(p.getId());
            boolean mine = p.getAddedBy() != null && p.getAddedBy().getId().equals(myId);
            return new PhotoResponse(p.getId(), p.getDriveFileId(), DriveLinks.viewUrl(p.getDriveFileId()),
                    DriveLinks.thumbnailUrl(p.getDriveFileId()), p.getCaption(),
                    day == null ? null : day.getId(), day == null ? null : day.getDayIndex(),
                    p.getAddedBy() == null ? null : p.getAddedBy().getDisplayName(), p.getCreatedAt(),
                    mine || isEditor);
        }).toList();
        return new AlbumResponse(trip.getDriveFolderUrl(), folderId,
                folderId == null ? null : EMBED.formatted(folderId), rows);
    }

    // ---------------------------------------------------------------- helpers

    private record Access(AlbumPhoto photo, Long tripId, TripMember me) {
    }

    private Access requireEditable(Long photoId, Long userId) {
        Long tripId = photoRepository.findTripIdByPhotoId(photoId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PHOTO_NOT_FOUND));
        TripMember me = accessService.require(tripId, userId, TripRole.VIEWER);
        AlbumPhoto photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PHOTO_NOT_FOUND));
        boolean mine = photo.getAddedBy() != null && photo.getAddedBy().getId().equals(userId);
        if (!mine && !me.getRole().atLeast(TripRole.EDITOR)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return new Access(photo, tripId, me);
    }

    private TripDay requireDayOfTrip(Long dayId, Long tripId) {
        Long dayTrip = dayRepository.findTripIdByDayId(dayId)
                .orElseThrow(() -> new BusinessException(ErrorCode.DAY_NOT_FOUND));
        if (!dayTrip.equals(tripId)) {
            throw new BusinessException(ErrorCode.DAY_NOT_FOUND);
        }
        return dayRepository.getReferenceById(dayId);
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
