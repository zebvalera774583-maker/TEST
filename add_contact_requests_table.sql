-- Таблица для хранения заявок с сайта
CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индекс для сортировки
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON contact_requests(created_at DESC);

-- Включаем RLS (Row Level Security)
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Политика: только админы могут читать (через service_role), публика может только вставлять
-- Для публичного доступа на запись (INSERT) - разрешаем всем
DROP POLICY IF EXISTS "Public can insert contact_requests" ON contact_requests;
CREATE POLICY "Public can insert contact_requests" ON contact_requests
  FOR INSERT WITH CHECK (true);

-- Чтение будет через service_role key (обходит RLS)

