'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';
import AdminMenu from './components/AdminMenu';
import ContactRequests from './components/ContactRequests';
import PageWeightIndicator from './components/PageWeightIndicator';
import FullscreenCarousel from './components/FullscreenCarousel';
import { useGallery } from './hooks/useGallery';

interface SitePhoto {
  id: string;
  public_url: string;
  sort_order: number;
  created_at: string;
  group_id?: string; // ID группы загрузки
  caption?: string; // Подпись к фото
}

interface PhotoGroup {
  groupId: string;
  photos: SitePhoto[];
}

// Константа для имени профиля (единый источник)
const PROFILE_NAME = 'ashot-zebelyan';

export default function Home() {
  const [photos, setPhotos] = useState<SitePhoto[]>([]);
  const [photoGroups, setPhotoGroups] = useState<PhotoGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Галерея - вся логика навигации и состояния
  const gallery = useGallery(photoGroups);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', comment: '' });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [showContactRequests, setShowContactRequests] = useState(false);
  const [shareNotification, setShareNotification] = useState<string | null>(null);

  // Загружаем фото и увеличиваем счетчик просмотров
  useEffect(() => {
    loadPhotos();
    loadAvatar();
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
        .order('created_at', { ascending: false }); // Новые сверху

      if (error) {
        console.error('Ошибка загрузки фото:', error);
        console.error('Детали ошибки:', JSON.stringify(error, null, 2));
        // Показываем ошибку пользователю
        alert(`Ошибка загрузки фото: ${error.message}. Проверьте, что таблица site_photos создана в Supabase.`);
        return;
      }

      console.log('Загружено фото из БД:', data?.length || 0);
      console.log('Данные фото:', JSON.stringify(data, null, 2));
      setPhotos(data || []);
      
      // Группируем фото по group_id или created_at (для старых фото без group_id)
      const grouped: { [key: string]: SitePhoto[] } = {};
      (data || []).forEach(photo => {
        // Используем group_id если есть, иначе создаем группу по времени создания (округленное до секунды)
        const groupId = photo.group_id || `group-${Math.floor(new Date(photo.created_at).getTime() / 1000)}`;
        if (!grouped[groupId]) {
          grouped[groupId] = [];
        }
        grouped[groupId].push(photo);
      });
      
      const groups: PhotoGroup[] = Object.keys(grouped)
        .map(groupId => ({
          groupId,
          photos: grouped[groupId].sort((a, b) => a.sort_order - b.sort_order),
          // Используем самую раннюю дату создания в группе для сортировки
          latestCreated: Math.max(...grouped[groupId].map(p => new Date(p.created_at).getTime())),
        }))
        .sort((a, b) => b.latestCreated - a.latestCreated) // Новые группы сверху
        .map(({ latestCreated, ...group }) => group); // Убираем временное поле
      
      console.log('Сгруппировано групп:', groups.length);
      console.log('Группы:', JSON.stringify(groups, null, 2));
      
      // Если групп нет, но фото есть - создаем группы из одиночных фото
      if (groups.length === 0 && data && data.length > 0) {
        console.log('Создаем группы из одиночных фото');
        const singleGroups: PhotoGroup[] = data
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Новые сверху
          .map((photo) => ({
            groupId: `single-${photo.id}`,
            photos: [photo],
          }));
        setPhotoGroups(singleGroups);
      } else {
        setPhotoGroups(groups);
      }
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

  const loadAvatar = async () => {
    try {
      const response = await fetch('/api/admin/avatar');
      if (!response.ok) throw new Error('Ошибка загрузки аватарки');
      const data = await response.json();
      setAvatarUrl(data.avatar_url);
    } catch (error) {
      console.error('Ошибка загрузки аватарки:', error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      
      // Сжимаем изображение
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 400,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);

      // Загружаем через API endpoint
      const formData = new FormData();
      formData.append('file', compressedFile, file.name);

      const response = await fetch('/api/admin/avatar/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка загрузки аватарки');
      }

      const data = await response.json();
      
      // Обновляем состояние
      setAvatarUrl(data.avatar_url);
      alert('Аватарка успешно загружена');
    } catch (error: any) {
      console.error('Ошибка:', error);
      alert(`Ошибка загрузки аватарки: ${error.message}`);
    } finally {
      setUploading(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  // Админ функции
  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    setIsAdmin(false);
  };

  const compressImage = async (file: File): Promise<File> => {
    // Улучшенные параметры сжатия
    const options = {
      maxSizeMB: 1.5, // Уменьшено с 2 до 1.5 МБ
      maxWidthOrHeight: 1600, // Ресайз до 1600px вместо 1920px
      useWebWorker: true,
      initialQuality: 0.85, // Качество 85% для баланса размера и качества
      // exifOrientation удален - библиотека автоматически обрабатывает ориентацию
    };
    
    try {
      // Пытаемся сжать с WebP (если поддерживается)
      try {
        const webpOptions = {
          ...options,
          fileType: 'image/webp',
        };
        const webpFile = await imageCompression(file, webpOptions);
        // Проверяем, что WebP действительно создан
        if (webpFile.type === 'image/webp') {
          return webpFile;
        }
      } catch (webpError) {
        // Если WebP не получился, продолжаем с JPEG
        console.log('WebP не поддерживается, используем JPEG');
      }
      
      // Fallback на JPEG
      const jpegOptions = {
        ...options,
        fileType: 'image/jpeg',
      };
      return await imageCompression(file, jpegOptions);
    } catch (error) {
      console.error('Ошибка сжатия:', error);
      // Последний fallback - базовые настройки
      try {
        return await imageCompression(file, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });
      } catch (fallbackError) {
        console.error('Ошибка fallback сжатия:', fallbackError);
        return file;
      }
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

      // Создаем уникальный group_id для этой загрузки
      const groupId = `group-${Date.now()}-${Math.random().toString(36).substring(7)}`;

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
            group_id: groupId, // Добавляем group_id
            caption: photoCaption.trim() || null, // Добавляем подпись (одинаковую для всей группы)
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Ошибка сохранения в БД:', errorData);
          alert(`Ошибка сохранения фото ${i + 1}: ${errorData.error || 'Неизвестная ошибка'}`);
          continue;
        }

        const result = await response.json();
        console.log(`Фото ${i + 1} сохранено в БД:`, result);

        setUploadProgress(((i + 1) / imageFiles.length) * 100);
      }

      // Перезагружаем фото после загрузки
      console.log('Перезагружаем фото...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Небольшая задержка для БД
      await loadPhotos();
      console.log('Фото перезагружены, групп:', photoGroups.length);
      
      // Проверяем, что фото загрузились
      if (photos.length === 0 && photoGroups.length === 0) {
        alert('Фото загружены, но не отображаются. Проверьте консоль браузера (F12)');
      } else {
        alert(`Успешно загружено ${imageFiles.length} фотографий`);
      }
      
      // Очищаем подпись после загрузки и скрываем форму
      setPhotoCaption('');
      setShowCaptionInput(false);
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

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const title = 'Ашот мебель - Фото галерея';
    const text = `Посмотрите мою работу: ${title}`;
    
    // Проверяем поддержку Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        return;
      } catch (error: any) {
        // Пользователь отменил шаринг или произошла ошибка
        // Продолжаем с fallback на копирование
        if (error.name !== 'AbortError') {
          console.error('Ошибка шаринга:', error);
        }
      }
    }
    
    // Fallback: копируем в буфер обмена
    try {
      await navigator.clipboard.writeText(url);
      setShareNotification('Ссылка скопирована!');
      setTimeout(() => setShareNotification(null), 2000);
    } catch (error) {
      // Если clipboard API не поддерживается, используем старый метод
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setShareNotification('Ссылка скопирована!');
        setTimeout(() => setShareNotification(null), 2000);
      } catch (err) {
        console.error('Ошибка копирования:', err);
        alert(`Не удалось скопировать ссылку. Скопируйте вручную: ${url}`);
      }
      document.body.removeChild(textArea);
    }
  }, []);

  const handleSubmitContactForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.phone.trim()) {
      alert('Пожалуйста, заполните имя и телефон');
      return;
    }

    setContactSubmitting(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Ошибка ответа сервера:', data);
        throw new Error(data.error || 'Ошибка отправки заявки');
      }

      const result = await response.json();
      console.log('Заявка успешно отправлена:', result);
      
      alert('Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.');
      setShowContactModal(false);
      setContactForm({ name: '', phone: '', comment: '' });
    } catch (error: any) {
      console.error('Ошибка отправки заявки:', error);
      const errorMessage = error.message || 'Ошибка отправки заявки. Попробуйте позже.';
      alert(errorMessage);
    } finally {
      setContactSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main style={{ 
        padding: '40px 20px',
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center',
        background: 'transparent',
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
        background: 'transparent',
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
      background: 'transparent',
    }}>
      {/* Имя профиля в левом верхнем углу */}
      <h1 style={{ 
        fontSize: '18px',
        fontWeight: 'bold',
        margin: 0,
        marginBottom: '15px',
      }}>
        {PROFILE_NAME}
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
            cursor: isAdmin ? 'pointer' : 'default',
          }}
          onClick={() => isAdmin && avatarInputRef.current?.click()}
          title={isAdmin ? 'Нажмите, чтобы загрузить аватарку' : ''}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
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
            {isAdmin && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: '#007bff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid white',
                cursor: 'pointer',
              }}
              title="Загрузить аватарку"
              >
                <span style={{ fontSize: '12px', color: 'white' }}>📷</span>
              </div>
            )}
          </div>
          {isAdmin && (
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarUpload}
            />
          )}
        </div>

        {/* Статистика вровень с верхом аватара */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, auto)',
          gap: '24px',
          flex: 1,
          alignSelf: 'flex-start',
          justifyContent: 'flex-end',
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

      {/* Гамбургер-меню и кнопка выхода для админа (после городов, перед кнопкой загрузки) */}
      {isAdmin && (
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AdminMenu
              isOpen={adminMenuOpen}
              onToggle={() => setAdminMenuOpen(!adminMenuOpen)}
              items={[
                {
                  id: 'requests',
                  label: 'Заявки',
                  icon: '📋',
                  onClick: () => setShowContactRequests(true),
                },
                // Здесь можно легко добавлять новые пункты меню
                // {
                //   id: 'settings',
                //   label: 'Настройки',
                //   icon: '⚙️',
                //   onClick: () => console.log('Настройки'),
                // },
              ]}
              activeSection={showContactRequests ? 'requests' : null}
            />
            {/* Индикатор веса страницы */}
            <PageWeightIndicator />
          </div>
          {/* Кнопка выхода из админки */}
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
              fontWeight: '500',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#c82333';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#dc3545';
            }}
          >
            Выйти
          </button>
        </div>
      )}

      {/* Контент админки: Заявки или основная страница */}
      {isAdmin && showContactRequests ? (
        <ContactRequests onBack={() => setShowContactRequests(false)} />
      ) : (
        <>
          {/* Кнопка загрузки фото (только для админа) - синяя кнопка как раньше */}
          {isAdmin && (
            <div style={{ marginBottom: '20px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          
          {!showCaptionInput ? (
            // Первая кнопка - показать форму загрузки
            <button
              onClick={() => setShowCaptionInput(true)}
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
              Загрузить фото
            </button>
          ) : (
            // Форма с полем подписи и кнопкой выбора файлов
            <div>
              {/* Поле для ввода подписи */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333',
                }}>
                  Подпись к фото (необязательно)
                </label>
                <input
                  type="text"
                  placeholder="Введите подпись для фото..."
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  disabled={uploading}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{
                  marginTop: '6px',
                  fontSize: '12px',
                  color: '#666',
                }}>
                  Подпись будет добавлена ко всем выбранным фото
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    flex: 1,
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
                  {uploading ? `Загрузка... ${Math.round(uploadProgress)}%` : 'Выбрать фото'}
                </button>
                
                <button
                  onClick={() => {
                    setShowCaptionInput(false);
                    setPhotoCaption('');
                  }}
                  disabled={uploading}
                  style={{
                    padding: '14px 20px',
                    fontSize: '16px',
                    fontWeight: '500',
                    backgroundColor: '#999',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: uploading ? 'wait' : 'pointer',
                    opacity: uploading ? 0.6 : 1,
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
          {uploading && (
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e0e0e0',
              borderRadius: '4px',
              marginTop: '10px',
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
        </div>
      )}

      {/* Кнопки действий вровень между собой */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '2px',
        marginBottom: '40px',
        width: '100%',
      }}>
        <button 
          onClick={() => setShowContactModal(true)}
          style={{
            width: '100%',
            padding: '10px 20px',
            fontSize: '14px',
            border: 'none',
            borderRadius: '0',
            backgroundColor: '#485B78',
            color: '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.2s',
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '500',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a6f8f'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#485B78'}
        >
          Узнать стоимость
        </button>
        <button 
          onClick={handleShare}
          style={{
            width: '100%',
            padding: '10px 20px',
            fontSize: '14px',
            border: 'none',
            borderRadius: '0',
            backgroundColor: '#485B78',
            color: '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.2s',
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '500',
            position: 'relative',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a6f8f'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#485B78'}
        >
          Поделиться
          {/* Уведомление о копировании */}
          {shareNotification && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: '10px',
                padding: '8px 16px',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                borderRadius: '8px',
                fontSize: '14px',
                whiteSpace: 'nowrap',
                zIndex: 1000,
                pointerEvents: 'none',
              }}
            >
              {shareNotification}
            </div>
          )}
        </button>
        <button style={{
          width: '100%',
          padding: '10px 20px',
          fontSize: '14px',
          border: 'none',
          borderRadius: '0',
          backgroundColor: '#485B78',
          color: '#ffffff',
          cursor: 'pointer',
          transition: 'all 0.2s',
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '500',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a6f8f'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#485B78'}
        >
          Связаться
        </button>
      </div>

      {/* Сетка фотографий (3 колонки, как в Instagram) */}
      {photoGroups.length > 0 ? (
        <div style={{ marginTop: '40px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2px',
          }}>
            {photoGroups.map((group, groupIndex) => (
              <PhotoGridItem
                key={group.groupId}
                group={group}
                isAdmin={isAdmin}
                onOpenFullscreen={(photoIndex) => gallery.openGallery(groupIndex, photoIndex)}
                onDelete={isAdmin ? (photoId) => handleDelete(photoId) : undefined}
              />
            ))}
          </div>
        </div>
      ) : photos.length > 0 ? (
        // Временный fallback: показываем фото без группировки, если группы не создались
        <div style={{ marginTop: '40px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2px',
          }}>
            {photos.map((photo, index) => {
              // Находим индекс группы для этого фото
              const groupIndex = photoGroups.findIndex(g => g.photos.some(p => p.id === photo.id));
              return (
              <div
                key={photo.id}
                onClick={() => {
                  if (groupIndex >= 0) {
                    gallery.openGallery(groupIndex, 0);
                  }
                }}
                style={{
                  aspectRatio: '1',
                  overflow: 'hidden',
                  backgroundColor: '#f5f5f5',
                  cursor: 'pointer',
                }}
              >
                <img
                  src={photo.public_url}
                  alt="Photo"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
              );
            })}
          </div>
        </div>
      ) : !loading ? (
        <div style={{ marginTop: '40px', textAlign: 'center', color: '#666' }}>
          <p>Фотографии скоро появятся</p>
        </div>
      ) : null}

      {/* Модальное окно на весь экран */}
      {gallery.isFullscreen && gallery.currentGroup && (
        <FullscreenCarousel 
          photos={gallery.currentPhotos}
          currentIndex={gallery.activePhotoIndex}
          onNextPhoto={gallery.nextPhoto}
          onPrevPhoto={gallery.prevPhoto}
          onNextGroup={gallery.nextGroup}
          onPrevGroup={gallery.prevGroup}
          onClose={gallery.closeGallery}
          onOpenContact={() => setShowContactModal(true)}
          canGoToPrevPhoto={gallery.canGoToPrevPhoto}
          canGoToNextPhoto={gallery.canGoToNextPhoto}
          canGoToPrevGroup={gallery.canGoToPrevGroup}
          canGoToNextGroup={gallery.canGoToNextGroup}
          goToPhoto={gallery.goToPhoto}
          profileName={PROFILE_NAME}
        />
      )}

      {/* Модальное окно формы заявки */}
      {showContactModal && (
        <div
          onClick={() => setShowContactModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            }}
          >
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              Узнать стоимость
            </h2>
            <form onSubmit={handleSubmitContactForm}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333',
                }}>
                  Имя *
                </label>
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                  disabled={contactSubmitting}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333',
                }}>
                  Телефон *
                </label>
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  required
                  disabled={contactSubmitting}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333',
                }}>
                  Комментарий
                </label>
                <textarea
                  value={contactForm.comment}
                  onChange={(e) => setContactForm({ ...contactForm, comment: e.target.value })}
                  disabled={contactSubmitting}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={contactSubmitting}
                  style={{
                    flex: 1,
                    padding: '14px',
                    fontSize: '16px',
                    fontWeight: '500',
                    backgroundColor: contactSubmitting ? '#999' : '#485B78',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: contactSubmitting ? 'wait' : 'pointer',
                    opacity: contactSubmitting ? 0.6 : 1,
                  }}
                >
                  {contactSubmitting ? 'Отправка...' : 'Отправить'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  disabled={contactSubmitting}
                  style={{
                    padding: '14px 24px',
                    fontSize: '16px',
                    fontWeight: '500',
                    backgroundColor: '#999',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: contactSubmitting ? 'wait' : 'pointer',
                    opacity: contactSubmitting ? 0.6 : 1,
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}

    </main>
  );
}

// Компонент квадрата в сетке с каруселью
const PhotoGridItem = ({ 
  group, 
  isAdmin, 
  onOpenFullscreen,
  onDelete 
}: { 
  group: PhotoGroup; 
  isAdmin: boolean;
  onOpenFullscreen: (photoIndex: number) => void;
  onDelete?: (photoId: string) => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <div style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', backgroundColor: '#f5f5f5', cursor: 'pointer' }}>
      {/* Карусель внутри квадрата */}
      <div 
        onClick={() => onOpenFullscreen(currentIndex)}
        style={{
          display: 'flex',
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: 'transform 0.3s ease',
          height: '100%',
        }}
      >
        {group.photos.map((photo, index) => (
          <div
            key={photo.id}
            style={{
              minWidth: '100%',
              width: '100%',
              flexShrink: 0,
              height: '100%',
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

      {/* Стрелки навигации (только если больше 1 фото) */}
      {group.photos.length > 1 && currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex(currentIndex - 1);
          }}
          style={{
            position: 'absolute',
            left: '5px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '25px',
            height: '25px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            zIndex: 10,
          }}
        >
          ‹
        </button>
      )}

      {group.photos.length > 1 && currentIndex < group.photos.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex(currentIndex + 1);
          }}
          style={{
            position: 'absolute',
            right: '5px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '25px',
            height: '25px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            zIndex: 10,
          }}
        >
          ›
        </button>
      )}

      {/* Индикатор множественных фото */}
      {group.photos.length > 1 && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          zIndex: 10,
        }}>
          {currentIndex + 1}/{group.photos.length}
        </div>
      )}

      {/* Кнопка удаления для админа */}
      {isAdmin && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Удалить эту группу фото?')) {
              group.photos.forEach(photo => onDelete(photo.id));
            }
          }}
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            width: '24px',
            height: '24px',
            backgroundColor: 'transparent',
            color: '#000',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            textShadow: '0 0 4px rgba(255, 255, 255, 0.8), 0 0 2px rgba(255, 255, 255, 0.8)',
            zIndex: 10,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};
