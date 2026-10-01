# Freqway — multi-stage Docker build
#
#   docker build -t freqway .
#   docker run -d -p 8080:8080 --name freqway freqway
#
# Stage 1 builds the static site with Node; stage 2 serves it with nginx
# (running as a non-root user on port 8080) using the same config as the VPS
# deploy (deploy/nginx.conf), so the /api/nominatim and /api/hearham proxies
# behave identically. Works as-is with Docker, Compose, and Arcane.
#
# Settings (see .env.example): NODE_VERSION and NGINX_VERSION are build args;
# NOMINATIM_USER_AGENT is read when the container starts.

ARG NODE_VERSION=22
ARG NGINX_VERSION=stable

# ── Build ────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Serve ────────────────────────────────────────────────────────────────────
FROM nginxinc/nginx-unprivileged:${NGINX_VERSION}-alpine

LABEL org.opencontainers.image.title="Freqway" \
      org.opencontainers.image.description="Ham radio repeater route planner" \
      org.opencontainers.image.source="https://github.com/nreed97/freqway"

# Reuse the VPS nginx config: accept any host name, listen on the unprivileged
# port 8080, drop the IPv6 listen so it starts on hosts without IPv6, and take
# the Nominatim User-Agent from the environment. The image's entrypoint renders
# templates/*.template into conf.d at startup, substituting only variables that
# are set in the environment, so nginx's own $variables are left alone.
COPY --chown=nginx:nginx deploy/nginx.conf /etc/nginx/templates/default.conf.template
RUN sed -i \
      -e 's/YOUR_DOMAIN_OR_IP/_/' \
      -e 's/listen 80;/listen 8080;/' \
      -e '/listen \[::\]:80;/d' \
      -e 's|User-Agent "Freqway/1.0 (ham radio route planner)"|User-Agent "${NOMINATIM_USER_AGENT}"|' \
      /etc/nginx/templates/default.conf.template \
 && grep -q 'NOMINATIM_USER_AGENT' /etc/nginx/templates/default.conf.template

# Nominatim's usage policy asks for an identifying User-Agent; set your own
# contact details (e.g. "Freqway/1.0 (you@example.com)") via the environment.
ENV NOMINATIM_USER_AGENT="Freqway/1.0 (ham radio route planner)"

COPY --from=build /app/dist /var/www/freqway

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:8080/ || exit 1
