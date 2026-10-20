#!/usr/bin/env bash
# Логотип -> иконки приложения. Источник: assets/brand/logo.svg (квадратный, 1024x1024).
# Запуск: npm run logo
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f assets/brand/logo.svg ]; then
  echo "Нет assets/brand/logo.svg" >&2
  exit 1
fi

rm -rf /tmp/moby-logo && mkdir -p /tmp/moby-logo
# macOS QuickLook умеет рендерить SVG без сторонних библиотек
qlmanage -t -s 1024 -o /tmp/moby-logo assets/brand/logo.svg >/dev/null 2>&1
cp /tmp/moby-logo/logo.svg.png assets/brand/logo-1024.png

sips -s format png assets/brand/logo-1024.png --out assets/icon.png >/dev/null
sips -Z 512 assets/brand/logo-1024.png --out assets/splash-icon.png >/dev/null
sips -Z 48 assets/brand/logo-1024.png --out assets/favicon.png >/dev/null
sips -Z 256 assets/brand/logo-1024.png --out assets/brand/logo.png >/dev/null

# Android adaptive icon: знак занимает ~66%, остальное — фон
sips -Z 680 assets/brand/logo-1024.png --out /tmp/moby-logo/fg.png >/dev/null
sips -p 1024 1024 --padColor F8FAFC /tmp/moby-logo/fg.png --out assets/android-icon-foreground.png >/dev/null

echo "Готово: icon.png, splash-icon.png, favicon.png, android-icon-foreground.png, brand/logo.png"
