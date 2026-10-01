# Freqway — multi-stage Docker build
#
#   docker build -t freqway .
#   docker run -d -p 8080:80 --name freqway freqway
#
# Stage 1 builds the static site with Node; stage 2 serves it with nginx using
# the same config as the VPS deploy (deploy/nginx.conf), so the /api/nominatim
# and /api/hearham proxies behave identically.

# ── Build ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Serve ────────────────────────────────────────────────────────────────────
FROM nginx:stable-alpine

# Reuse the VPS nginx config: accept any host name, and drop the IPv6 listen
# so the container starts on hosts with IPv6 disabled.
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i \
      -e 's/YOUR_DOMAIN_OR_IP/_/' \
      -e '/listen \[::\]:80;/d' \
      /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /var/www/freqway

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
