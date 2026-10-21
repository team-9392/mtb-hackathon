# SVG в мобильном приложении

Как рисовать новый дизайн векторно, подключать `.svg` как React-компоненты и собирать это
под iOS, Android и web. Настроено на Expo SDK 58 / React Native 0.88 / TypeScript.

## Что установлено

| Пакет | Версия | Зачем |
|---|---|---|
| `react-native-svg` | `15.16.0` | Нативные SVG-примитивы (`Svg`, `Path`, `Circle`, `Defs`, `LinearGradient`…) |
| `react-native-svg-transformer` | `1.5.3` | Metro-трансформер: `.svg` → React-компонент |

Обе зависимости лежат в `mobile/package.json` в `dependencies`: трансформер нужен Metro,
поэтому он должен стоять и в production-установке зависимостей.

## Где что настроено

| Файл | Что делает |
|---|---|
| `mobile/metro.config.js` | `.svg` убран из `assetExts`, добавлен в `sourceExts`, `babelTransformerPath` указывает на `react-native-svg-transformer` |
| `mobile/svg.d.ts` | Типы: `import Icon from "./icon.svg"` — это `React.FC<SvgProps>` |
| `mobile/tsconfig.json` | `include: ["**/*.ts", "**/*.tsx"]` уже покрывает `svg.d.ts` в корне `mobile/` |
| `mobile/assets/svg/` | Каталог для SVG-ассетов |
| `mobile/src/ui/SvgCheck.tsx` | Пример-заготовка: инлайн-круг с градиентом и импорт файла. Ни к одному экрану не подключён |

## 1. Как рисовать новый дизайн

### Вариант А. Инлайн-компонент (рекомендуется для иконок с динамическим цветом)

Рисуем примитивами `react-native-svg` прямо в TSX. Плюс: цвет и размер меняются props,
без правки файла.

```tsx
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import type { SvgProps } from "react-native-svg";

export type CheckIconProps = SvgProps & {
  size?: number;
  color?: string;
};

export function CheckIcon({ size = 24, color = "#0B6BFF", ...props }: CheckIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Defs>
        <LinearGradient id="checkGradient" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#34D399" />
          <Stop offset="1" stopColor="#0EA5E9" />
        </LinearGradient>
      </Defs>
      <Path
        d="M4.5 12.5 9.5 17.5 19.5 6.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
```

Правила:

- Всегда задавайте `viewBox` и рисуйте в его системе координат; `width`/`height` — только
  через props, чтобы иконка масштабировалась.
- Для контурных иконок ставьте на корневой `Svg` `fill="none"`, иначе react-native-svg
  зальёт фигуры чёрным.
- Градиенты/маски — в `<Defs>`; `id` должны быть уникальны в пределах одного `Svg`.
  Если на экране несколько одинаковых компонентов с градиентом — добавляйте в `id` префикс
  или `useId()` (на web `id` живут в общем DOM).
- Не используйте CSS-классы, `<style>`, `foreignObject`, внешние `href` и сложные фильтры:
  мобильный рендерер поддерживает не всё. Текст в макете переводите в кривые.

### Вариант Б. Экспорт из Figma в `.svg`

1. Figma → Export → SVG. Для сложных макетов прогнать через
   [SVGOMG](https://jakearchibald.github.io/svgomg/), **не удаляя `viewBox`**.
2. Положить файл в `mobile/assets/svg/`, имя — kebab-case: `card-lock.svg`,
   `goal-star.svg`.
3. Импортировать как компонент (см. ниже) и использовать как обычный React-компонент.

Что проверить в файле:

- есть `viewBox`, нет жёсткой привязки к пиксельному `width`/`height` (размер задаём props);
- цвета заданы атрибутами (`fill`, `stroke`), а не `<style>`;
- если иконка должна крашиться в цвет темы — у нужных элементов `fill="currentColor"`
  или `stroke="currentColor"` (см. раздел про цвета);
- нет `<image>` с внешними ссылками и `@font-face`.

## 2. Импорт `.svg` как React-компонента

Metro видит `.svg` в `sourceExts`, поэтому импорт возвращает компонент, а не URL ассета:

```tsx
import Check from "../../assets/svg/sample-check.svg";
import type { SvgProps } from "react-native-svg";

export function CheckFileIcon(props: SvgProps) {
  return <Check width={24} height={24} {...props} />;
}
```

Путь считается от текущего файла. Алиас `@/` в `tsconfig.json` указывает на `./src/*`,
а `assets/` лежит рядом с `src/`, поэтому для ассетов используйте относительный путь
(`../../assets/svg/...`) или добавьте отдельный алиас, если он понадобится.

TypeScript знает про `*.svg` благодаря `mobile/svg.d.ts`:

```ts
declare module "*.svg" {
  import type { SvgProps } from "react-native-svg";
  const content: React.FC<SvgProps>;
  export default content;
}
```

> `.svg` больше **не** ассет: `require("./icon.svg")` и `<Image source={require("./icon.svg")} />`
> работать не будут. Подключайте только импортом-компонентом.

## 3. Цвета через props

### `fill` на корне

Если в SVG у фигур не задан собственный `fill`, он наследуется от корневого `Svg`:

```tsx
<Check fill="#0B6BFF" />
```

Это самый простой способ для одноцветных заливок. Для контурных иконок работает
`color` + `currentColor`:

```tsx
// sample-check.svg: stroke="currentColor"
<Check color="#0B6BFF" />
```

`react-native-svg` поддерживает `currentColor` на iOS, Android и web: `color` на корневом
`Svg` подставляется в `fill`/`stroke="currentColor"` у детей. Это удобно, когда цвет
приходит из темы или от родителя.

### Конкретный элемент

Если в одной иконке несколько цветов, задавайте их точечно:

```tsx
<Svg viewBox="0 0 24 24">
  <Path d="..." fill={active ? tokens.accent : tokens.muted} />
  <Circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2} fill="none" />
</Svg>
```

### Из темы

Палитра лежит в `mobile/src/theme/tokens.ts`. Не хардкодьте цвета внутри SVG-компонента:
принимайте `fill`/`color` через props (или импортируйте токены, если цвет фиксирован
дизайном), чтобы тёмная/светлая тема и детский/родительский контуры оставались
управляемыми.

## 4. Где лежат ассеты

```
mobile/assets/
  svg/                 # новые SVG-иконки и иллюстрации (импорт как компонент)
    sample-check.svg   # пример
  brand/               # логотип приложения (logo.svg, logo.png)
  brand/systems/       # логотипы платёжных систем (png)
  icon.png, splash-icon.png, favicon.png, android-icon-*.png
```

- Новые дизайн-иконки — в `assets/svg/`, один файл = одна иконка.
- Общие React-обёртки — в `src/ui/` (рядом с `Button.tsx`, `Hero.tsx` и т.д.).
- `assets/brand/logo.svg` — исходник для `npm run logo` (генерация иконок приложения).
  Для UI-иконок его не импортируйте, это тяжёлый логотип 1024×1024.

## 5. Сборка

После изменения `metro.config.js` один раз перезапустите Metro с очисткой кэша:

```bash
cd mobile
npx expo start --clear
```

### Web

```bash
cd mobile
npx expo start --web          # дев-сервер, http://localhost:8081
npx expo export --platform web --output-dir dist-web
```

`react-native-svg` на web рендерится через `react-native-svg/web`; `currentColor` и
наследование `fill` работают.

### iOS

```bash
cd mobile
npx expo prebuild -p ios --clean   # ios/ генерируется, в git не хранится
npx expo run:ios                   # или EAS build
```

`react-native-svg` — нативный модуль, его pod `RNSVG` подключается автоматически
(autolinking). После установки/обновления нативных зависимостей нужен повторный
`pod install` — его делает `expo prebuild` или `npx expo run:ios`.

### Android

```bash
cd mobile
npx expo prebuild -p android --clean
npx expo run:android               # или EAS build
```

### EAS

Отдельная настройка не нужна: `eas build` ставит зависимости из `package.json` и
подхватывает `metro.config.js`. Профили — в `mobile/eas.json`.

### Про Expo Go и пересборку

- `react-native-svg` входит в Expo Go для SDK 58, поэтому примеры и импорт `.svg`
  открываются и в Expo Go: трансформер работает на стороне Metro, нативного кода не добавляет.
- Но после добавления **любого** нативного модуля, которого нет в Expo Go, или изменения
  `app.json`/config-плагинов, Expo Go перестаёт быть достаточным: нужен development build
  (`npx expo run:ios` / `npx expo run:android`) или `eas build`. Это же касается релизных
  сборок — их всегда пересобирают, OTA тут не заменяет нативную часть.
- Изменения только в `.svg`-файлах и TSX подхватываются Fast Refresh, пересборка не нужна.

## 6. Проверки

Выполнено в `mobile/` на момент настройки:

| Команда | Результат |
|---|---|
| `npx expo install react-native-svg` | `react-native-svg@15.16.0` (SDK-совместимая) |
| `npx expo install react-native-svg-transformer` | `react-native-svg-transformer@1.5.3` |
| `npx tsc --noEmit` | 0 ошибок |
| `npx expo lint` | 0 ошибок, 66 предупреждений (все — существовавшие до настройки SVG) |
| `npx expo-doctor` | 20/20 checks passed |
| `npx expo prebuild -p ios --clean` | успешно, CocoaPods поставил 114 подов, включая `RNSVG 15.16.0` |
| `npx expo export --platform web` | бандл собрался |
| `npx expo export --platform ios` | Hermes-бандл собрался |

Сборка Xcode (`xcodebuild`) не запускалась — по договорённости достаточно prebuild.

## 7. Если что-то не работает

- **`Unable to resolve module ./x.svg`** — проверьте, что `metro.config.js` содержит
  `sourceExts.push("svg")` и `babelTransformerPath`, затем `npx expo start --clear`.
- **`Cannot find module './x.svg' or its corresponding type declarations`** — `svg.d.ts`
  должен лежать в `mobile/` и попадать в `include` tsconfig; перезапустите TS-сервер
  в редакторе.
- **Иконка чёрная / не видна** — проверьте `fill`/`stroke`; для контурной иконки нужен
  `fill="none"`, иначе заливка перекрывает `stroke`.
- **Градиент не тот / пропал** — уникальные `id` в `<Defs>`; на web одинаковые `id`
  из разных компонентов конфликтуют.
- **На web иконка есть, на телефоне нет** — проверьте, что импортируется именно компонент,
  а не URL, и что Metro перезапущен после правки конфига.

## 8. Откат трансформера (если понадобится)

Если `react-native-svg-transformer` когда-нибудь конфликтует с обновлением Expo, безопасный
минимум — оставить `react-native-svg` и рисовать инлайн:

1. Вернуть `mobile/metro.config.js` к `module.exports = getDefaultConfig(__dirname);`.
2. Удалить `react-native-svg-transformer` из `package.json` и `npm install`.
3. В `SvgCheck.tsx` убрать импорт `sample-check.svg`; инлайн-часть продолжит работать.

## Источники

- [react-native-svg — Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/svg/)
- [react-native-svg](https://github.com/software-mansion/react-native-svg)
- [react-native-svg-transformer](https://github.com/kristerkari/react-native-svg-transformer)
- [SVGR Playground](https://react-svgr.com/playground/?native=true&typescript=true)

Страница `https://docs.expo.dev/guides/using-svg/` на момент настройки отдаёт 404, поэтому
конфиг Metro собран по шаблону из README трансформера (он же — официальный шаблон Expo
для `getDefaultConfig`).
