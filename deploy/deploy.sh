#!/bin/bash
# Freqway deployment script
# Usage: bash deploy.sh [--domain yourdomain.com] [--ssl]
#
# Run as a non-root user with sudo access.
# First run: full install + build + nginx config
# Subsequent runs: pull + rebuild only

set -euo pipefail

REPO="https://github.com/nreed97/freqway.git"
REPO_DIR="/tmp/freqway"
WEB_ROOT="/var/www/freqway"
NGINX_CONF="/etc/nginx/sites-available/freqway"
DOMAIN=""
SSL=false

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --domain) DOMAIN="$2"; shift 2 ;;
    --ssl)    SSL=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "==> Freqway deploy"
echo "    Domain : ${DOMAIN:-<IP address>}"
echo "    SSL    : $SSL"
echo ""

# ── Install dependencies (skip if already present) ──────────────────────────
if ! command -v nginx &>/dev/null; then
  echo "==> Installing nginx..."
  sudo apt-get update -qq
  sudo apt-get install -y nginx
fi

NODE_MAJOR=$(command -v node &>/dev/null && node -e "console.log(parseInt(process.version.slice(1)))" || echo 0)
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  echo "==> Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if $SSL && ! command -v certbot &>/dev/null; then
  echo "==> Installing certbot..."
  sudo apt-get install -y certbot python3-certbot-nginx
fi

# ── Clone or update repo ─────────────────────────────────────────────────────
if [[ -d "$REPO_DIR" ]]; then
  echo "==> Updating repo..."
  git -C "$REPO_DIR" pull || {
    echo "==> Update failed — re-cloning..."
    rm -rf "$REPO_DIR"
    git clone "$REPO" "$REPO_DIR"
  }
else
  echo "==> Cloning repo..."
  git clone "$REPO" "$REPO_DIR"
fi

# ── Build ────────────────────────────────────────────────────────────────────
echo "==> Installing npm dependencies..."
npm ci --prefix "$REPO_DIR"

echo "==> Building..."
npm run build --prefix "$REPO_DIR"

# ── Deploy static files ──────────────────────────────────────────────────────
echo "==> Copying build to $WEB_ROOT..."
sudo mkdir -p "$WEB_ROOT"
sudo cp -r "$REPO_DIR/dist/." "$WEB_ROOT/"

# ── Configure nginx (first run only) ─────────────────────────────────────────
if [[ ! -f "$NGINX_CONF" ]]; then
  echo "==> Writing nginx config..."
  sudo cp "$REPO_DIR/deploy/nginx.conf" "$NGINX_CONF"

  SERVER_NAME="${DOMAIN:-_}"
  sudo sed -i "s/YOUR_DOMAIN_OR_IP/$SERVER_NAME/g" "$NGINX_CONF"

  sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/freqway
  sudo rm -f /etc/nginx/sites-enabled/default
fi

echo "==> Testing nginx config..."
sudo nginx -t

echo "==> Reloading nginx..."
sudo systemctl reload nginx

# ── SSL ───────────────────────────────────────────────────────────────────────
if $SSL; then
  if [[ -z "$DOMAIN" ]]; then
    echo "ERROR: --ssl requires --domain yourdomain.com"
    exit 1
  fi
  echo "==> Obtaining SSL certificate for $DOMAIN..."
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect \
    -m "admin@$DOMAIN" || echo "WARN: certbot failed — check DNS and re-run with --ssl"
fi

echo ""
echo "✓ Done! Freqway is live at ${DOMAIN:+https://}${DOMAIN:-http://$(curl -sf ifconfig.me)}"
