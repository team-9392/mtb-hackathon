# Сборка Moby Family своими руками

Всё делается из папки `mobile/`. Node и Xcode уже стоят.

## 0. Один раз
```bash
cd mobile
npm install
npx expo prebuild -p ios     # создаёт ios/ (в git не хранится)
```
Подпись уже прописана в `app.json`: `ios.appleTeamId = F66252VQWS` — при prebuild Xcode
сам подставит команду в проект, руками в Xcode ничего менять не нужно.

## 1. Android APK (облако, телефон не нужен)
```bash
cd mobile
export EXPO_TOKEN=$(cat ../.secrets/expo-token.txt)
npx eas-cli@latest build --platform android --profile preview --non-interactive
```
В конце печатается ссылка на `.apk` и страница сборки. Ничего не нажимать, ждать ~10 минут.

## 2. iOS на подключённый iPhone
```bash
cd mobile
npx expo run:ios --device 00008140-001538EC3C93801C --configuration Release
```
Телефон подключён кабелем и разблокирован. Флаг `--configuration Release` обязателен:
Debug-сборка ищет Metro и без него показывает «No script URL provided».

Если добавили нативную библиотеку (например `expo-notifications`) — сначала
`cd ios && pod install`, потом снова `expo run:ios`.

## 3. Xcode, Cmd+R
Debug из Xcode требует запущенного Metro:
```bash
cd mobile && npx expo start
```
Без Metro — снова «No script URL provided». Для запуска без Metro:
Product → Scheme → Edit Scheme → Run → Build Configuration = **Release**.

**Нельзя** запускать Cmd+R, пока в терминале работает `expo run:ios` или `xcodebuild`:
Xcode упадёт с `unable to initiate PIF transfer session (operation in progress?)`.

## 4. Логотип и иконки
Источник один: `mobile/assets/brand/logo.svg` (квадрат 1024×1024).

```bash
cd mobile && npm run logo
```
Скрипт `scripts/logo.sh` делает из SVG: `icon.png` (1024), `splash-icon.png` (512),
`favicon.png` (48), `android-icon-foreground.png` (адаптивная иконка) и
`brand/logo.png` для экрана открытия.

После замены лого:
- **Android** — просто новая EAS-сборка (п. 1), иконки подхватятся сами;
- **iOS** — `npx expo prebuild -p ios --clean` (пересоздаст ios/ с новыми иконками),
  затем `npx expo run:ios --device … --configuration Release`.

Иконка в приложении на телефоне **не меняется без переустановки** — это нативные ассеты.

## 5. Проверка перед сборкой
```bash
cd mobile
npx tsc --noEmit
npx expo lint
```
Оба должны быть чистыми по ошибкам (warnings — стилевые, не блокируют).

## Частые ошибки
| Симптом | Причина |
|---|---|
| `PIF transfer session (operation in progress?)` | две сборки одновременно: Xcode + терминал |
| `No script URL provided` | Debug без Metro → `npx expo start` или Release |
| `Command PhaseScriptExecution failed` | Metro/нода не видны из Xcode: сборка через `expo run:ios` |
| `Signing for MobyFamily requires a development team` | не сработал `appleTeamId` → `npx expo prebuild -p ios --clean` |
| `Unable to launch … device was not unlocked` | разблокировать iPhone и повторить |
