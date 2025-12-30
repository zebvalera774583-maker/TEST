-- Добавляем колонку group_id в таблицу site_photos
-- ВЫПОЛНИТЕ ЭТОТ SQL В SUPABASE SQL EDITOR!

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_photos' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE site_photos ADD COLUMN group_id TEXT;
    RAISE NOTICE 'Колонка group_id успешно добавлена';
  ELSE
    RAISE NOTICE 'Колонка group_id уже существует';
  END IF;
END $$;

-- Проверяем, что колонка добавлена
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'site_photos' AND column_name = 'group_id';

