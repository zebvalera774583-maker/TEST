-- Таблица для хранения фотографий сайта
CREATE TABLE IF NOT EXISTS site_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  group_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Добавляем колонку group_id, если её нет (для существующих таблиц)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_photos' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE site_photos ADD COLUMN group_id TEXT;
  END IF;
END $$;

-- Индекс для сортировки
CREATE INDEX IF NOT EXISTS idx_site_photos_sort_order ON site_photos(sort_order);

-- Таблица для статистики сайта
CREATE TABLE IF NOT EXISTS site_stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  views_total BIGINT NOT NULL DEFAULT 0,
  avatar_url TEXT,
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

-- Добавляем колонку avatar_url, если её нет (для существующих таблиц)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_stats' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE site_stats ADD COLUMN avatar_url TEXT;
    RAISE NOTICE 'Колонка avatar_url успешно добавлена';
  ELSE
    RAISE NOTICE 'Колонка avatar_url уже существует';
  END IF;
END $$;

-- Политики для админки (запись/удаление через service role key)
-- Эти операции будут выполняться через supabaseAdmin, который обходит RLS
