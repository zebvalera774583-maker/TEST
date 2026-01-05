# ЧТО ДЕЛАТЬ ПРЯМО СЕЙЧАС

## ШАГ 1: Исправить форму "Узнать стоимость" (2 минуты)

### Что сделать:

1. **Откройте Supabase:**
   - Перейдите на https://supabase.com/dashboard
   - Войдите в аккаунт
   - Выберите проект, где развернут ваш сайт

2. **Откройте SQL Editor:**
   - В левом меню найдите "SQL Editor"
   - Нажмите "New query" (Новый запрос)

3. **Скопируйте и вставьте этот SQL:**

```sql
CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON contact_requests(created_at DESC);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert contact_requests" ON contact_requests;
CREATE POLICY "Public can insert contact_requests" ON contact_requests
  FOR INSERT WITH CHECK (true);
```

4. **Нажмите "Run"** (или Ctrl+Enter)

5. **Проверьте:**
   - Должно появиться сообщение "Success"
   - Перейдите в "Table Editor" → найдите таблицу `contact_requests`

6. **Проверьте форму на сайте:**
   - Обновите страницу (F5)
   - Нажмите "Узнать стоимость"
   - Заполните форму и отправьте
   - Должно работать!

---

## ШАГ 2: Проверить прокрутку wheel (1 минута)

### Что сделать:

1. **Откройте сайт на компьютере** (не на телефоне!)

2. **Откройте любое фото в полноэкранном режиме**

3. **Прокрутите колесиком мыши вверх/вниз**

4. **Проверьте:**
   - Меняется ли фото при прокрутке?
   - Если НЕТ - откройте консоль (F12) и посмотрите ошибки

---

## Если форма НЕ работает после SQL:

1. Проверьте, что вы выполнили SQL в правильном проекте Supabase
2. Проверьте переменные окружения в Timeweb:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
3. Посмотрите логи в Timeweb (если есть доступ)

---

## Если прокрутка НЕ работает:

1. Откройте консоль браузера (F12 → Console)
2. Прокрутите колесиком
3. Посмотрите, есть ли ошибки
4. Сообщите мне, что видите в консоли

---

## После выполнения:

Сообщите мне:
- ✅ Форма работает / ❌ Форма не работает
- ✅ Прокрутка работает / ❌ Прокрутка не работает
- Если что-то не работает - что именно и какие ошибки видите

