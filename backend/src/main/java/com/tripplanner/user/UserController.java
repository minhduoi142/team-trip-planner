package com.tripplanner.user;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.config.OpenApiConfig;
import com.tripplanner.user.dto.UpdateProfileRequest;
import com.tripplanner.user.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "Hồ sơ người dùng")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @Operation(summary = "Thông tin user hiện tại")
    public UserResponse me(@AuthenticationPrincipal Jwt jwt) {
        return userService.me(CurrentUser.id(jwt));
    }

    @PatchMapping("/me")
    @Operation(summary = "Sửa tên hiển thị / avatar")
    public UserResponse updateMe(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(CurrentUser.id(jwt), request);
    }
}
