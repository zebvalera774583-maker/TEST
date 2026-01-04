# План миграции с Supabase на Timeweb

## Что есть в Timeweb:

✅ **Базы данных** (DBaaS) - управляемая PostgreSQL  
✅ **Хранилище S3** - объектное хранилище для файлов  
✅ **App Platform** - для деплоя приложения (уже настраиваете)

---

## План действий:

### Шаг 1: Создать базу данных в Timeweb

1. В левом меню нажмите **"Базы данных"**
2. Нажмите **"Добавить"** или **"Создать базу данных"**
3. Выберите **PostgreSQL**
4. Выберите конфигурацию (минимальная обычно ~300-500 ₽/мес)
5. Запишите данные для подключения:
   - Host (хост)
   - Port (порт, обычно 5432)
   - Database (имя базы)
   - User (пользователь)
   - Password (пароль)

### Шаг 2: Создать S3 хранилище

1. В левом меню нажмите **"Хранилище S3"**
2. Создайте новый bucket (например, "photos" или "test")
3. Настройте публичный доступ (если нужно)
4. Запишите:
   - Endpoint URL
   - Access Key
   - Secret Key
   - Bucket name

### Шаг 3: Миграция данных из Supabase

1. **Экспорт данных из Supabase:**
   - В Supabase Dashboard → SQL Editor
   - Выполните: `SELECT * FROM site_photos;` и сохраните данные
   - Выполните: `SELECT * FROM site_stats;` и сохраните данные

2. **Импорт в Timeweb PostgreSQL:**
   - Подключитесь к Timeweb PostgreSQL
   - Выполните SQL из `supabase_simple_admin.sql` для создания таблиц
   - Импортируйте данные

3. **Миграция файлов:**
   - Скачайте все фото из Supabase Storage
   - Загрузите их в Timeweb S3 Storage

### Шаг 4: Переписать код

Нужно будет изменить:

1. **`lib/supabase.ts` → `lib/database.ts`:**
   - Использовать `pg` (node-postgres) вместо Supabase клиента
   - Настроить подключение к Timeweb PostgreSQL
   - Создать функции для работы с БД

2. **`app/page.tsx`:**
   - Заменить `supabase.from('site_photos').select()` на SQL запросы
   - Заменить `supabase.storage` на S3 клиент

3. **API routes:**
   - `app/api/admin/photos/route.ts` - переписать на PostgreSQL
   - `app/api/admin/avatar/upload/route.ts` - переписать на S3
   - `app/api/stats/increment/route.ts` - переписать на PostgreSQL

4. **Установить зависимости:**
   - `npm install pg @aws-sdk/client-s3`
   - Удалить `@supabase/supabase-js`

### Шаг 5: Обновить переменные окружения

Вместо:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Добавить:
```
DATABASE_URL=postgresql://user:password@host:port/database
S3_ENDPOINT=https://s3.timeweb.cloud
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET_NAME=...
S3_REGION=ru-1
```

---

## Оценка времени:

- **Создание БД и Storage:** 30 минут
- **Миграция данных:** 1-2 часа
- **Переписывание кода:** 2-3 дня
- **Тестирование:** 1 день

**Итого: 3-4 дня работы**

---

## Преимущества миграции:

✅ Всё в одном месте (Timeweb)  
✅ Работает из России без VPN  
✅ Соответствие 152-ФЗ  
✅ Единый биллинг  
✅ Полный контроль над данными

---

## Стоимость:

- **App Platform (Dockerfile):** 810 ₽/мес
- **База данных (PostgreSQL):** ~300-500 ₽/мес
- **S3 Storage:** ~100-200 ₽/мес (за 10-20 ГБ)

**Итого: ~1200-1500 ₽/мес** (вместо бесплатного Supabase, но с российскими серверами)

---

## Рекомендация:

1. **Сначала завершите настройку App Platform** (которую вы сейчас делаете)
2. **Проверьте, работает ли Supabase** на Timeweb
3. **Если Supabase не работает** - тогда начинайте миграцию
4. **Если Supabase работает** - можно оставить как есть (экономия времени)

---

**Хотите начать миграцию сейчас или сначала проверить, работает ли Supabase?**

