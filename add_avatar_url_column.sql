-- Добавляем колонку avatar_url в таблицу site_stats
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

