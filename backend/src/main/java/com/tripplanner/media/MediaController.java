package com.tripplanner.media;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.config.OpenApiConfig;
import com.tripplanner.media.dto.MediaResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/media")
@RequiredArgsConstructor
@Tag(name = "Media", description = "Upload ảnh từ thiết bị vào kho MinIO/S3")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class MediaController {

    private final MediaService mediaService;

    /** Thiếu file / purpose sai được báo VALIDATION_ERROR ở service (thay vì lỗi binding mặc định). */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Upload 1 ảnh JPG/PNG/WebP ≤ 10 MB; purpose = TRIP_COVER | AVATAR | DRESS_CODE")
    public MediaResponse upload(@AuthenticationPrincipal Jwt jwt,
                                @RequestParam(value = "file", required = false) MultipartFile file,
                                @RequestParam(value = "purpose", required = false) String purpose) {
        return mediaService.upload(CurrentUser.id(jwt), file, purpose);
    }
}
