package com.tripplanner.album;

import com.tripplanner.album.dto.AlbumDtos.AddPhotosRequest;
import com.tripplanner.album.dto.AlbumDtos.AddPhotosResponse;
import com.tripplanner.album.dto.AlbumDtos.AlbumResponse;
import com.tripplanner.album.dto.AlbumDtos.SetFolderRequest;
import com.tripplanner.album.dto.AlbumDtos.UpdatePhotoRequest;
import com.tripplanner.auth.CurrentUser;
import com.tripplanner.config.OpenApiConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Album", description = "Thư mục Drive chung + ảnh nổi bật (link Drive)")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class AlbumController {

    private final AlbumService albumService;

    @GetMapping("/trips/{tripId}/album")
    @Operation(summary = "Album của chuyến (thành viên)")
    public AlbumResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        return albumService.get(tripId, CurrentUser.id(jwt));
    }

    @PutMapping("/trips/{tripId}/album/folder")
    @Operation(summary = "Gắn/đổi/gỡ link thư mục Drive chung (EDITOR+)")
    public AlbumResponse setFolder(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                   @Valid @RequestBody SetFolderRequest request) {
        return albumService.setFolder(tripId, CurrentUser.id(jwt), request.url());
    }

    @PostMapping("/trips/{tripId}/album/photos")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Thêm ảnh/video bằng link Drive, nhiều link 1 lần (mọi thành viên)")
    public AddPhotosResponse addPhotos(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                       @Valid @RequestBody AddPhotosRequest request) {
        return albumService.addPhotos(tripId, CurrentUser.id(jwt), request);
    }

    @PatchMapping("/album-photos/{photoId}")
    @Operation(summary = "Sửa chú thích / ngày gắn (người thêm / EDITOR+)")
    public AlbumResponse updatePhoto(@AuthenticationPrincipal Jwt jwt, @PathVariable Long photoId,
                                     @Valid @RequestBody UpdatePhotoRequest request) {
        return albumService.updatePhoto(photoId, CurrentUser.id(jwt), request);
    }

    @DeleteMapping("/album-photos/{photoId}")
    @Operation(summary = "Xóa khỏi album, file trên Drive giữ nguyên (người thêm / EDITOR+)")
    public AlbumResponse deletePhoto(@AuthenticationPrincipal Jwt jwt, @PathVariable Long photoId) {
        return albumService.deletePhoto(photoId, CurrentUser.id(jwt));
    }
}
