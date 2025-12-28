'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Загружаем сохраненный URL при загрузке страницы
  useEffect(() => {
    const savedUrl = localStorage.getItem('uploadedImageUrl');
    if (savedUrl) {
      setImageUrl(savedUrl);
    }
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка, что это изображение
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    // Проверка переменных окружения
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      alert('Ошибка: переменные окружения Supabase не настроены');
      return;
    }

    setUploading(true);
    setImageUrl('');

    try {
      // Генерируем уникальное имя файла
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = fileName;

      // Загружаем файл напрямую в Supabase Storage
      const { data, error } = await supabase.storage
        .from('Test')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error('Ошибка загрузки:', error);
        alert(`Ошибка: ${error.message}`);
        return;
      }

      // Получаем публичный URL файла
      const { data: urlData } = supabase.storage
        .from('Test')
        .getPublicUrl(filePath);

      setImageUrl(urlData.publicUrl);
      // Сохраняем URL в localStorage
      localStorage.setItem('uploadedImageUrl', urlData.publicUrl);
    } catch (error: any) {
      console.error('Ошибка:', error);
      alert(`Ошибка: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>ТЕСТ!!!</h1>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        style={{ display: 'none' }}
        disabled={uploading}
      />

      <button
        onClick={handleButtonClick}
        disabled={uploading}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          fontSize: 16,
          cursor: uploading ? 'wait' : 'pointer',
          opacity: uploading ? 0.6 : 1,
        }}
      >
        {uploading ? 'Загрузка...' : 'ГРУЗИТЬ'}
      </button>

      {imageUrl && (
        <div style={{ marginTop: 20 }}>
          <img
            src={imageUrl}
            alt="Загруженное изображение"
            style={{
              maxWidth: '100%',
              maxHeight: '500px',
              display: 'block',
            }}
          />
        </div>
      )}
    </main>
  );
}
