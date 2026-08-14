FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Vite bakes VITE_* vars into the static bundle at build time -- they can't be
# changed at container runtime like a normal backend env var.
ARG VITE_API_BASE_URL
ARG VITE_HOME_TITLE
ARG VITE_POLL_INTERVAL_MS
ARG VITE_UPTIME_PERIOD_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_HOME_TITLE=$VITE_HOME_TITLE \
    VITE_POLL_INTERVAL_MS=$VITE_POLL_INTERVAL_MS \
    VITE_UPTIME_PERIOD_KEY=$VITE_UPTIME_PERIOD_KEY
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
