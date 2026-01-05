# Исправление ошибки "Ошибка загрузки заявок"

## Проблема

При нажатии на "Заявки" в меню админки появляется ошибка "Ошибка загрузки заявок".

## Причина

Таблица `contact_requests` не была создана в базе данных Supabase. SQL-скрипт для её создания существовал отдельно (`add_contact_requests_table.sql`), но не был выполнен.

## Решение

Таблица `contact_requests` теперь добавлена в основной SQL-файл `supabase_simple_admin.sql`.

### Что нужно сделать:

1. **Откройте Supabase Dashboard:**
   - Перейдите на https://supabase.com/dashboard
   - Войдите в свой аккаунт
   - Выберите ваш проект

2. **Откройте SQL Editor:**
   - В левом меню нажмите на **"SQL Editor"**

3. **Выполните SQL-запрос:**
   - Скопируйте и выполните следующий SQL-код:

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

-- Включаем RLS для contact_requests
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Политика: публика может только вставлять заявки
DROP POLICY IF EXISTS "Public can insert contact_requests" ON contact_requests;
CREATE POLICY "Public can insert contact_requests" ON contact_requests
  FOR INSERT WITH CHECK (true);
```

4. **Нажмите кнопку "Run"** (или нажмите Ctrl+Enter / Cmd+Enter)

5. **Проверьте результат:**
   - Вы должны увидеть сообщение об успешном выполнении
   - Таблица `contact_requests` теперь создана в базе данных

## После выполнения миграции

После создания таблицы:
- ✅ Раздел "Заявки" в админке будет работать
- ✅ Новые заявки будут сохраняться в базу данных
- ✅ Все заявки будут отображаться в админке

## Проверка

1. Откройте сайт и войдите в админку
2. Нажмите на "Заявки" в гамбургер-меню
3. Должен открыться список заявок (или сообщение "Заявок пока нет", если их нет)

---

**Важно:** Если ошибка сохраняется после выполнения SQL, проверьте:
- Правильно ли настроена переменная окружения `SUPABASE_SERVICE_ROLE_KEY` на сервере (Timeweb)
- Есть ли ошибки в консоли браузера (F12 → Console)
- Есть ли ошибки в логах сервера (Timeweb → Логи)

