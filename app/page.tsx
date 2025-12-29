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
    <main style={{ 
      padding: '40px 20px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'Arial, Helvetica, sans-serif',
    }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        style={{ display: 'none' }}
        disabled={uploading}
      />

      {/* Заголовок профиля */}
      <h1 style={{ 
        fontSize: '32px',
        fontWeight: 'bold',
        marginBottom: '40px',
        textAlign: 'center',
      }}>
        ashot.zebelyan
      </h1>

      {/* Профиль с фото и статистикой */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '30px',
        marginBottom: '30px',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {/* Профильное фото */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            backgroundColor: '#e0e0e0',
            border: '2px solid #ddd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Профильное фото"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div style={{ fontSize: '48px', color: '#999' }}>👤</div>
            )}
          </div>
          <button
            onClick={handleButtonClick}
            disabled={uploading}
            style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#0070f3',
              border: '3px solid white',
              color: 'white',
              fontSize: '20px',
              cursor: uploading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            +
          </button>
        </div>

        {/* Статистика */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ fontSize: '16px', color: '#333' }}>
            <strong>40</strong> уникальных кейсов
          </div>
          <div style={{ fontSize: '16px', color: '#333' }}>
            <strong>2578</strong> проектов
          </div>
          <div style={{ fontSize: '16px', color: '#333' }}>
            <strong>4</strong> города
          </div>
        </div>
      </div>

      {/* Услуги */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          fontSize: '14px',
          color: '#666',
          marginBottom: '8px',
        }}>
          Услуги:
        </div>
        <div style={{
          fontSize: '16px',
          color: '#333',
          lineHeight: '1.6',
        }}>
          Проектная реализация, Дизайн интерьера, Мебель на заказ, Комплектация
        </div>
      </div>

      {/* Города */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{
          fontSize: '14px',
          color: '#666',
          marginBottom: '8px',
        }}>
          Города:
        </div>
        <div style={{
          fontSize: '16px',
          color: '#333',
        }}>
          Москва - Питер - Сочи - Краснодар
        </div>
      </div>

      {/* Кнопки действий */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        <button style={{
          padding: '10px 20px',
          fontSize: '14px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          backgroundColor: 'white',
          color: '#333',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
        >
          Редактировать
        </button>
        <button style={{
          padding: '10px 20px',
          fontSize: '14px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          backgroundColor: 'white',
          color: '#333',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
        >
          Поделиться
        </button>
        <button style={{
          padding: '10px 20px',
          fontSize: '14px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          backgroundColor: 'white',
          color: '#333',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
        >
          Связаться
        </button>
      </div>

      {/* Кнопка "Загрузить фото" */}
      <button
        onClick={handleButtonClick}
        disabled={uploading}
        style={{
          width: '100%',
          padding: '14px 20px',
          fontSize: '16px',
          fontWeight: '500',
          backgroundColor: uploading ? '#999' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: uploading ? 'wait' : 'pointer',
          opacity: uploading ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '40px',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!uploading) e.currentTarget.style.backgroundColor = '#0051cc';
        }}
        onMouseLeave={(e) => {
          if (!uploading) e.currentTarget.style.backgroundColor = '#0070f3';
        }}
      >
        <span>📷</span>
        {uploading ? 'Загрузка...' : 'Загрузить фото'}
      </button>

      {/* Галерея всех фотографий */}
      <div style={{ marginTop: '40px' }}>
        <h2 style={{ 
          fontSize: '24px',
          marginBottom: '20px',
          fontWeight: '600',
        }}>
          Все загруженные фотографии ({allImages.length})
        </h2>
        {loadingImages ? (
          <p style={{ color: '#666' }}>Загрузка изображений...</p>
        ) : allImages.length === 0 ? (
          <p style={{ color: '#666' }}>Нет загруженных фотографий</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 20,
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
