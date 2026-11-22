package com.tripplanner.bank;

import com.tripplanner.config.OpenApiConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/banks")
@Tag(name = "Banks", description = "Danh sách ngân hàng để tạo VietQR")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class BankController {

    @GetMapping
    @Operation(summary = "Danh sách ngân hàng (BIN NAPAS)")
    public List<BankDirectory.Bank> list() {
        return BankDirectory.BANKS;
    }
}
