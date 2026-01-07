'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface SitePhoto {
  id: string;
  public_url: string;
  sort_order: number;
  created_at: string;
  group_id?: string;
  caption?: string;
}

interface FullscreenCarouselProps {
  photos: SitePhoto[];
  currentIndex: number;
  onNextPhoto: () => void;
  onPrevPhoto: () => void;
  onNextGroup: () => void;
  onPrevGroup: () => void;
  onClose: () => void;
  onOpenContact: () => void;
  canGoToPrevPhoto: boolean;
  canGoToNextPhoto: boolean;
  canGoToPrevGroup: boolean;
  canGoToNextGroup: boolean;
  goToPhoto: (photoIndex: number) => void;
  profileName?: string;
}

/**
 * FullscreenCarousel - полноэкранный просмотр фото с вертикальной навигацией
 * 
 * КРИТИЧНО: Не пытайся делать "вертикальный скролл" внутри viewer.
 * Должен быть жест → смена фото, а не скролл контента.
 * 
 * Реализация:
 * - Pointer Events API для детекта свайпов с axis lock
 * - Блокировка нативного скролла через document.body.style.overflow = "hidden"
 * - touch-action: none на overlay для предотвращения жестов браузера
 * - Анимация сдвига контейнера на 120-180px перед сменой фото
 * - Порог срабатывания: abs(dy) >= 60px
 */
export default function FullscreenCarousel({
  photos,
  currentIndex,
  onNextPhoto,
  onPrevPhoto,
  onNextGroup,
  onPrevGroup,
  onClose,
  onOpenContact,
  canGoToPrevPhoto,
  canGoToNextPhoto,
  canGoToPrevGroup,
  canGoToNextGroup,
  goToPhoto,
  profileName = 'ashot-zebelyan',
}: FullscreenCarouselProps) {
  // =========================
  // 1) STATE (всё состояние — первым)
  // =========================
  const [dragY, setDragY] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [shareNotification, setShareNotification] = useState<string | null>(null);

  // =========================
  // 2) CONSTANTS (потом константы)
  // =========================
  const WHEEL_THRESHOLD = 100;      // 80–120: чувствительность трекпада
  const NAV_COOLDOWN_MS = 200;     // 150–250: защита от "дроби"

  // =========================
  // 3) REFS (потом refs — чтобы были доступны всем колбэкам/эффектам)
  // =========================
  const wheelAccumulatorRef = useRef<number>(0);
  const lastNavTsRef = useRef<number>(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    axis: null | 'x' | 'y';
    active: boolean;
  }>({
    pointerId: -1,
    startX: 0,
    startY: 0,
    axis: null,
    active: false,
  });

  // =========================
  // 4) DERIVED / MEMO (потом производные значения)
  // =========================
  const photosLength = photos.length;
  
  // =========================
  // 4.5) SHARE HANDLER (обработка шаринга)
  // =========================
  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
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

  // =========================
  // 5) HELPERS (потом вспомогательные функции)
  // =========================
  const resetWheelAccumulator = useCallback(() => {
    wheelAccumulatorRef.current = 0;
  }, []);

  const guardCooldown = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTsRef.current < NAV_COOLDOWN_MS) return false;
    lastNavTsRef.current = now;
    return true;
  }, []);

  const clamp = useCallback((v: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, v));
  }, []);

  // =========================
  // 6) НАВИГАЦИЯ (вызовы колбэков из хука)
  // =========================
  // Вертикальная навигация (между группами)
  const navigateVertical = useCallback((direction: 'up' | 'down') => {
    if (animating) return;
    if (!guardCooldown()) return;

    // Проверяем границы через пропсы
    if (direction === 'down' && !canGoToNextGroup) return;
    if (direction === 'up' && !canGoToPrevGroup) return;

    // Сбрасываем accumulator
    resetWheelAccumulator();

    // Вызываем колбэк из хука
    if (direction === 'down') {
      onNextGroup();
    } else {
      onPrevGroup();
    }
  }, [animating, guardCooldown, canGoToNextGroup, canGoToPrevGroup, onNextGroup, onPrevGroup, resetWheelAccumulator]);

  // =========================
  // 7) WHEEL HANDLER (только сигнал + accumulator)
  // =========================
  const handleWheelCapture = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    // НИЧЕГО не блокируем preventDefault/stopPropagation
    if (animating) return;
    if (photosLength <= 1) return;

    // Игнорируем горизонтальную прокрутку (deltaX) - обрабатываем только вертикальную
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      return;
    }

    // накопление для трекпада
    wheelAccumulatorRef.current += e.deltaY;

    const acc = wheelAccumulatorRef.current;
    if (Math.abs(acc) < WHEEL_THRESHOLD) return;

    // направление
    if (acc > 0) {
      // вниз → следующая группа
      if (canGoToNextGroup) navigateVertical('down');
    } else {
      // вверх → предыдущая группа
      if (canGoToPrevGroup) navigateVertical('up');
    }

    // сброс после срабатывания
    resetWheelAccumulator();
  }, [animating, photosLength, WHEEL_THRESHOLD, canGoToNextGroup, canGoToPrevGroup, navigateVertical, resetWheelAccumulator]);

  // =========================
  // 8) POINTER / SWIPE (вызов navigateVertical; логика жестов)
  // =========================
  const commitVerticalSwipe = useCallback(async (direction: 'up' | 'down') => {
    if (animating) return;

    // Проверяем, можно ли перейти (через пропсы из хука)
    if (direction === 'up' && !canGoToPrevGroup) {
      setDragY(0);
      return;
    }
    if (direction === 'down' && !canGoToNextGroup) {
      setDragY(0);
      return;
    }

    // Анимация для swipe (визуальная обратная связь)
    setAnimating(true);
    setDragY(direction === 'down' ? 160 : -160);
    await new Promise((r) => setTimeout(r, 140));

    // Используем единую функцию навигации
    navigateVertical(direction);
    
    setDragY(0);
    await new Promise((r) => setTimeout(r, 80));
    setAnimating(false);
  }, [animating, canGoToPrevGroup, canGoToNextGroup, navigateVertical, canGoToPrevPhoto, canGoToNextPhoto, onPrevPhoto, onNextPhoto]);

  const carouselPointerDown = (e: React.PointerEvent) => {
    if (animating) return;
    
    // Игнорируем, если это клик по кнопке или другому интерактивному элементу
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    
    stateRef.current.pointerId = e.pointerId;
    stateRef.current.startX = e.clientX;
    stateRef.current.startY = e.clientY;
    stateRef.current.axis = null;
    stateRef.current.active = true;
    setDragY(0);
  };

  const carouselPointerMove = (e: React.PointerEvent) => {
    if (!stateRef.current.active) return;
    if (e.pointerId !== stateRef.current.pointerId) return;

    const dx = e.clientX - stateRef.current.startX;
    const dy = e.clientY - stateRef.current.startY;

    // axis lock после небольшого движения
    if (!stateRef.current.axis) {
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (adx < 8 && ady < 8) return;
      stateRef.current.axis = adx > ady ? 'x' : 'y';
    }

    if (stateRef.current.axis === 'y') {
      // КРИТИЧНО: preventDefault для блокировки нативного скролла на iOS
      e.preventDefault();
      const limited = clamp(dy, -220, 220);
      setDragY(limited);
    } else {
      // X-ось: горизонтальная навигация (свайп влево/вправо)
    }
  };

  const carouselPointerUp = async (e: React.PointerEvent) => {
    if (!stateRef.current.active) return;
    if (e.pointerId !== stateRef.current.pointerId) return;

    stateRef.current.active = false;
    
    // Пересчитываем dy из координат события для актуального значения
    const dy = e.clientY - stateRef.current.startY;
    const axis = stateRef.current.axis;

    stateRef.current.axis = null;
    stateRef.current.pointerId = -1;

    if (axis === 'y') {
      // Порог: если abs(dy) >= 60 и axis === "y"
      // dy > 0 → палец движется вниз → следующий пост (down)
      // dy < 0 → палец движется вверх → предыдущий пост (up)
      // Иначе вернуть translateY в 0
      if (Math.abs(dy) >= 60) {
        await commitVerticalSwipe(dy > 0 ? 'down' : 'up');
      } else {
        setDragY(0);
      }
    } else if (axis === 'x') {
      // Горизонтальная навигация (между фото в группе)
      const dx = e.clientX - stateRef.current.startX;
      const minSwipeDistance = 50;
      if (Math.abs(dx) > minSwipeDistance) {
        if (dx > 0 && canGoToPrevPhoto) {
          // Свайп вправо → предыдущее фото
          onPrevPhoto();
        } else if (dx < 0 && canGoToNextPhoto) {
          // Свайп влево → следующее фото
          onNextPhoto();
        }
      }
      setDragY(0);
    } else {
      // Если ось не определена, просто сбрасываем
      setDragY(0);
    }
  };

  // =========================
  // 9) EFFECTS (в конце — эффекты, чтобы не было "используется до объявления")
  // =========================
  // Сбрасываем accumulator при смене индекса извне
  useEffect(() => {
    resetWheelAccumulator();
  }, [currentIndex, resetWheelAccumulator]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Блокируем нативный скролл при открытом viewer
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // при открытии — сброс
    resetWheelAccumulator();
    return () => {
      document.body.style.overflow = prev;
      // Сбрасываем accumulator при закрытии viewer
      resetWheelAccumulator();
    };
  }, [resetWheelAccumulator]);

  // Сбрасываем расширение подписи при смене фото
  useEffect(() => {
    setCaptionExpanded(false);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && canGoToPrevPhoto) {
        onPrevPhoto();
      } else if (e.key === 'ArrowRight' && canGoToNextPhoto) {
        onNextPhoto();
      } else if (e.key === 'ArrowUp' && canGoToPrevGroup) {
        onPrevGroup();
      } else if (e.key === 'ArrowDown' && canGoToNextGroup) {
        onNextGroup();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGoToPrevPhoto, canGoToNextPhoto, canGoToPrevGroup, canGoToNextGroup, onPrevPhoto, onNextPhoto, onPrevGroup, onNextGroup, onClose]);

  // =========================
  // 10) JSX (ниже — разметка)
  // =========================
  // Viewport: фиксированное окно одного кадра
  const viewportWidth = isMobile ? '100vw' : '80vw';
  const viewportMaxHeight = 'calc(100vh - 200px)'; // Учитываем header (80px) + footer (120px)

  return (
    <div
      ref={carouselRef}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // клик по фону закрывает (но не по дочерним элементам)
        // Проверяем, что клик именно по самому div, а не по его дочерним элементам
        const target = e.target as HTMLElement;
        // Закрываем только если клик по самому div или по элементам без обработчиков
        if (target === e.currentTarget || target.classList.contains('carousel-backdrop')) {
          onClose();
        }
      }}
      onPointerDown={carouselPointerDown}
      onPointerMove={carouselPointerMove}
      onPointerUp={carouselPointerUp}
      onPointerCancel={carouselPointerUp}
      onWheelCapture={handleWheelCapture}
      onTouchMove={(e) => {
        // КРИТИЧНО: fallback для iOS - если touch-action не сработал
        // Если на iOS всё равно двигается страница — значит touch-action не применился
        // к правильному контейнеру, или preventDefault не срабатывает.
        // Этот обработчик — дополнительная защита.
        e.preventDefault();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        // КРИТИЧНО для мобилы: блокируем нативный скролл
        // touch-action: none предотвращает все жесты браузера (скролл, зум, панорамирование)
        // Должен быть на overlay-обёртке, иначе на iOS может двигаться страница
        touchAction: 'none',
        zIndex: 1000,
      }}
    >
      {/* Header: кнопка "назад" и заголовок */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 1003,
      }}>
        {/* Кнопка "назад" */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            width: 'auto',
            height: 'auto',
            background: 'none',
            color: '#000',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: 'bold',
            padding: '8px',
            flexShrink: 0,
          }}
          aria-label="Назад"
        >
          ‹
        </button>
        {/* Заголовок профиля */}
        <div style={{
          fontSize: isMobile ? '16px' : '18px',
          fontWeight: 'bold',
          color: '#000',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          minWidth: 0,
        }}>
          {profileName}
        </div>
      </div>
      {/* Контейнер изображения с анимацией вертикального свайпа */}
      <div
        style={{
          transform: `translateY(${dragY}px)`,
          transition: stateRef.current.active ? 'none' : 'transform 160ms ease',
          paddingTop: '80px', // Отступ сверху для кнопки "назад"
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Viewport: фиксированное окно одного кадра с overflow: hidden */}
        <div
          style={{
            width: viewportWidth,
            height: viewportMaxHeight,
            maxHeight: viewportMaxHeight,
            overflow: 'hidden', // КРИТИЧНО: обрезает соседние фото
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          {/* Track: лента слайдов с transform */}
          <div style={{
            display: 'flex',
            gap: 0, // КРИТИЧНО: убрать gap, иначе будут щели
            transform: `translateX(-${currentIndex * 100}%)`, // Простой transform без calc: 100% = ширина viewport
            transition: stateRef.current.active && stateRef.current.axis === 'y' ? 'none' : 'transform 0.3s ease',
            height: '100%',
            alignItems: 'stretch',
          }}>
            {photos.map((photo, photoIndex) => (
              <div
                key={photo.id}
                style={{
                  width: '100%', // 100% ширины viewport
                  minWidth: '100%', // Минимум = 100% viewport
                  flexShrink: 0, // Не сжимается
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  padding: '20px', // Отступы для "воздуха" вокруг фото (вместо gap)
                }}
              >
              <img
                src={photo.public_url}
                alt={`Photo ${photoIndex + 1}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Стрелка влево */}
      {photos.length > 1 && canGoToPrevPhoto && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPrevPhoto();
          }}
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            color: '#333',
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
      {photos.length > 1 && canGoToNextPhoto && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onNextPhoto();
          }}
          style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            color: '#333',
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

      {/* Контейнер для кнопок, индикаторов и подписи */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1002,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '10px 16px',
        backgroundColor: '#ffffff',
      }}>
        {/* Кнопки телефона, сообщения и шаринга - под фото, над текстом */}
        <div style={{
          display: 'flex',
          gap: '15px',
          marginBottom: '8px',
          position: 'relative',
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenContact();
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              padding: 0,
            }}
            title="Связаться"
          >
            💬
          </button>
          <a
            href="tel:+79991234567"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              textDecoration: 'none',
              color: 'inherit',
              padding: 0,
            }}
            title="Позвонить"
          >
            📞
          </a>
          <button
            onClick={handleShare}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              padding: 0,
            }}
            title="Поделиться"
          >
            🔗
          </button>
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
                zIndex: 1004,
                pointerEvents: 'none',
              }}
            >
              {shareNotification}
            </div>
          )}
        </div>

        {/* Индикатор карусели (точки) - под кнопками, над текстом */}
        {photos.length > 1 && (
          <div style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '8px',
          }}>
            {photos.map((_, photoIndex) => (
              <button
                key={photoIndex}
                onClick={(e) => {
                  e.stopPropagation();
                  goToPhoto(photoIndex);
                }}
                style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: photoIndex === currentIndex ? 'rgba(72, 91, 120, 0.6)' : 'rgba(72, 91, 120, 0.2)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  padding: 0,
                }}
              />
            ))}
          </div>
        )}

        {/* Подпись под фото */}
        {(() => {
          const currentCaption = photos[currentIndex]?.caption;
          const displayText = currentCaption || `Фото ${currentIndex + 1} из ${photos.length}`;
          const shouldTruncate = displayText.length > 20;
          const truncatedText = shouldTruncate && !captionExpanded 
            ? displayText.substring(0, 20) + '...' 
            : displayText;

          return (
            <div style={{
              color: '#000',
              textAlign: 'left',
              fontSize: isMobile ? '14px' : '16px',
              width: '100%',
            }}>
              {truncatedText}
              {shouldTruncate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCaptionExpanded(!captionExpanded);
                  }}
                  style={{
                    marginLeft: '8px',
                    color: '#485B78',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: 'inherit',
                  }}
                >
                  {captionExpanded ? 'меньше' : 'ещё'}
                </button>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

