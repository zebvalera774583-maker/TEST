# Supabase Credentials - Шаблон для подключения

## Необходимые переменные окружения

Создайте файл `.env.local` в корне проекта (`test/.env.local`) со следующим содержимым:

```env
# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Anon/Public Key (для клиентской части)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Supabase Service Role Key (только для серверной части - API routes)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Где получить эти значения:

1. **NEXT_PUBLIC_SUPABASE_URL**:
   - Зайдите в [Supabase Dashboard](https://app.supabase.com)
   - Выберите ваш проект
   - Перейдите в **Settings** → **API**
   - Скопируйте значение **Project URL**

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**:
   - В том же разделе **Settings** → **API**
   - Скопируйте значение **anon public** key
   - Это ключ для клиентской части приложения

3. **SUPABASE_SERVICE_ROLE_KEY**:
   - В разделе **Settings** → **API**
   - Скопируйте значение **service_role** key
   - ⚠️ **ВАЖНО**: Этот ключ имеет полные права доступа!
   - Используется только в API routes на сервере
   - НЕ должен быть доступен в браузере

## Текущая конфигурация проекта:

- **Bucket для хранения файлов**: `Test`
- **Клиент для клиента**: `lib/supabase.ts` → `supabase`
- **Клиент для сервера**: `lib/supabase.ts` → `supabaseAdmin`

## Безопасность:

- ✅ Файл `.env.local` уже добавлен в `.gitignore`
- ✅ Переменные с префиксом `NEXT_PUBLIC_` доступны в браузере
- ✅ `SUPABASE_SERVICE_ROLE_KEY` НЕ имеет префикса `NEXT_PUBLIC_` - доступен только на сервере
- ❌ НЕ коммитьте `.env.local` в git
- ❌ НЕ публикуйте `SUPABASE_SERVICE_ROLE_KEY` публично

## Проверка подключения:

После настройки переменных окружения:

1. Перезапустите dev сервер: `npm run dev`
2. Откройте консоль браузера (F12)
3. Проверьте, что нет ошибок подключения к Supabase

## Структура файла .env.local:

```
test/
├── .env.local          ← Создайте этот файл с вашими credentials
├── lib/
│   └── supabase.ts     ← Использует переменные из .env.local
└── ...
```

