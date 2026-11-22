package com.tripplanner.support;

import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/**
 * Chỉ chạy khi có biến môi trường TEST_DB_URL. Dùng @Inherited để các class con của
 * {@link IntegrationTest} cũng được áp dụng (annotation điều kiện của JUnit không tự kế thừa).
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Inherited
@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = ".+",
        disabledReason = "Chưa đặt TEST_DB_URL: bỏ qua test tích hợp với MySQL")
public @interface RequiresTestDatabase {
}
