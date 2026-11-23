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
    DATE_OUT_OF_RANGE(HttpStatus.BAD_REQUEST, "Có ngày nằm ngoài khoảng ngày dự kiến của chuyến đi"),
    INVALID_TRIP_LENGTH(HttpStatus.BAD_REQUEST, "Số ngày đi phải từ 1 đến 14"),
    INVALID_ORDER(HttpStatus.BAD_REQUEST, "Thứ tự hoạt động không hợp lệ, hãy tải lại trang"),
    INVALID_DRESS_COLOR(HttpStatus.BAD_REQUEST, "Màu không hợp lệ hoặc chọn quá 4 màu"),
    ASSIGNEE_NOT_MEMBER(HttpStatus.BAD_REQUEST, "Người được giao không ở trong nhóm"),
    INVALID_SPLIT(HttpStatus.BAD_REQUEST, "Cách chia tiền không hợp lệ"),
    NOT_A_MEMBER(HttpStatus.BAD_REQUEST, "Có người không ở trong nhóm"),
    INVALID_BANK_ACCOUNT(HttpStatus.BAD_REQUEST, "Thông tin tài khoản ngân hàng không hợp lệ"),
    INVALID_SETTLEMENT(HttpStatus.BAD_REQUEST, "Thao tác thanh toán không hợp lệ"),
    INVALID_DRIVE_LINK(HttpStatus.BAD_REQUEST, "Link không phải link Google Drive hợp lệ"),

    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập để tiếp tục"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Sai tên đăng nhập hoặc mật khẩu"),
    INVALID_GOOGLE_TOKEN(HttpStatus.UNAUTHORIZED, "Đăng nhập Google không hợp lệ hoặc đã hết hạn"),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"),
    REFRESH_TOKEN_STALE(HttpStatus.UNAUTHORIZED, "Phiên vừa được làm mới ở tab khác, vui lòng thử lại"),
    REFRESH_TOKEN_REUSED(HttpStatus.UNAUTHORIZED, "Phát hiện phiên đăng nhập bất thường. Để bảo vệ tài khoản, bạn cần đăng nhập lại"),

    FORBIDDEN(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này"),
    NOT_TRIP_MEMBER(HttpStatus.FORBIDDEN, "Bạn không phải thành viên của chuyến đi này"),

    NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy tài nguyên"),
    TRIP_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến đi"),
    INVITE_NOT_FOUND(HttpStatus.NOT_FOUND, "Mã mời không tồn tại hoặc đã được thay đổi"),
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy thành viên trong chuyến đi"),
    DAY_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy ngày đi"),
    ITEM_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy hoạt động"),
    CHECKLIST_ITEM_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy món trong danh sách chuẩn bị"),
    POLL_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy bình chọn"),
    OPTION_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy lựa chọn"),
    EXPENSE_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy khoản chi"),
    SETTLEMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy giao dịch thanh toán"),
    PHOTO_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy ảnh trong album"),
    ROOM_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy phòng"),
    PROPOSAL_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy đề xuất"),

    CONFLICT(HttpStatus.CONFLICT, "Dữ liệu bị trùng hoặc xung đột, vui lòng thử lại"),
    USERNAME_TAKEN(HttpStatus.CONFLICT, "Tên đăng nhập đã có người dùng"),
    OWNER_CANNOT_LEAVE(HttpStatus.CONFLICT, "Trưởng nhóm cần chuyển quyền cho người khác trước khi rời nhóm"),
    CANNOT_CHANGE_OWNER_ROLE(HttpStatus.CONFLICT, "Không thể đổi quyền của trưởng nhóm, hãy dùng chức năng chuyển quyền"),
    NO_PLANNED_RANGE(HttpStatus.CONFLICT, "Chuyến đi chưa có khoảng ngày dự kiến"),
    AVAILABILITY_LOCKED(HttpStatus.CONFLICT, "Chuyến đi đã chốt ngày, không sửa lịch rảnh được nữa"),
    ALREADY_LOCKED(HttpStatus.CONFLICT, "Chuyến đi đã chốt ngày rồi, hãy mở lại khảo sát trước"),
    NOT_LOCKED(HttpStatus.CONFLICT, "Chuyến đi chưa chốt ngày"),
    ALREADY_CLAIMED(HttpStatus.CONFLICT, "Món này đã có người nhận mang rồi"),
    DAY_NOT_OVERFLOW(HttpStatus.CONFLICT, "Chỉ xóa được các ngày nằm ngoài số ngày đã chốt"),
    POLL_CLOSED(HttpStatus.CONFLICT, "Bình chọn đã chốt, không thay đổi được nữa"),
    DUPLICATE_OPTION(HttpStatus.CONFLICT, "Lựa chọn này đã có trong bình chọn"),
    ROOM_FULL(HttpStatus.CONFLICT, "Phòng đã đủ người"),
    DUPLICATE_ROOM(HttpStatus.CONFLICT, "Đã có phòng trùng tên trong chuyến"),
    PROPOSAL_ALREADY_SCHEDULED(HttpStatus.CONFLICT, "Đề xuất này đã được đưa vào lịch trình"),
    GOOGLE_ALREADY_LINKED(HttpStatus.CONFLICT, "Tài khoản Google này đã gắn với một tài khoản khác trong hệ thống"),
    GOOGLE_UNLINK_NOT_ALLOWED(HttpStatus.CONFLICT, "Tài khoản chỉ đăng nhập bằng Google nên không hủy liên kết được"),
    MEMBER_HAS_EXPENSES(HttpStatus.CONFLICT, "Thành viên còn khoản chi hoặc thanh toán trong chuyến, hãy xử lý xong trước"),

    FILE_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "Ảnh quá lớn, tối đa 10 MB"),
    UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP"),
    STORAGE_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "Kho lưu ảnh đang không hoạt động, thử lại sau"),
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
