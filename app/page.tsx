'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';

interface SitePhoto {
  id: string;
  public_url: string;
  sort_order: number;
  created_at: string;
}

export default function Home() {
  const [photos, setPhotos] = useState<SitePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [openFullscreen, setOpenFullscreen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Загружаем фото и увеличиваем счетчик просмотров
  useEffect(() => {
    loadPhotos();
    incrementViews();
    // Проверяем авторизацию админа
    const authStatus = localStorage.getItem('admin_authenticated');
    if (authStatus === 'true') {
      setIsAdmin(true);
    }
  }, []);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_photos')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Ошибка загрузки фото:', error);
        console.error('Детали ошибки:', JSON.stringify(error, null, 2));
        // Показываем ошибку пользователю
        alert(`Ошибка загрузки фото: ${error.message}. Проверьте, что таблица site_photos создана в Supabase.`);
        return;
      }

      console.log('Загружено фото:', data?.length || 0);
      setPhotos(data || []);
    } catch (error: any) {
      console.error('Ошибка:', error);
      alert(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const incrementViews = async () => {
    try {
      await fetch('/api/stats/increment', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Ошибка обновления статистики:', error);
    }
  };

  // Админ функции
  const handleAdminLogin = async () => {
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem('admin_authenticated', 'true');
        setIsAdmin(true);
        setShowLoginModal(false);
        setAdminPassword('');
      } else {
        alert(data.error || 'Неверный пароль');
      }
    } catch (error) {
      console.error('Ошибка входа:', error);
      alert('Ошибка при входе');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    setIsAdmin(false);
  };

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };
    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error('Ошибка сжатия:', error);
      return file;
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      alert('Пожалуйста, выберите изображения');
      setUploading(false);
      return;
    }

    try {
      const { data: existingPhotos } = await supabase
        .from('site_photos')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);

      let nextSortOrder = 0;
      if (existingPhotos && existingPhotos.length > 0) {
        nextSortOrder = existingPhotos[0].sort_order + 1;
      }

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const compressedFile = await compressImage(file);
        setUploadProgress(((i + 0.5) / imageFiles.length) * 100);

        const fileExt = file.name.split('.').pop();
        const fileName = `site-photo-${Date.now()}-${i}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('Test')
          .upload(fileName, compressedFile, {
            contentType: compressedFile.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Ошибка загрузки:', uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('Test')
          .getPublicUrl(fileName);

        const response = await fetch('/api/admin/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_url: urlData.publicUrl,
            sort_order: nextSortOrder + i,
          }),
        });

        setUploadProgress(((i + 1) / imageFiles.length) * 100);
      }

      await loadPhotos();
      alert(`Успешно загружено ${imageFiles.length} фотографий`);
    } catch (error: any) {
      console.error('Ошибка:', error);
      alert(`Ошибка: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить это фото?')) return;
    try {
      const response = await fetch('/api/admin/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error('Ошибка удаления');
      await loadPhotos();
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка удаления фото');
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    try {
      const photoIndex = photos.findIndex(p => p.id === id);
      if (photoIndex === -1) return;
      const newIndex = direction === 'up' ? photoIndex - 1 : photoIndex + 1;
      if (newIndex < 0 || newIndex >= photos.length) return;

      const currentPhoto = photos[photoIndex];
      const targetPhoto = photos[newIndex];

      const response = await fetch('/api/admin/photos/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id1: currentPhoto.id,
          sort_order1: targetPhoto.sort_order,
          id2: targetPhoto.id,
          sort_order2: currentPhoto.sort_order,
        }),
      });

      if (!response.ok) throw new Error('Ошибка изменения порядка');
      await loadPhotos();
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка изменения порядка');
    }
  };

  if (loading) {
    return (
      <main style={{ 
        padding: '40px 20px',
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <p>Загрузка...</p>
      </main>
    );
  }

  if (photos.length === 0) {
    return (
      <main style={{ 
        padding: '40px 20px',
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <h1>Ашот мебель</h1>
        <p>Фотографии скоро появятся</p>
      </main>
    );
  }

  return (
    <main style={{ 
      padding: '40px 20px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'Arial, Helvetica, sans-serif',
    }}>
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
            {photos[0]?.public_url ? (
              <img
                src={photos[0].public_url}
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

      {/* Кнопка входа/выхода для админа */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        {!isAdmin ? (
          <button
            onClick={() => setShowLoginModal(true)}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              border: '1px solid #0070f3',
              borderRadius: '6px',
              backgroundColor: '#0070f3',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Войти как админ
          </button>
        ) : (
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              border: '1px solid #dc3545',
              borderRadius: '6px',
              backgroundColor: '#dc3545',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Выйти
          </button>
        )}
      </div>

      {/* Кнопка загрузки фото (только для админа) */}
      {isAdmin && (
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <h3 style={{ marginBottom: '10px', fontSize: '16px' }}>Загрузить фото</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            style={{ marginBottom: '10px' }}
          />
          {uploading && (
            <div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e0e0e0',
                borderRadius: '4px',
                marginBottom: '5px',
              }}>
                <div style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  backgroundColor: '#0070f3',
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <p style={{ fontSize: '12px', color: '#666' }}>Загрузка... {Math.round(uploadProgress)}%</p>
            </div>
          )}
        </div>
      )}

      {/* Кнопки действий вровень между собой */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '40px',
        flexWrap: 'nowrap',
        alignItems: 'stretch',
        width: '100%',
      }}>
        <button style={{
          flex: '1',
          padding: '10px 20px',
          fontSize: '14px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          backgroundColor: 'white',
          color: '#333',
          cursor: 'pointer',
          transition: 'all 0.2s',
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
        >
          Редактировать
        </button>
        <button style={{
          flex: '1',
          padding: '10px 20px',
          fontSize: '14px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          backgroundColor: 'white',
          color: '#333',
          cursor: 'pointer',
          transition: 'all 0.2s',
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
        >
          Поделиться
        </button>
        <button style={{
          flex: '1',
          padding: '10px 20px',
          fontSize: '14px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          backgroundColor: 'white',
          color: '#333',
          cursor: 'pointer',
          transition: 'all 0.2s',
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
        >
          Связаться
        </button>
      </div>

      {/* Слайдер фотографий */}
      <div style={{ marginTop: '40px' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
          {/* Контейнер изображений */}
          <div style={{
            display: 'flex',
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: 'transform 0.3s ease',
            height: '100%',
          }}>
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => setOpenFullscreen(true)}
                style={{
                  minWidth: '100%',
                  width: '100%',
                  flexShrink: 0,
                  height: '100%',
                  cursor: 'pointer',
                }}
              >
                <img
                  src={photo.public_url}
                  alt={`Photo ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Стрелка влево */}
          {photos.length > 1 && currentIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(currentIndex - 1);
              }}
              style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '40px',
                height: '40px',
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
          {photos.length > 1 && currentIndex < photos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(currentIndex + 1);
              }}
              style={{
                position: 'absolute',
                right: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '40px',
                height: '40px',
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

          {/* Точки-индикаторы */}
          {photos.length > 1 && (
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '8px',
              zIndex: 10,
            }}>
              {photos.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: index === currentIndex ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Счетчик */}
        {photos.length > 0 && (
          <div style={{
            textAlign: 'center',
            marginTop: '15px',
            color: '#666',
            fontSize: '14px',
          }}>
            {currentIndex + 1} / {photos.length}
          </div>
        )}

        {/* Кнопки управления фото (только для админа) */}
        {isAdmin && photos.length > 0 && (
          <div style={{
            marginTop: '15px',
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <button
              onClick={() => handleMove(photos[currentIndex].id, 'up')}
              disabled={currentIndex === 0}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: currentIndex === 0 ? '#f5f5f5' : 'white',
                color: currentIndex === 0 ? '#999' : '#333',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ↑ Вверх
            </button>
            <button
              onClick={() => handleMove(photos[currentIndex].id, 'down')}
              disabled={currentIndex === photos.length - 1}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: currentIndex === photos.length - 1 ? '#f5f5f5' : 'white',
                color: currentIndex === photos.length - 1 ? '#999' : '#333',
                cursor: currentIndex === photos.length - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ↓ Вниз
            </button>
            <button
              onClick={() => handleDelete(photos[currentIndex].id)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: '1px solid #dc3545',
                borderRadius: '4px',
                backgroundColor: '#dc3545',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Удалить
            </button>
          </div>
        )}
      </div>

      {/* Модальное окно на весь экран */}
      {openFullscreen && (
        <div
          onClick={() => setOpenFullscreen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpenFullscreen(false);
            }
          }}
          tabIndex={0}
        >
          {/* Кнопка закрытия */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenFullscreen(false);
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              zIndex: 1001,
            }}
          >
            ×
          </button>

          {/* Карусель в полном размере */}
          <FullscreenCarousel 
            photos={photos}
            currentIndex={currentIndex}
            onIndexChange={setCurrentIndex}
            onClose={() => setOpenFullscreen(false)}
          />
        </div>
      )}

      {/* Модальное окно входа */}
      {showLoginModal && (
        <div
          onClick={() => setShowLoginModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              maxWidth: '400px',
              width: '90%',
            }}
          >
            <h2 style={{ marginBottom: '20px' }}>Вход в админку</h2>
            <input
              type="password"
              placeholder="Пароль"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAdminLogin();
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '15px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleAdminLogin}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '16px',
                  backgroundColor: '#0070f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Войти
              </button>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setAdminPassword('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '16px',
                  backgroundColor: '#ddd',
                  color: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Компонент карусели для полноэкранного режима
const FullscreenCarousel = ({ 
  photos, 
  currentIndex, 
  onIndexChange, 
  onClose 
}: { 
  photos: SitePhoto[]; 
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onIndexChange(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) {
        onIndexChange(currentIndex + 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, photos.length, onClose, onIndexChange]);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: '90vw',
        maxHeight: '90vh',
      }}
    >
      {/* Контейнер изображений */}
      <div style={{
        display: 'flex',
        transform: `translateX(-${currentIndex * 100}%)`,
        transition: 'transform 0.3s ease',
        width: '100%',
        height: '100%',
      }}>
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            style={{
              minWidth: '100%',
              width: '100%',
              flexShrink: 0,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={photo.public_url}
              alt={`Photo ${index + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        ))}
      </div>

      {/* Стрелка влево */}
      {photos.length > 1 && currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(currentIndex - 1);
          }}
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px',
            zIndex: 1002,
          }}
        >
          ‹
        </button>
      )}

      {/* Стрелка вправо */}
      {photos.length > 1 && currentIndex < photos.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(currentIndex + 1);
          }}
          style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px',
            zIndex: 1002,
          }}
        >
          ›
        </button>
      )}

      {/* Точки-индикаторы */}
      {photos.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '10px',
          zIndex: 1002,
        }}>
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                onIndexChange(index);
              }}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: index === currentIndex ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Счетчик */}
      <div style={{
        position: 'absolute',
        top: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        fontSize: '18px',
        zIndex: 1002,
      }}>
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  );
};
