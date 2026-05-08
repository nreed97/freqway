# Deploying Freqway on a Linux VPS

Tested on Ubuntu 22.04 / Debian 12. Any distro with nginx and Node 18+ works.

---

## 1 — Install dependencies

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx nodejs npm git certbot python3-certbot-nginx
```

Check Node version (needs 18+):

```bash
node --version
```

If the distro ships an older Node, install a current version via NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 2 — Clone and build

```bash
sudo mkdir -p /var/www/freqway
sudo chown $USER:$USER /var/www/freqway

git clone https://github.com/nreed97/freqway.git /tmp/freqway
cd /tmp/freqway
npm ci
npm run build
cp -r dist/* /var/www/freqway/
```

---

## 3 — Configure nginx

```bash
sudo cp /tmp/freqway/deploy/nginx.conf /etc/nginx/sites-available/freqway
sudo ln -s /etc/nginx/sites-available/freqway /etc/nginx/sites-enabled/freqway
sudo rm -f /etc/nginx/sites-enabled/default
```

Edit the config and replace `YOUR_DOMAIN_OR_IP` with your actual domain or server IP:

```bash
sudo nano /etc/nginx/sites-available/freqway
```

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

The site is now live at `http://your-domain-or-ip`.

---

## 4 — HTTPS with Let's Encrypt (requires a domain name)

```bash
sudo certbot --nginx -d yourdomain.com
```

Certbot edits the nginx config automatically and sets up auto-renewal. Done.

Verify auto-renewal works:

```bash
sudo certbot renew --dry-run
```

---

## 5 — Updating the site

When you push changes to GitHub, SSH in and re-deploy:

```bash
cd /tmp/freqway
git pull
npm ci
npm run build
cp -r dist/* /var/www/freqway/
```

Or paste this as a one-liner:

```bash
cd /tmp/freqway && git pull && npm ci && npm run build && cp -r dist/* /var/www/freqway/
```

---

## Firewall

If you're using `ufw`:

```bash
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Blank page / 404 on refresh | Check `try_files` line is in nginx config |
| HearHam API returns 502 | Verify `proxy_ssl_server_name on` is present; check `sudo nginx -t` |
| SSL cert fails | Make sure DNS A record points to this server's IP before running certbot |
| Old build still showing | Run `cp -r dist/* /var/www/freqway/` again; hard-refresh the browser |
