# Создание таблицы contact_requests в Supabase

## Проблема
Ошибка: "Could not find the table 'public.contact_requests' in the schema cache"

Это означает, что таблица `contact_requests` не существует в вашей базе данных Supabase.

## Решение

### Шаг 1: Откройте Supabase Dashboard
1. Перейдите на https://supabase.com/dashboard
2. Войдите в свой аккаунт
3. Выберите проект, в котором развернуто приложение

### Шаг 2: Откройте SQL Editor
1. В левом меню найдите раздел **"SQL Editor"**
2. Нажмите на него
3. Нажмите кнопку **"New query"** (Новый запрос)

### Шаг 3: Выполните SQL миграцию
Скопируйте и вставьте следующий SQL код в редактор:

```sql
-- Таблица для хранения заявок с сайта
CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индекс для сортировки заявок
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON contact_requests(created_at DESC);

-- Включаем RLS (Row Level Security)
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Политика: публика может только вставлять заявки
DROP POLICY IF EXISTS "Public can insert contact_requests" ON contact_requests;
CREATE POLICY "Public can insert contact_requests" ON contact_requests
  FOR INSERT WITH CHECK (true);
```

### Шаг 4: Запустите SQL
1. Нажмите кнопку **"Run"** (Запустить) или используйте сочетание клавиш `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
2. Дождитесь сообщения об успешном выполнении

### Шаг 5: Проверка
После выполнения SQL вы должны увидеть сообщение:
- "Success. No rows returned" или
- "Success. Rows affected: 0" (если таблица уже существовала)

### Шаг 6: Проверьте таблицу
1. В левом меню найдите раздел **"Table Editor"**
2. Найдите таблицу `contact_requests` в списке
3. Убедитесь, что она создана и содержит колонки:
   - `id` (UUID)
   - `name` (TEXT)
   - `phone` (TEXT)
   - `comment` (TEXT, nullable)
   - `created_at` (TIMESTAMPTZ)

## После создания таблицы

1. Обновите страницу сайта (F5 или перезагрузите в браузере)
2. Попробуйте снова отправить форму "Узнать стоимость"
3. Форма должна работать корректно

## Если ошибка сохраняется

1. Проверьте, что вы выполнили SQL в правильном проекте Supabase
2. Убедитесь, что переменные окружения `SUPABASE_SERVICE_ROLE_KEY` и `NEXT_PUBLIC_SUPABASE_URL` правильно настроены в Timeweb
3. Проверьте логи сервера в Timeweb для дополнительной информации об ошибке

## Альтернативный способ (через Table Editor)

Если SQL Editor не работает, вы можете создать таблицу вручную:

1. Перейдите в **"Table Editor"**
2. Нажмите **"New table"**
3. Назовите таблицу: `contact_requests`
4. Добавьте колонки:
   - `id` - UUID, Primary Key, Default: `gen_random_uuid()`
   - `name` - TEXT, Not Null
   - `phone` - TEXT, Not Null
   - `comment` - TEXT, Nullable
   - `created_at` - TIMESTAMPTZ, Not Null, Default: `now()`
5. Сохраните таблицу
6. Перейдите в **"Authentication" → "Policies"**
7. Создайте политику для INSERT:
   - Policy name: "Public can insert contact_requests"
   - Allowed operation: INSERT
   - Target roles: anon, authenticated
   - USING expression: `true`
   - WITH CHECK expression: `true`

