# Арети — Bridal Couture

Луксозен уеб сайт за булчинска мода, изграден с Vite + React.

## Стартиране

```bash
# Задължително Node 18+ (препоръчително 20)
nvm use 20       # или: nvm use (чете .nvmrc автоматично)

npm install
npm run dev      # → http://localhost:5173
```

## Команди

| Команда | Описание |
|---------|----------|
| `npm run dev` | Dev сървър с HMR |
| `npm run build` | Production билд → `dist/` |
| `npm run preview` | Преглед на production билда |

## Структура

```
src/
  main.jsx          # Входна точка
  App.jsx           # Router + състояние на приложението
  router.js         # URL ↔ състояние, вкл. 301 картата от WordPress
  styles.css        # Design system (CSS variables, typography, layout)
  i18n.js           # BG / EN преводи
  tweaks.js         # Визуални предпочитания (localStorage)
  data.js           # Снимки и рокли
  components.jsx    # Nav, Footer, Img, FloatDial
  home.jsx          # Начална страница (3 hero варианта)
  catalog.jsx       # Колекция, Продукт, Любими
  booking.jsx       # 4-стъпков booking flow
  quiz.jsx          # /kviz — намери своята рокля
  info.jsx          # За нас, Контакти, Блог
  legal.jsx         # Правни страници + cookie banner + 404
  seo.js            # <head>, canonical, hreflang, JSON-LD
  seo-helpers.js    # Заглавия, описания, schema за артикулите
  attribution.js    # Откъде идва запитването (след съгласие)
  admin.jsx         # Админ панел (lazy, само на #admin)

server/             # Express + MongoDB API
scripts/            # sitemap, prerender, Caddy 301-и, оптимизация на снимки
deploy/             # Caddy правила + инструкции за deploy
```

## Билд

`npm run build` е три стъпки: генериране на sitemap → `vite build` →
prerender на всеки маршрут с Puppeteer в статичен HTML. Prerender-ът се
проваля шумно, ако някоя страница се рендира празна — не подминавайте
червен изход.

Деплойът е описан в [deploy/README.md](deploy/README.md). Сайтът работи на
**Caddy + systemd**, не на nginx/PM2.
