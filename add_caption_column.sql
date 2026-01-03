-- Добавляем колонку caption для подписей к фото
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_photos' AND column_name = 'caption'
  ) THEN
    ALTER TABLE site_photos ADD COLUMN caption TEXT;
    RAISE NOTICE 'Колонка caption успешно добавлена';
  ELSE
    RAISE NOTICE 'Колонка caption уже существует';
  END IF;
END $$;

