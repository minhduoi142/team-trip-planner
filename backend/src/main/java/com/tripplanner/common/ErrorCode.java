package com.tripplanner.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "Dữ liệu không hợp lệ"),
    BAD_REQUEST(HttpStatus.BAD_REQUEST, "Yêu cầu không hợp lệ"),
    INVALID_DATE_RANGE(HttpStatus.BAD_REQUEST, "Khoảng ngày không hợp lệ"),
    INVALID_ROLE(HttpStatus.BAD_REQUEST, "Quyền không hợp lệ"),
    INVALID_TRANSFER(HttpStatus.BAD_REQUEST, "Không thể chuyển quyền trưởng nhóm cho chính mình"),

    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập để tiếp tục"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Sai tên đăng nhập hoặc mật khẩu"),
    INVALID_GOOGLE_TOKEN(HttpStatus.UNAUTHORIZED, "Đăng nhập Google không hợp lệ hoặc đã hết hạn"),

    FORBIDDEN(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này"),
    NOT_TRIP_MEMBER(HttpStatus.FORBIDDEN, "Bạn không phải thành viên của chuyến đi này"),

    NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy tài nguyên"),
    TRIP_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến đi"),
    INVITE_NOT_FOUND(HttpStatus.NOT_FOUND, "Mã mời không tồn tại hoặc đã được thay đổi"),
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy thành viên trong chuyến đi"),

    CONFLICT(HttpStatus.CONFLICT, "Dữ liệu bị trùng hoặc xung đột, vui lòng thử lại"),
    USERNAME_TAKEN(HttpStatus.CONFLICT, "Tên đăng nhập đã có người dùng"),
    OWNER_CANNOT_LEAVE(HttpStatus.CONFLICT, "Trưởng nhóm cần chuyển quyền cho người khác trước khi rời nhóm"),
    CANNOT_CHANGE_OWNER_ROLE(HttpStatus.CONFLICT, "Không thể đổi quyền của trưởng nhóm, hãy dùng chức năng chuyển quyền"),

    GOOGLE_LOGIN_NOT_CONFIGURED(HttpStatus.SERVICE_UNAVAILABLE, "Đăng nhập Google chưa được cấu hình trên máy chủ"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Có lỗi xảy ra, vui lòng thử lại sau");

    private final HttpStatus status;
    private final String defaultMessage;

    ErrorCode(HttpStatus status, String defaultMessage) {
        this.status = status;
        this.defaultMessage = defaultMessage;
    }

    public static ErrorCode fromStatus(int status) {
        return switch (status) {
            case 400 -> BAD_REQUEST;
            case 401 -> UNAUTHORIZED;
            case 403 -> FORBIDDEN;
            case 404 -> NOT_FOUND;
            case 409 -> CONFLICT;
            default -> status >= 500 ? INTERNAL_ERROR : BAD_REQUEST;
        };
    }
}
