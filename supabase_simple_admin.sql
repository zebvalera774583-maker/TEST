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
-- Удаляем политики, если они существуют, затем создаем заново
DROP POLICY IF EXISTS "Public can read site_photos" ON site_photos;
CREATE POLICY "Public can read site_photos" ON site_photos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read site_stats" ON site_stats;
CREATE POLICY "Public can read site_stats" ON site_stats
  FOR SELECT USING (true);

-- Политики для админки (запись/удаление через service role key)
-- Эти операции будут выполняться через supabaseAdmin, который обходит RLS
