# Deploy на Hetzner VPS

> **Тази страница беше пренаписана, защото описваше друг сървър.**
> Предишната версия казваше nginx + PM2 (`pm2 restart areti-api`,
> `systemctl reload nginx`) и `npm run build` направо в живата директория.
> Нищо от това не отговаря на реалния сървър, а най-опасната част е билдът
> на място: `vite build` изчиства `dist/`, така че сайтът е счупен през
> цялото време на билда и на prerender-а (~2 минути).
>
> Реалният стек е **Caddy + systemd + атомична смяна на директорията**.

---

## 1. Какво работи на сървъра

| Компонент | Реалност |
|-----------|----------|
| Уеб сървър | **Caddy** (не nginx) — сам управлява TLS, без certbot |
| API процес | **systemd**, услуга `demetrios-backend` (не PM2) |
| Статика | Прередерирана в `dist/`, качва се с **rsync в нова директория и после смяна** |
| Снимки | Отделна `uploads` директория **извън репото** — deploy-ът никога не я пипа |
| Prerender | Puppeteer; на сървъра ползва системния **chromium** |

`deploy/redirects.caddy` съдържа 301/410 правилата за старите WordPress URL-и.
Те се поставят **вътре в site блока на `/etc/caddy/Caddyfile`**. Файлът в репото
не се чете от Caddy — той е източникът, от който копирате. Прочетете коментарите
в началото му преди първото поставяне: там са описани два капана, които вече са
ни коствали тихо неработещи правила в продукция.

---

## 2. Всеки следващ deploy

Билдът се прави **встрани** и се пуска в употреба с една атомична стъпка, за да
няма нито секунда, в която сайтът сервира половин директория.

```bash
cd /path/to/repo            # проверете реалния път на сървъра
git pull

# Клиент — билд в работната копия, не в живата директория
npm ci
npm run build               # sitemap → vite build → prerender (~2 мин)

# Публикуване: нова директория, после смяна
rsync -a --delete dist/ /path/to/releases/next/
mv /path/to/live /path/to/releases/prev && mv /path/to/releases/next /path/to/live
```

Точните пътища са специфични за машината — вземете ги от текущия
`/etc/caddy/Caddyfile` (`root * …`), а не от този файл.

### Кога трябва рестарт на backend-а

```bash
systemctl restart demetrios-backend
```

Само когато има промяна в `server/` (route, модел, `lib/`) или в `server/.env`.
Промени само по фронтенда **не** изискват рестарт.

### Кога трябва пипане на Caddy

Само когато `deploy/redirects.caddy` се е променил. Тогава:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

---

## 3. Проверка след deploy

Правило: правило, което се парсва и валидира, все още може да е мъртво.
Проверявайте с `curl`, не по конфигурацията.

```bash
# SPA маршрути → 200
curl -I https://demetriosbride-bg.com/collection/demetrios
curl -I https://demetriosbride-bg.com/product/1505

# Casing на артикулите → 301 в един скок към точния ref
curl -I https://demetriosbride-bg.com/product/r149          # → 301 /product/R149

# Стари WP URL-и → 301
curl -I https://demetriosbride-bg.com/za-nas/
curl -I https://demetriosbride-bg.com/bulchinski-rokli/

# Мъртви WP технически URL-и → 410
curl -I https://demetriosbride-bg.com/xmlrpc.php
curl -I https://demetriosbride-bg.com/product/1500/feed/

# Непознат URL → 404 shell с noindex, НЕ съдържанието на началната страница
curl -s https://demetriosbride-bg.com/nesushtestvuvashta | grep -o '<meta name="robots"[^>]*>'

# API
curl https://demetriosbride-bg.com/api/health               # → {"status":"ok"}
curl -s https://demetriosbride-bg.com/sitemap.xml | head -5
```

Ако `/product/1500` върне 301 вместо 200, виновникът е `@prod_gone` правилото —
причината и решението са описани в `redirects.caddy`.

---

## 4. Логове

```bash
journalctl -u demetrios-backend -f     # Node API
journalctl -u caddy -f                 # Caddy (достъп + грешки)
```

---

## 5. Environment променливи (`server/.env`)

| Ключ | За какво |
|------|----------|
| `MONGO_URI` | Връзка към базата |
| `JWT_SECRET` | Подписва сесийните токени — **задължително** сменен от default-а |
| `BREVO_API_KEY` | Транзакционни имейли (потвърждения, 2FA кодове) |
| `ADMIN_EMAILS` | Кой получава известие при ново запитване (с запетаи) |
| `CORS_ORIGIN` | `https://demetriosbride-bg.com` |
| `PORT` | Портът, към който Caddy проксира (по подразбиране 4000) |

Всеки от `/api/email/*` изисква вход в админ панела. Публичният сайт не вика
нито един от тях — имейлите при запитване се пращат от самия
`POST /api/bookings`.
