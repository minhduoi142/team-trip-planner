# Frontend image: build Vite → phục vụ file tĩnh bằng nginx. Dùng bởi docker-compose.prod.yml.
# Biến VITE_* được "nướng" vào bundle lúc build → đổi giá trị phải build lại image.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Cùng tên miền với backend (Caddy định tuyến /api) → đường dẫn tương đối, không cần CORS
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_SHARE_BASE_URL=
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_CONTACT_ZALO=
ARG VITE_CONTACT_EMAIL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_SHARE_BASE_URL=$VITE_SHARE_BASE_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_CONTACT_ZALO=$VITE_CONTACT_ZALO \
    VITE_CONTACT_EMAIL=$VITE_CONTACT_EMAIL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
