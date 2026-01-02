# Ашот мебель - Фото галерея

Проект для отображения фотографий мебели с админ-панелью для управления.

## Технологии

- Next.js 16
- React 19
- TypeScript
- Supabase (Storage + Database)
- Vercel (деплой)

## Функционал

- Публичная страница с галереей фотографий (3 колонки, как в Instagram)
- Админ-панель для загрузки и управления фотографиями
- Загрузка аватарки профиля
- Карусели для групповых загрузок
- Полноэкранный просмотр фотографий
- Счетчик просмотров

## Настройка

1. Выполните SQL из `supabase_simple_admin.sql` в Supabase SQL Editor
2. Настройте переменные окружения в Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`

## Запуск

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

## Деплой

Проект автоматически деплоится на Vercel при push в main ветку.
