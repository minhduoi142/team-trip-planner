# Backend image (chuẩn bị cho Phase 5 – chưa deploy).
# Build:  docker build -t trip-planner-api ./backend
# Run:    docker run -p 8080:8080 --env-file backend/.env trip-planner-api
# Toàn bộ cấu hình (DB_URL, JWT_SECRET, ...) truyền bằng biến môi trường, không đóng gói .env vào image.

FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY src/ src/
RUN ./mvnw -B -q package -DskipTests && cp target/*.jar app.jar

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 1001 spring
USER spring
COPY --from=build /app/app.jar app.jar
EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
