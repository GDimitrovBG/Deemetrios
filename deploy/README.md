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

---

## 6. Снимки — единственото останало по производителността

Lighthouse дава на сайта **SEO 100 / Достъпност 100 / Best practices 100**, но
производителността опира в снимките: 86 файла (21% от каталога, вкл. хероуто на
началната) са оригинали 1600×2400 / ~160 KB, а телефонът ги показва в карти по
180 CSS-пиксела. Това са ~850 KB излишни байтове само на първия екран и е
причината LCP да е около 7 секунди.

Няма CDN, който да ги преоразмерява в движение, затова по-малките копия трябва
да съществуват като файлове. Изпълнете **на сървъра, от папката на репото**:

```bash
tar czf ~/uploads-backup-$(date +%F).tar.gz -C /path/to wp-content/uploads
npm i sharp
node scripts/optimize-images.mjs /path/to/wp-content/uploads --variants
npm run build
```

Скриптът записва `-480w` / `-960w` / `-1440w` до всяка снимка **и** списък с
тях в `public/image-variants.json`. Приложението чете този списък и слага
`srcset` само за снимките, които са в него — така страница не може да поиска
вариант, който не е генериран. Докато скриптът не е пуснат, файлът е `{}` и
всичко работи точно както сега.

Пуснете първо с `--dry`, ако искате само отчет.

### Cache-Control за качените снимки

В момента отговарят с `max-age=604800` (7 дни). Файловете не се променят —
една година е правилната стойност. В site блока на Caddyfile:

```caddy
@uploads path /wp-content/uploads/*
header @uploads Cache-Control "public, max-age=31536000, immutable"

@fonts path /fonts/*
header @fonts Cache-Control "public, max-age=31536000, immutable"
```

`/fonts/*` е ново: шрифтовете вече се хостват от нас, а не от Google.

---

## 7. CSP — Caddy е истинският източник

Caddy изпраща собствена `Content-Security-Policy` заглавка, а `index.html`
съдържа втора в `<meta>`. Браузърът налага **всяка** получена политика: ресурсът
трябва да е разрешен от **всички**, тоест реалната политика е сечението, не
обединението.

Затова разхлабване само в `index.html` не разрешава нищо, а затягане може да
счупи. **Всяка промяна трябва да се направи и на двете места.**

Това вече ни удари веднъж: при преместването на шрифтовете при нас `font-src` в
`<meta>` стана `'self'`, а заглавката на Caddy още казваше
`https://fonts.gstatic.com`. Сечението е празно → всеки woff2 беше блокиран, 36
CSP нарушения на зареждане, а страниците тихо падаха на Georgia и Arial.

### Какво трябва да се смени в Caddyfile

```
font-src https://fonts.gstatic.com;                       ← старо
font-src 'self';                                          ← ново

style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;   ← старо
style-src 'self' 'unsafe-inline';                                ← ново
```

Шрифтовете вече се сервират от `/fonts/` на нашия домейн, така че препратките
към Google не са нужни. Проверка след `systemctl reload caddy`:

```bash
curl -sI https://demetriosbride-bg.com/ | grep -io "font-src[^;]*"   # → font-src 'self'
```

И в браузъра (DevTools → Console) не трябва да има нито едно
`violates the following Content Security Policy directive`.

---

## 8. robots.txt се сервира от backend-а, не от dist/

`/robots.txt` се проксира към API-то и се генерира в `server/routes/seo.js`
(за да може настройката `robots_extra` от админ панела да се долепя). Файлът
`public/robots.txt` в репото е само резервен вариант, ако backend-ът е спрял.

Двата са синхронизирани сега. При промяна — **и двата**, иначе се сервира
старият. Точно това се случи с реда `LLMs:`, който не е валидна директива и
заради който Lighthouse отчиташе целия файл като невалиден.

Промяната е в `server/`, значи изисква `systemctl restart demetrios-backend`.
