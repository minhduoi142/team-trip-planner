# Backend image. Dùng bởi docker-compose.prod.yml (deploy VPS).
# Build tay:  docker build -t trip-planner-api ./backend
# Mọi cấu hình (DB_URL, JWT_SECRET, MINIO_*...) truyền bằng biến môi trường, KHÔNG đóng gói .env vào image.

FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
# Phòng khi repo được checkout trên Windows (CRLF) → script sh lỗi "/bin/sh^M"
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY src/ src/
RUN ./mvnw -B -q package -DskipTests && cp target/*.jar app.jar

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 1001 spring
USER spring
COPY --from=build /app/app.jar app.jar
EXPOSE 8080
# Giới hạn heap để chạy được trên VPS 2 GB RAM cùng MySQL + MinIO; ghi đè bằng biến JAVA_OPTS
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
