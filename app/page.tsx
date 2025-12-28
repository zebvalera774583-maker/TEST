'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ImageData {
  name: string;
  url: string;
}

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [allImages, setAllImages] = useState<ImageData[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Загружаем все изображения из Supabase при загрузке страницы
  useEffect(() => {
    loadAllImages();
    const savedUrl = localStorage.getItem('uploadedImageUrl');
    if (savedUrl) {
      setImageUrl(savedUrl);
    }
  }, []);

  const loadAllImages = async () => {
    try {
      setLoadingImages(true);
      
      // Используем API endpoint для получения списка изображений
      // Это работает через service role key, который имеет полные права
      const response = await fetch('/api/images');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Ошибка загрузки списка файлов:', errorData);
        alert(`Ошибка загрузки изображений: ${errorData.error || 'Неизвестная ошибка'}`);
        return;
      }

      const result = await response.json();
      
      if (result.success && result.images) {
        setAllImages(result.images);
      } else {
        console.error('Неожиданный формат ответа:', result);
        setAllImages([]);
      }
    } catch (error) {
      console.error('Ошибка при загрузке изображений:', error);
      alert('Ошибка при загрузке изображений. Проверьте консоль для деталей.');
    } finally {
      setLoadingImages(false);
    }
  };

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
      
      // Обновляем список всех изображений
      await loadAllImages();
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
          <h2>Последнее загруженное изображение:</h2>
          <img
            src={imageUrl}
            alt="Загруженное изображение"
            style={{
              maxWidth: '100%',
              maxHeight: '500px',
              display: 'block',
              marginTop: 10,
            }}
          />
        </div>
      )}

      <div style={{ marginTop: 40 }}>
        <h2>Все загруженные фотографии ({allImages.length}):</h2>
        {loadingImages ? (
          <p>Загрузка изображений...</p>
        ) : allImages.length === 0 ? (
          <p>Нет загруженных фотографий</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 20,
              marginTop: 20,
            }}
          >
            {allImages.map((image, index) => (
              <div
                key={index}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  padding: 10,
                  backgroundColor: '#f9f9f9',
                }}
              >
                <img
                  src={image.url}
                  alt={image.name}
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover',
                    borderRadius: 4,
                    display: 'block',
                  }}
                />
                <p
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: '#666',
                    wordBreak: 'break-all',
                  }}
                >
                  {image.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
