# Инструкция по настройке Supabase

## Шаг 1: Выполнение SQL в Supabase

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. В левом меню нажмите **SQL Editor**
4. Нажмите **New Query**
5. Скопируйте и вставьте весь SQL код ниже:

```sql
-- Таблица для хранения фотографий сайта
CREATE TABLE IF NOT EXISTS site_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индекс для сортировки
CREATE INDEX IF NOT EXISTS idx_site_photos_sort_order ON site_photos(sort_order);

-- Таблица для статистики сайта
CREATE TABLE IF NOT EXISTS site_stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  views_total BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Вставляем начальную запись статистики
INSERT INTO site_stats (id, views_total, updated_at)
VALUES (1, 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- Включаем RLS (Row Level Security)
ALTER TABLE site_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_stats ENABLE ROW LEVEL SECURITY;

-- Политики для публичного доступа (чтение)
CREATE POLICY "Public can read site_photos" ON site_photos
  FOR SELECT USING (true);

CREATE POLICY "Public can read site_stats" ON site_stats
  FOR SELECT USING (true);
```

6. Нажмите **Run** (или клавишу F5)
7. Должно появиться сообщение "Success. No rows returned"

## Шаг 2: Проверка создания таблиц

1. В Supabase Dashboard перейдите в **Table Editor**
2. Должны появиться две таблицы:
   - `site_photos`
   - `site_stats`

## Шаг 3: Настройка переменных окружения в Vercel

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Settings** → **Environment Variables**
4. Добавьте следующие переменные (если их еще нет):
   - `NEXT_PUBLIC_SUPABASE_URL` = ваш Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = ваш Supabase Anon Key
   - `SUPABASE_SERVICE_ROLE_KEY` = ваш Supabase Service Role Key
   - `ADMIN_PASSWORD` = ваш пароль для админки (например: `admin123`)

5. После добавления переменных нажмите **Redeploy** для передеплоя

## Шаг 4: Проверка работы

1. Откройте ваш сайт: `https://ваш-домен.vercel.app`
2. Должна отображаться страница (пока без фото)
3. Откройте `/admin`: `https://ваш-домен.vercel.app/admin`
4. Введите пароль, который вы установили в `ADMIN_PASSWORD`
5. Загрузите фотографии

## Готово! 🎉

После загрузки фото они появятся на главной странице.

