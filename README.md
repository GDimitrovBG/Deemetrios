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
  App.jsx           # Router + Tweaks panel
  styles.css        # Design system (CSS variables, typography, layout)
  i18n.js           # BG / EN преводи
  data.js           # Снимки, рокли, аксесоари
  components.jsx    # Nav, Footer, Img
  home.jsx          # Начална страница (3 hero варианта)
  catalog.jsx       # Колекция, Продукт, Аксесоари
  booking.jsx       # 4-стъпков booking flow
  info.jsx          # За нас, Контакти, Дневник
  TweaksPanel.jsx   # Floating tweaks panel
```
