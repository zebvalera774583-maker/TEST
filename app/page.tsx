'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';

interface ImageData {
  name: string;
  url: string;
}

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [allImages, setAllImages] = useState<ImageData[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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

  // Функция сжатия изображения
  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 2, // Максимальный размер файла в МБ
      maxWidthOrHeight: 1920, // Максимальная ширина или высота
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      console.log(`Сжато: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
      return compressedFile;
    } catch (error) {
      console.error('Ошибка сжатия:', error);
      return file; // Возвращаем оригинальный файл, если сжатие не удалось
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Проверка переменных окружения
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      alert('Ошибка: переменные окружения Supabase не настроены');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setImageUrl('');

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Пожалуйста, выберите изображения');
      setUploading(false);
      return;
    }

    const uploadedUrls: string[] = [];

    try {
      // Обрабатываем файлы по очереди
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        
        // Сжимаем изображение
        const compressedFile = await compressImage(file);
        
        // Обновляем прогресс
        setUploadProgress(((i + 0.5) / imageFiles.length) * 100);

        // Генерируем уникальное имя файла
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${i}.${fileExt}`;
        const filePath = fileName;

        // Загружаем файл в Supabase Storage
        const { data, error } = await supabase.storage
          .from('Test')
          .upload(filePath, compressedFile, {
            contentType: compressedFile.type,
            upsert: false,
          });

        if (error) {
          console.error('Ошибка загрузки:', error);
          alert(`Ошибка загрузки файла ${file.name}: ${error.message}`);
          continue;
        }

        // Получаем публичный URL файла
        const { data: urlData } = supabase.storage
          .from('Test')
          .getPublicUrl(filePath);

        uploadedUrls.push(urlData.publicUrl);
        
        // Обновляем прогресс
        setUploadProgress(((i + 1) / imageFiles.length) * 100);
      }

      if (uploadedUrls.length > 0) {
        // Устанавливаем первое загруженное изображение как профильное
        setImageUrl(uploadedUrls[0]);
        localStorage.setItem('uploadedImageUrl', uploadedUrls[0]);
        
        // Сохраняем количество изображений до обновления
        const previousCount = allImages.length;
        
        // Обновляем список всех изображений
        await loadAllImages();
        
        // Устанавливаем текущий индекс на первое новое изображение
        // Используем setTimeout, чтобы дождаться обновления состояния allImages
        setTimeout(() => {
          setCurrentImageIndex(previousCount);
        }, 200);
      }

      alert(`Успешно загружено ${uploadedUrls.length} из ${imageFiles.length} фотографий`);
    } catch (error: any) {
      console.error('Ошибка:', error);
      alert(`Ошибка: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Сбрасываем input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
        multiple
        onChange={handleUpload}
        style={{ display: 'none' }}
        disabled={uploading}
      />

      {/* Имя профиля в левом верхнем углу */}
      <h1 style={{ 
        fontSize: '18px',
        fontWeight: 'bold',
        margin: 0,
        marginBottom: '15px',
      }}>
        ashot.zebelyan
      </h1>

      {/* Аватар и статистика */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '15px',
        marginBottom: '20px',
      }}>
        {/* Профильное фото */}
        <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
          <div style={{
            width: '60px',
            height: '60px',
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
              <div style={{ fontSize: '24px', color: '#999' }}>👤</div>
            )}
          </div>
          <button
            onClick={handleButtonClick}
            disabled={uploading}
            style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#0070f3',
              border: '2px solid white',
              color: 'white',
              fontSize: '12px',
              cursor: uploading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: uploading ? 0.6 : 1,
              padding: 0,
              lineHeight: 1,
            }}
          >
            +
          </button>
        </div>

        {/* Статистика вровень с верхом аватара */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '15px',
          flex: 1,
          alignSelf: 'flex-start',
        }}>
          <div style={{ 
            fontSize: '14px', 
            color: '#333',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>40</div>
            <div style={{ fontSize: '12px', color: '#666' }}>уникальных кейсов</div>
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: '#333',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>2578</div>
            <div style={{ fontSize: '12px', color: '#666' }}>проектов</div>
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: '#333',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>4</div>
            <div style={{ fontSize: '12px', color: '#666' }}>города</div>
          </div>
        </div>

        {/* Inbox иконка справа */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: '#333',
          fontSize: '14px',
          cursor: 'pointer',
          alignSelf: 'flex-start',
        }}>
          <span>📥</span>
          <span>Inbox</span>
        </div>
      </div>

      {/* Услуги столбиком, начало совпадает с ashot.zebelyan */}
      <div style={{ 
        marginBottom: '20px',
      }}>
        <div style={{
          fontSize: '16px',
          color: '#333',
          lineHeight: '1.8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}>
          <div>Проектная реализация</div>
          <div>Дизайн интерьера</div>
          <div>Мебель на заказ</div>
          <div>Комплектация</div>
        </div>
      </div>

      {/* Города без слова "Города:" */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          fontSize: '16px',
          color: '#333',
        }}>
          Москва - Питер - Сочи - Краснодар
        </div>
      </div>

      {/* Кнопки действий вровень между собой, над кнопкой "Загрузить фото" */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center',
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

      {/* Кнопка "Загрузить фото" под кнопками действий */}
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
        {uploading ? `Загрузка... ${Math.round(uploadProgress)}%` : 'Загрузить фото'}
      </button>

      {/* Прогресс загрузки */}
      {uploading && (
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
          marginBottom: '20px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${uploadProgress}%`,
            height: '100%',
            backgroundColor: '#0070f3',
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}

      {/* Карусель фотографий */}
      <div style={{ marginTop: '40px' }}>
        <h2 style={{ 
          fontSize: '24px',
          marginBottom: '20px',
          fontWeight: '600',
        }}>
          Фотографии ({allImages.length})
        </h2>
        {loadingImages ? (
          <p style={{ color: '#666' }}>Загрузка изображений...</p>
        ) : allImages.length === 0 ? (
          <p style={{ color: '#666' }}>Нет загруженных фотографий</p>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Карусель */}
            <div style={{
              position: 'relative',
              width: '100%',
              overflow: 'hidden',
              borderRadius: '12px',
              backgroundColor: '#f5f5f5',
            }}>
              {/* Контейнер изображений */}
              <div style={{
                display: 'flex',
                transform: `translateX(-${currentImageIndex * 100}%)`,
                transition: 'transform 0.3s ease',
              }}>
                {allImages.map((image, index) => (
                  <div
                    key={index}
                    style={{
                      minWidth: '100%',
                      width: '100%',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={image.url}
                      alt={image.name}
                      style={{
                        width: '100%',
                        height: '500px',
                        objectFit: 'contain',
                        display: 'block',
                        backgroundColor: '#fff',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Стрелка влево */}
              {allImages.length > 1 && currentImageIndex > 0 && (
                <button
                  onClick={() => setCurrentImageIndex(currentImageIndex - 1)}
                  style={{
                    position: 'absolute',
                    left: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    zIndex: 10,
                  }}
                >
                  ‹
                </button>
              )}

              {/* Стрелка вправо */}
              {allImages.length > 1 && currentImageIndex < allImages.length - 1 && (
                <button
                  onClick={() => setCurrentImageIndex(currentImageIndex + 1)}
                  style={{
                    position: 'absolute',
                    right: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    zIndex: 10,
                  }}
                >
                  ›
                </button>
              )}
            </div>

            {/* Точки-индикаторы */}
            {allImages.length > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '20px',
              }}>
                {allImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: index === currentImageIndex ? '#0070f3' : '#ccc',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Информация о текущем фото */}
            {allImages.length > 0 && (
              <div style={{
                textAlign: 'center',
                marginTop: '15px',
                color: '#666',
                fontSize: '14px',
              }}>
                {currentImageIndex + 1} / {allImages.length}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
