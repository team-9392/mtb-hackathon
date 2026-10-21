export interface Reward {
  id: string;                     // r-латиница-через-дефис
  audience: "child" | "parent";
  kind: "promo" | "theme" | "perk";
  price: number;                  // цена в монетах Moby
  title: { ru: string; be: string };
  desc: { ru: string; be: string };
  value: string;                  // theme: id темы (default/graphite/ocean/sunset); promo: префикс/текст скидки; perk: что даёт
  code: string | null;            // фиксированный промокод или null — тогда сервер сгенерирует сам
  partner: { name: string; logo: string } | null;  // logo — имя файла PNG в server/assets/partners/
  sort: number;
}

/**
 * Каталог наград Moby Family.
 *
 * Контент живёт в коде — редактируйте прямо этот массив, перезапускайте сервер.
 * Правила и порядок добавления описаны в docs/REWARDS.md.
 *
 * ВАЖНО: id уже выданных наград менять нельзя — на них ссылаются записи в
 * purchases у пользователей. Меняйте цену/тексты/партнёра, но не id.
 */
export const REWARDS: Reward[] = [
  // ── Детский каталог ──────────────────────────────────────────────────────
  {
    id: "r-cash5",
    audience: "child",
    kind: "promo",
    price: 500,
    title: { ru: "Скидка 5 рублей", be: "Зніжка 5 рублёў" },
    desc: {
      ru: "Промокод на скидку 5 рублей у партнёров Moby.",
      be: "Прамакод на зніжку 5 рублёў у партнёраў Moby.",
    },
    value: "MOBY5",
    code: "MOBY5",
    partner: null,
    sort: 1,
  },
  {
    id: "r-cash10",
    audience: "child",
    kind: "promo",
    price: 900,
    title: { ru: "Скидка 10 рублей", be: "Зніжка 10 рублёў" },
    desc: {
      ru: "Промокод на скидку 10 рублей у партнёров Moby.",
      be: "Прамакод на зніжку 10 рублёў у партнёраў Moby.",
    },
    value: "MOBY10",
    code: "MOBY10",
    partner: null,
    sort: 2,
  },
  {
    id: "r-theme-graphite",
    audience: "child",
    kind: "theme",
    price: 300,
    title: { ru: "Тема «Графит»", be: "Тэма «Графіт»" },
    desc: {
      ru: "Строгое тёмно-серое оформление детского кабинета.",
      be: "Строгае цёмна-шэрае афармленне дзіцячага кабінета.",
    },
    value: "graphite",
    code: null,
    partner: null,
    sort: 3,
  },
  {
    id: "r-theme-ocean",
    audience: "child",
    kind: "theme",
    price: 200,
    title: { ru: "Тема «Океан»", be: "Тэма «Акіян»" },
    desc: {
      ru: "Спокойные синие оттенки для приложения.",
      be: "Спакойныя сінія адценні для дадатку.",
    },
    value: "ocean",
    code: null,
    partner: null,
    sort: 4,
  },
  {
    id: "r-theme-sunset",
    audience: "child",
    kind: "theme",
    price: 250,
    title: { ru: "Тема «Закат»", be: "Тэма «Захад»" },
    desc: {
      ru: "Тёплое оранжево-розовое оформление.",
      be: "Цёплае аранжава-ружовае афармленне.",
    },
    value: "sunset",
    code: null,
    partner: null,
    sort: 5,
  },
  {
    id: "r-stickers",
    audience: "child",
    kind: "perk",
    price: 150,
    title: { ru: "Наклейки Moby", be: "Наклейкі Moby" },
    desc: {
      ru: "Набор стикеров для чата с семьёй.",
      be: "Набор стыкераў для чата з сям'ёй.",
    },
    value: "stickers",
    code: null,
    partner: null,
    sort: 6,
  },
  {
    id: "r-icecream-cup",
    audience: "child",
    kind: "promo",
    price: 150,
    title: { ru: "Стаканчик мороженого", be: "Стаканчык марозіва" },
    desc: {
      ru: "Бесплатный стаканчик мороженого в партнёрской точке.",
      be: "Бясплатны стаканчык марозіва ў партнёрскай кропцы.",
    },
    value: "MOBY-ICE",
    code: null,
    partner: null,
    sort: 7,
  },
  {
    id: "r-stationery-kit",
    audience: "child",
    kind: "promo",
    price: 200,
    title: { ru: "Набор канцелярии", be: "Набор канцылярыі" },
    desc: {
      ru: "Набор канцелярских принадлежностей к школе.",
      be: "Набор канцылярскіх прыналежнасцей да школы.",
    },
    value: "MOBY-PAPER",
    code: null,
    partner: { name: "Канцтавары «Аловак»", logo: "stationery.png" },
    sort: 8,
  },
  {
    id: "r-cafe-latte",
    audience: "child",
    kind: "promo",
    price: 300,
    title: { ru: "Латте в кофейне", be: "Латэ ў кавярні" },
    desc: {
      ru: "Бесплатный латте в кофейне-партнёре.",
      be: "Бясплатнае латэ ў кавярні-партнёры.",
    },
    value: "MOBY-CAFE",
    code: null,
    partner: { name: "Кавярня «Ранішняя»", logo: "cafe.png" },
    sort: 9,
  },
  {
    id: "r-cinema-ticket",
    audience: "child",
    kind: "promo",
    price: 450,
    title: { ru: "Билет в кино", be: "Білет у кіно" },
    desc: {
      ru: "Один билет на семейный сеанс.",
      be: "Адзін білет на сямейны сеанс.",
    },
    value: "MOBY-CINEMA",
    code: null,
    partner: { name: "Кінатэатр «Зорка»", logo: "cinema.png" },
    sort: 10,
  },
  {
    id: "r-sleepless-hour",
    audience: "child",
    kind: "perk",
    price: 400,
    title: { ru: "Лишний час на экран", be: "Лішняя гадзіна на экран" },
    desc: {
      ru: "Дополнительный час экранного времени без напоминаний.",
      be: "Дадатковая гадзіна экраннага часу без напамінаў.",
    },
    value: "extra-screen-hour",
    code: null,
    partner: null,
    sort: 11,
  },
  {
    id: "r-trampoline-jump",
    audience: "child",
    kind: "promo",
    price: 550,
    title: { ru: "Прыжок на батуте", be: "Скок на батуце" },
    desc: {
      ru: "Час прыжков на батуте в партнёрском парке.",
      be: "Гадзіна скачкоў на батуце ў партнёрскім парку.",
    },
    value: "MOBY-JUMP",
    code: "MOBY-JUMP",
    partner: { name: "Батутны парк «Скакун»", logo: "trampoline.png" },
    sort: 12,
  },

  // ── Родительский каталог ─────────────────────────────────────────────────
  {
    id: "r-parent-coffee",
    audience: "parent",
    kind: "promo",
    price: 300,
    title: { ru: "Кофе с собой", be: "Кава з сабой" },
    desc: {
      ru: "Бесплатный кофе с собой в кофейне-партнёре.",
      be: "Бясплатная кава з сабой у кавярні-партнёры.",
    },
    value: "MOBY-COFFEE",
    code: null,
    partner: { name: "Кавярня «Ранішняя»", logo: "cafe.png" },
    sort: 13,
  },
  {
    id: "r-parent-books",
    audience: "parent",
    kind: "promo",
    price: 400,
    title: { ru: "Сертификат в книжный", be: "Сертыфікат у кнігарню" },
    desc: {
      ru: "Сертификат на покупку книг для всей семьи.",
      be: "Сертыфікат на куплю кніг для ўсёй сям'і.",
    },
    value: "MOBY-BOOK",
    code: null,
    partner: { name: "Кнігарня «Чытанка»", logo: "books.png" },
    sort: 14,
  },
  {
    id: "r-parent-theme-ocean",
    audience: "parent",
    kind: "theme",
    price: 350,
    title: { ru: "Тема «Океан» для родителя", be: "Тэма «Акіян» для бацькоў" },
    desc: {
      ru: "Спокойное синее оформление кабинета родителя.",
      be: "Спакойнае сіняе афармленне кабінета бацькі.",
    },
    value: "ocean",
    code: null,
    partner: null,
    sort: 15,
  },
  {
    id: "r-parent-taxi",
    audience: "parent",
    kind: "promo",
    price: 600,
    title: { ru: "Поездка на такси", be: "Паездка на таксі" },
    desc: {
      ru: "Скидка на поездку в службе такси-партнёре.",
      be: "Зніжка на паездку ў службе таксі-партнёры.",
    },
    value: "MOBY-TAXI",
    code: "MOBY-TAXI",
    partner: { name: "Служба таксі «Паездка»", logo: "taxi.png" },
    sort: 16,
  },
  {
    id: "r-parent-limit",
    audience: "parent",
    kind: "perk",
    price: 800,
    title: { ru: "Расширенный лимит", be: "Пашыраны ліміт" },
    desc: {
      ru: "Увеличенный дневной лимит переводов для семьи.",
      be: "Павялічаны дзённы ліміт пераказаў для сям'і.",
    },
    value: "extended-limit",
    code: null,
    partner: null,
    sort: 17,
  },
];
