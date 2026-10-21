# Макеты MobyFamily (HTML-прототипы)

Оригинальные макеты от дизайнера, без изменений. Каждый файл — самодостаточный HTML (Tailwind CDN + Inter), открывается в браузере.

| Файл | Экран |
|---|---|
| mobyfamily.html | прототип главной (ранняя версия) |
| mobyfamily (1).html | карта крупным планом: BYN + МТбанк + MT, панель перекрывает низ |
| mobyfamily_main_dark_theme.html | главная: баланс, карта, действия, копилка, операции |
| mobyfamily_tasks_dark_theme.html | задания/тесты |
| mobyfamily_profile_dark_theme.html | профиль и аналитика трат |
| mobyfamily_kopilka_dark_theme.html | копилка |

Реализация в приложении: mobile/src/app/parent/(tabs)/index.tsx, mobile/src/app/child/(tabs)/index.tsx,
компоненты — mobile/src/ui/CardPeek.tsx, mobile/src/ui/Glow.tsx, mobile/src/ui/GlassCard.tsx;
токены — mobile/src/theme/*.
