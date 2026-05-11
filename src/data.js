// Shared images & datasets

export const IMG = {
  hero1:    'https://images.unsplash.com/photo-1595407753234-0882f1e77954?w=1800&q=80&auto=format',
  hero2:    'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=1600&q=80&auto=format',
  hero3:    'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1800&q=80&auto=format',
  bride1:   'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=1200&q=80&auto=format',
  bride2:   'https://images.unsplash.com/photo-1525258946800-98cfd641d0de?w=1200&q=80&auto=format',
  bride3:   'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=80&auto=format',
  bride4:   'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80&auto=format',
  bride5:   'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80&auto=format',
  bride6:   'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=1200&q=80&auto=format',
  bride7:   'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1200&q=80&auto=format',
  bride8:   'https://images.unsplash.com/photo-1569714151049-7e1ad19fe8ea?w=1200&q=80&auto=format',
  bride9:   'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=1200&q=80&auto=format',
  bride10:  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80&auto=format',
  bride11:  'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=1200&q=80&auto=format',
  bride12:  'https://images.unsplash.com/photo-1550005809-91ad75fb315f?w=1200&q=80&auto=format',
  bride13:  'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200&q=80&auto=format',
  bride14:  'https://images.unsplash.com/photo-1614091066731-5b9a66a7e8e3?w=1200&q=80&auto=format',
  bride15:  'https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=1200&q=80&auto=format',
  detail1:  'https://images.unsplash.com/photo-1561125320-67b3ce6080a5?w=1000&q=80&auto=format',
  detail2:  'https://images.unsplash.com/photo-1589476994384-b1ee3a2faabf?w=1000&q=80&auto=format',
  veil:     'https://images.unsplash.com/photo-1563729627-2cc83a2c3d39?w=1000&q=80&auto=format',
  shoes:    'https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=1000&q=80&auto=format',
  earrings: 'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=1000&q=80&auto=format',
  crown:    'https://images.unsplash.com/photo-1611601679762-0408a3a45cdc?w=1000&q=80&auto=format',
  about:    'https://images.unsplash.com/photo-1606490194859-07c18c9f0968?w=1800&q=80&auto=format',
  blog:     'https://images.unsplash.com/photo-1583939411023-14783179e581?w=1400&q=80&auto=format',
};

export const COLLECTIONS = [
  { id: 'cosmobella',  label: 'Cosmobella',         desc_bg: 'Романтична изисканост — флорални апликации, илюзорни деколтета и деликатни презрамки.',       desc_en: 'Romantic sophistication with petal embroidery, illusion necklines and delicate straps.' },
  { id: 'demetrios',   label: 'Demetrios',           desc_bg: 'Съвременни и смели силуети — илюзорни деколтета, открити гърбове и свалящи се поли.',         desc_en: 'Modern, daring silhouettes with illusion necklines, open backs and detachable overskirts.' },
  { id: 'platinum',    label: 'Demetrios Platinum',  desc_bg: 'Лукс и блясък — ръчно везане с мъниста, богати тъкани и монументални архитектурни силуети.', desc_en: 'Opulent glamour — heavy hand-beading, rich fabrics and grand architectural silhouettes.' },
  { id: 'destination', label: 'Destination Romance', desc_bg: 'Бохо и въздушност — чисти линии, деликатни детайли и тъкани, които се носят лесно.',         desc_en: 'Boho and ethereal — clean lines, refined details and fabrics that move with ease.' },
];

export const DRESSES = [
  // ── Cosmobella ──────────────────────────────────────────────────────────────
  { ref: '8246', name_bg: 'Стил 8246', name_en: 'Style 8246', collection: 'cosmobella', silhouette: 'А-силует', silhouette_en: 'A-line',    price: 4200, img: IMG.bride1, fabric: 'Брокат, тюл' },
  { ref: '8268', name_bg: 'Стил 8268', name_en: 'Style 8268', collection: 'cosmobella', silhouette: 'А-силует', silhouette_en: 'A-line',    price: 4800, img: IMG.bride2, fabric: 'Дантела, тюл' },
  { ref: '8277', name_bg: 'Стил 8277', name_en: 'Style 8277', collection: 'cosmobella', silhouette: 'А-силует', silhouette_en: 'A-line',    price: 5100, img: IMG.bride3, badge: 'New', fabric: 'Дантела с мъниста, тюл' },
  { ref: '8157', name_bg: 'Стил 8157', name_en: 'Style 8157', collection: 'cosmobella', silhouette: 'Бална',    silhouette_en: 'Ball gown', price: 5800, img: IMG.bride4, fabric: 'Дантела с мъниста, тюл' },
  { ref: '8280', name_bg: 'Стил 8280', name_en: 'Style 8280', collection: 'cosmobella', silhouette: 'Бална',    silhouette_en: 'Ball gown', price: 6400, img: IMG.bride5, badge: 'New', fabric: 'Дантела с мъниста, тюл' },

  // ── Demetrios ────────────────────────────────────────────────────────────────
  { ref: '1502',  name_bg: 'Стил 1502',  name_en: 'Style 1502',  collection: 'demetrios', silhouette: 'А-силует', silhouette_en: 'A-line',       price: 4500, img: IMG.bride6, fabric: 'Тюл' },
  { ref: '1510',  name_bg: 'Стил 1510',  name_en: 'Style 1510',  collection: 'demetrios', silhouette: 'Бална',    silhouette_en: 'Ball gown',    price: 5600, img: IMG.bride7, badge: 'New', fabric: 'Тюл с перли' },
  { ref: '1522',  name_bg: 'Стил 1522',  name_en: 'Style 1522',  collection: 'demetrios', silhouette: 'Бална',    silhouette_en: 'Ball gown',    price: 4900, img: IMG.bride8, fabric: 'Микадо' },
  { ref: 'AM69M', name_bg: 'Стил AM69M', name_en: 'Style AM69M', collection: 'demetrios', silhouette: 'Сирена',   silhouette_en: 'Fit & flare',  price: 6200, img: IMG.bride9, badge: 'Couture', fabric: 'Дантела с мъниста' },
  { ref: 'AM71',  name_bg: 'Стил AM71',  name_en: 'Style AM71',  collection: 'demetrios', silhouette: 'Прав',     silhouette_en: 'Sheath',       price: 5300, img: IMG.bride10, fabric: 'Дантела с мъниста' },

  // ── Demetrios Platinum ───────────────────────────────────────────────────────
  { ref: 'DP455', name_bg: 'Elisia',     name_en: 'Elisia',     collection: 'platinum', silhouette: 'Бална',  silhouette_en: 'Ball gown',   price: 7200, img: IMG.bride11, badge: 'Platinum', fabric: 'Дантела, тюл с блясък' },
  { ref: 'DP460', name_bg: 'Oriana',     name_en: 'Oriana',     collection: 'platinum', silhouette: 'Бална',  silhouette_en: 'Ball gown',   price: 7800, img: IMG.bride12, badge: 'Platinum', fabric: 'Дантела с мъниста, тюл' },
  { ref: 'DP531', name_bg: 'Rivera',     name_en: 'Rivera',     collection: 'platinum', silhouette: 'Сирена', silhouette_en: 'Fit & flare', price: 8500, img: IMG.bride13, badge: 'Platinum', fabric: 'Коприна, мъниста' },
  { ref: 'DP533', name_bg: 'Zola',       name_en: 'Zola',       collection: 'platinum', silhouette: 'А-силует', silhouette_en: 'A-line',    price: 6900, img: IMG.bride14, badge: 'Platinum', fabric: 'Тюл с 3D цветя' },
  { ref: 'DP537', name_bg: 'Renata',     name_en: 'Renata',     collection: 'platinum', silhouette: 'Бална',  silhouette_en: 'Ball gown',   price: 9200, img: IMG.bride15, badge: 'Platinum', fabric: 'Брокат, тюл с мъниста' },

  // ── Destination Romance ──────────────────────────────────────────────────────
  { ref: 'DR261', name_bg: 'Стил DR261', name_en: 'Style DR261', collection: 'destination', silhouette: 'А-силует', silhouette_en: 'A-line',      price: 3500, img: IMG.bride3, fabric: 'Дантела с мъниста, тюл' },
  { ref: 'DR290', name_bg: 'Стил DR290', name_en: 'Style DR290', collection: 'destination', silhouette: 'Прав',     silhouette_en: 'Sheath',      price: 3200, img: IMG.bride5, fabric: 'Тюл, дантела' },
  { ref: 'DR322', name_bg: 'Стил DR322', name_en: 'Style DR322', collection: 'destination', silhouette: 'Сирена',   silhouette_en: 'Fit & flare', price: 3800, img: IMG.bride7, badge: 'New', fabric: 'Сатен' },
  { ref: 'DR349', name_bg: 'Стил DR349', name_en: 'Style DR349', collection: 'destination', silhouette: 'А-силует', silhouette_en: 'A-line',      price: 4100, img: IMG.bride9, fabric: 'Дантела, тюл' },
  { ref: 'DR305', name_bg: 'Стил DR305', name_en: 'Style DR305', collection: 'destination', silhouette: 'Прав',     silhouette_en: 'Sheath',      price: 2900, img: IMG.bride1, fabric: 'Дантела с мъниста' },
];

export const ACCESSORIES = [
  { name_bg: 'Воал Клер',       name_en: 'Veil Claire',    cat: 'Воали',  cat_en: 'Veils',    price: 480, img: IMG.veil },
  { name_bg: 'Корона Аврора',   name_en: 'Aurora crown',   cat: 'Корони', cat_en: 'Crowns',   price: 920, img: IMG.crown },
  { name_bg: 'Обици Перлен',    name_en: 'Pearl earrings', cat: 'Обици',  cat_en: 'Earrings', price: 340, img: IMG.earrings },
  { name_bg: 'Обувки Сатен',    name_en: 'Satin shoes',    cat: 'Обувки', cat_en: 'Shoes',    price: 680, img: IMG.shoes },
  { name_bg: 'Воал Катедрал',   name_en: 'Cathedral veil', cat: 'Воали',  cat_en: 'Veils',    price: 620, img: IMG.detail1 },
  { name_bg: 'Колан с мъниста', name_en: 'Beaded belt',    cat: 'Колани', cat_en: 'Belts',    price: 280, img: IMG.detail2 },
  { name_bg: 'Корона Зора',     name_en: 'Zora crown',     cat: 'Корони', cat_en: 'Crowns',   price: 760, img: IMG.bride6 },
  { name_bg: 'Обици Висулка',   name_en: 'Drop earrings',  cat: 'Обици',  cat_en: 'Earrings', price: 420, img: IMG.bride5 },
];
