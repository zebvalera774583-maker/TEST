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

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [photos, setPhotos] = useState<SitePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Проверяем авторизацию при загрузке
  useEffect(() => {
    const authStatus = localStorage.getItem('admin_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      loadPhotos();
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('admin_authenticated', 'true');
        setIsAuthenticated(true);
        loadPhotos();
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
    setIsAuthenticated(false);
    setPassword('');
  };

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_photos')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Ошибка загрузки фото:', error);
        alert('Ошибка загрузки фото');
        return;
      }

      setPhotos(data || []);
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка загрузки фото');
    } finally {
      setLoading(false);
    }
  };

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
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
      // Получаем максимальный sort_order
      const { data: existingPhotos } = await supabase
        .from('site_photos')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);

      let nextSortOrder = 0;
      if (existingPhotos && existingPhotos.length > 0) {
        nextSortOrder = existingPhotos[0].sort_order + 1;
      }

      // Загружаем файлы
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const compressedFile = await compressImage(file);
        setUploadProgress(((i + 0.5) / imageFiles.length) * 100);

        // Генерируем имя файла
        const fileExt = file.name.split('.').pop();
        const fileName = `site-photo-${Date.now()}-${i}.${fileExt}`;
        const filePath = fileName;

        // Загружаем в Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('Test')
          .upload(filePath, compressedFile, {
            contentType: compressedFile.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Ошибка загрузки:', uploadError);
          continue;
        }

        // Получаем публичный URL
        const { data: urlData } = supabase.storage
          .from('Test')
          .getPublicUrl(filePath);

        // Сохраняем в БД через API (используем service role key)
        const response = await fetch('/api/admin/photos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            public_url: urlData.publicUrl,
            sort_order: nextSortOrder + i,
          }),
        });

        if (!response.ok) {
          console.error('Ошибка сохранения в БД');
        }

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления');
      }

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

      // Меняем местами sort_order
      const response = await fetch('/api/admin/photos/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id1: currentPhoto.id,
          sort_order1: targetPhoto.sort_order,
          id2: targetPhoto.id,
          sort_order2: currentPhoto.sort_order,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка изменения порядка');
      }

      await loadPhotos();
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка изменения порядка');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Загрузка...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div style={{ 
        padding: '40px', 
        maxWidth: '400px', 
        margin: '100px auto',
        border: '1px solid #ddd',
        borderRadius: '8px',
      }}>
        <h1 style={{ marginBottom: '20px' }}>Вход в админку</h1>
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleLogin();
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
        <button
          onClick={handleLogin}
          style={{
            width: '100%',
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
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Админка "Ашот мебель"</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Выйти
        </button>
      </div>

      {/* Загрузка фото */}
      <div style={{ marginBottom: '40px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '15px' }}>Загрузить фото</h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          disabled={uploading}
          style={{ marginBottom: '15px' }}
        />
        {uploading && (
          <div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e0e0e0',
              borderRadius: '4px',
              marginBottom: '10px',
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                backgroundColor: '#0070f3',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p>Загрузка... {Math.round(uploadProgress)}%</p>
          </div>
        )}
      </div>

      {/* Список фото */}
      <div>
        <h2 style={{ marginBottom: '20px' }}>Фотографии ({photos.length})</h2>
        {photos.length === 0 ? (
          <p>Нет загруженных фотографий</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#f9f9f9',
                }}
              >
                <img
                  src={photo.public_url}
                  alt={`Photo ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <div style={{ padding: '10px' }}>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                    Порядок: {photo.sort_order}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleMove(photo.id, 'up')}
                      disabled={index === 0}
                      style={{
                        flex: '1',
                        padding: '6px 12px',
                        fontSize: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                        opacity: index === 0 ? 0.5 : 1,
                      }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMove(photo.id, 'down')}
                      disabled={index === photos.length - 1}
                      style={{
                        flex: '1',
                        padding: '6px 12px',
                        fontSize: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        cursor: index === photos.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: index === photos.length - 1 ? 0.5 : 1,
                      }}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => handleDelete(photo.id)}
                      style={{
                        flex: '1',
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Статистика */}
      <div style={{ marginTop: '40px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '15px' }}>Статистика</h2>
        <StatsComponent />
      </div>
    </div>
  );
}

// Компонент статистики
function StatsComponent() {
  const [stats, setStats] = useState<{ views_total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('site_stats')
        .select('views_total')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('Ошибка загрузки статистики:', error);
        return;
      }

      setStats(data);
    } catch (error) {
      console.error('Ошибка:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p>Загрузка статистики...</p>;
  }

  return (
    <div>
      <p style={{ fontSize: '18px' }}>
        <strong>Всего просмотров:</strong> {stats?.views_total || 0}
      </p>
    </div>
  );
}
