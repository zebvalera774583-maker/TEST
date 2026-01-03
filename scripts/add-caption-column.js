/**
 * Скрипт для добавления колонки caption в таблицу site_photos
 * 
 * Использование:
 * 1. Установите dotenv: npm install dotenv
 * 2. Создайте файл .env.local с переменными:
 *    NEXT_PUBLIC_SUPABASE_URL=your_url
 *    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 * 3. Запустите: node scripts/add-caption-column.js
 */

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Ошибка: NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY должны быть установлены в .env.local');
  process.exit(1);
}

// Извлекаем host из URL Supabase
const url = new URL(supabaseUrl);
const dbHost = url.hostname;
// Для Supabase, connection string нужно получать из настроек проекта
// Но мы можем использовать REST API для выполнения SQL через pg_rest

console.log('Попытка выполнить миграцию через REST API...');

// К сожалению, Supabase REST API не поддерживает выполнение произвольных DDL команд
// Нужно использовать либо SQL Editor, либо прямой доступ к PostgreSQL
console.log(`
К сожалению, автоматическое выполнение SQL-миграций через Supabase JS клиент невозможно.

Выполните SQL вручную в Supabase SQL Editor:
1. Откройте https://supabase.com/dashboard
2. Выберите ваш проект
3. Перейдите в SQL Editor
4. Скопируйте и выполните:

ALTER TABLE site_photos ADD COLUMN IF NOT EXISTS caption TEXT;

Или используйте Supabase CLI:
1. Установите: npm install -g supabase
2. Запустите: supabase db push
`);

