package com.tripplanner.common;

import java.util.Map;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;

/** Tạo ProblemDetail (RFC 9457) kèm trường mở rộng {@code code} và {@code fieldErrors}. */
public final class ProblemDetails {

    public static final String CODE = "code";
    public static final String FIELD_ERRORS = "fieldErrors";

    private ProblemDetails() {
    }

    public static ProblemDetail of(ErrorCode code, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(code.getStatus(), detail);
        problem.setProperty(CODE, code.name());
        return problem;
    }

    public static ProblemDetail of(ErrorCode code) {
        return of(code, code.getDefaultMessage());
    }

    public static ProblemDetail validation(Map<String, String> fieldErrors) {
        ProblemDetail problem = of(ErrorCode.VALIDATION_ERROR);
        problem.setProperty(FIELD_ERRORS, fieldErrors);
        return problem;
    }

    /** Bổ sung {@code code} cho ProblemDetail do Spring tạo sẵn (404 route, JSON sai cú pháp...). */
    public static void ensureCode(ProblemDetail problem, HttpStatusCode status) {
        if (problem.getProperties() == null || !problem.getProperties().containsKey(CODE)) {
            ErrorCode code = ErrorCode.fromStatus(status.value());
            problem.setProperty(CODE, code.name());
            problem.setDetail(code.getDefaultMessage());
        }
    }
}
