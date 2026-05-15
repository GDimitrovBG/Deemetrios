# Deploy на Hetzner VPS

Кратко ръководство за първоначален setup и за всеки следващ deploy.

---

## 1. Първоначална настройка (еднократно)

SSH в сървъра като root и инсталирайте основните пакети:

```bash
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx nodejs npm git ufw fail2ban
npm install -g pm2
```

### MongoDB

Ако базата не е външна, инсталирайте локално:
```bash
# https://www.mongodb.com/docs/manual/installation/
apt install -y mongodb-org
systemctl enable --now mongod
```

### Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## 2. Първи deploy

```bash
mkdir -p /var/www/demetriosbride-bg.com
cd /var/www/demetriosbride-bg.com
git clone <REPO_URL> .

# Server dependencies
cd server
npm ci
cp .env.example .env
nano .env   # попълнете MONGO_URI, JWT_SECRET, BREVO_API_KEY, CORS_ORIGIN, SITE_URL

# Client build
cd ..
npm ci
npm run build   # → /var/www/demetriosbride-bg.com/dist
```

### Стартирайте API с PM2

```bash
cd /var/www/demetriosbride-bg.com/server
pm2 start index.js --name areti-api
pm2 startup        # копирайте показаната команда и я изпълнете
pm2 save
```

### Конфигурирайте Nginx

```bash
cp deploy/nginx.conf /etc/nginx/sites-available/demetriosbride-bg.com
ln -s /etc/nginx/sites-available/demetriosbride-bg.com /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### SSL сертификат (Let's Encrypt)

```bash
certbot --nginx -d demetriosbride-bg.com -d www.demetriosbride-bg.com
# Автоматично обновяване вече е настроено чрез systemd timer.
```

---

## 3. Следващ deploy (всеки път след промяна)

```bash
cd /var/www/demetriosbride-bg.com
git pull
npm ci && npm run build
cd server && npm ci && pm2 restart areti-api
systemctl reload nginx
```

Или като еднократен скрипт:

```bash
cd /var/www/demetriosbride-bg.com && \
  git pull && npm ci && npm run build && \
  cd server && npm ci && pm2 restart areti-api && \
  systemctl reload nginx
```

---

## 4. Проверка след deploy

```bash
# SPA маршрутите работят
curl -I https://demetriosbride-bg.com/collection/demetrios
curl -I https://demetriosbride-bg.com/product/1505

# Стари WP URL-и → 301
curl -I https://demetriosbride-bg.com/bulchinski-rokli/
curl -I https://demetriosbride-bg.com/za-nas/

# API
curl https://demetriosbride-bg.com/api/health
curl https://demetriosbride-bg.com/sitemap.xml | head -20
curl https://demetriosbride-bg.com/robots.txt
```

Очаквани отговори:
- SPA маршрути → `200 OK`
- Стари WP URL-и → `301 Moved Permanently` с правилен `Location:` header
- API → `{"status":"ok"}`

---

## 5. Логове

```bash
# Nginx
tail -f /var/log/nginx/access.log /var/log/nginx/error.log

# Node API
pm2 logs areti-api
pm2 status
```

---

## 6. Restart на услугите

```bash
pm2 restart areti-api          # рестарт само на Node API
systemctl reload nginx         # презареждане на nginx config без downtime
systemctl restart mongod       # рестарт на MongoDB
```
