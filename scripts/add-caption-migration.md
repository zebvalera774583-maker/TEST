# Выполнение SQL-миграции для добавления колонки caption

К сожалению, Supabase JS клиент **не поддерживает** выполнение произвольных SQL-запросов (DDL команды типа ALTER TABLE) из соображений безопасности.

## Способ 1: Через SQL Editor (Рекомендуется)

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **SQL Editor** (в левом меню)
4. Скопируйте и вставьте следующий SQL:

```sql
ALTER TABLE site_photos ADD COLUMN IF NOT EXISTS caption TEXT;
```

5. Нажмите **Run** (или Ctrl+Enter)

## Способ 2: Через Supabase CLI (Если установлен)

Если у вас установлен Supabase CLI:

```bash
# 1. Установите CLI (если не установлен)
npm install -g supabase

# 2. Войдите в аккаунт
supabase login

# 3. Свяжите проект (если еще не связано)
supabase link --project-ref your-project-ref

# 4. Примените миграцию
supabase db push
```

Но для этого нужно настроить локальный проект Supabase с папкой migrations.

## Способ 3: Прямое подключение к PostgreSQL (Только если есть connection string)

Если у вас есть прямой connection string к базе данных, можно использовать `pg`:

```bash
npm install pg
```

Создайте скрипт с connection string и выполните миграцию.

---

**Рекомендация**: Используйте Способ 1 (SQL Editor) - это самый простой и безопасный метод.

