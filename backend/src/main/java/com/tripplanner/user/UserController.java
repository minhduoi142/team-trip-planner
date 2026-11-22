package com.tripplanner.user;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.auth.dto.GoogleLoginRequest;
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
import com.tripplanner.bank.BankAccountRequest;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
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

    @PutMapping("/me/bank")
    @Operation(summary = "Lưu tài khoản nhận tiền (để người khác quét VietQR chuyển cho mình)")
    public UserResponse setBank(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody BankAccountRequest request) {
        return userService.setBankAccount(CurrentUser.id(jwt), request);
    }

    @DeleteMapping("/me/bank")
    @Operation(summary = "Xóa tài khoản nhận tiền")
    public UserResponse clearBank(@AuthenticationPrincipal Jwt jwt) {
        return userService.clearBankAccount(CurrentUser.id(jwt));
    }

    @PatchMapping("/me")
    @Operation(summary = "Sửa tên hiển thị / avatar")
    public UserResponse updateMe(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(CurrentUser.id(jwt), request);
    }

    @PutMapping("/me/google")
    @Operation(summary = "Liên kết tài khoản Google vào tài khoản hiện tại (gửi Google ID token)")
    public UserResponse linkGoogle(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody GoogleLoginRequest request) {
        return userService.linkGoogle(CurrentUser.id(jwt), request.idToken());
    }

    @DeleteMapping("/me/google")
    @Operation(summary = "Hủy liên kết Google (chỉ khi tài khoản còn mật khẩu)")
    public UserResponse unlinkGoogle(@AuthenticationPrincipal Jwt jwt) {
        return userService.unlinkGoogle(CurrentUser.id(jwt));
    }
}
