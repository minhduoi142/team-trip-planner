package com.tripplanner.user;

import com.tripplanner.bank.BankAccountRequest;
import com.tripplanner.bank.BankDirectory;
import com.tripplanner.common.BusinessException;
import com.tripplanner.common.TextNormalizer;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.user.dto.UpdateProfileRequest;
import com.tripplanner.user.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    /** User trong token có thể đã bị xóa: coi như phiên đăng nhập không còn hợp lệ. */
    @Transactional(readOnly = true)
    public User getRequired(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }

    @Transactional(readOnly = true)
    public UserResponse me(Long userId) {
        return UserResponse.from(getRequired(userId));
    }

    /** Lưu tài khoản nhận tiền; tên chủ TK chuẩn hóa in hoa không dấu (chuẩn VietQR). */
    @Transactional
    public UserResponse setBankAccount(Long userId, BankAccountRequest request) {
        String bin = request.bankBin().trim();
        String accountNo = request.accountNo().replaceAll("\\s+", "");
        String accountName = TextNormalizer.toUpperAscii(request.accountName());
        if (BankDirectory.find(bin).isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_BANK_ACCOUNT, "Ngân hàng không có trong danh sách");
        }
        if (!accountNo.matches("\\d{6,19}")) {
            throw new BusinessException(ErrorCode.INVALID_BANK_ACCOUNT, "Số tài khoản gồm 6–19 chữ số");
        }
        if (!accountName.matches("[A-Z ]{1,50}")) {
            throw new BusinessException(ErrorCode.INVALID_BANK_ACCOUNT,
                    "Tên chủ tài khoản chỉ gồm chữ cái, tối đa 50 ký tự");
        }
        User user = getRequired(userId);
        user.setBankBin(bin);
        user.setBankAccountNo(accountNo);
        user.setBankAccountName(accountName);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse clearBankAccount(Long userId) {
        User user = getRequired(userId);
        user.setBankBin(null);
        user.setBankAccountNo(null);
        user.setBankAccountName(null);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = getRequired(userId);
        user.setDisplayName(request.displayName().trim());
        user.setAvatarUrl(StringUtils.hasText(request.avatarUrl()) ? request.avatarUrl().trim() : null);
        return UserResponse.from(user);
    }
}
