'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onOpenContact: () => void;
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
  onIndexChange,
  onClose,
  onOpenContact
}: FullscreenCarouselProps) {
  // =========================
  // 1) STATE (всё состояние — первым)
  // =========================
  const [index, setIndex] = useState(currentIndex);
  const [dragY, setDragY] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  // =========================
  // 2) CONSTANTS (потом константы)
  // =========================
  const columnsPerRow = 3;          // фиксировано под текущую сетку
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
  const canGoUp = index - columnsPerRow >= 0;
  const canGoDown = index + columnsPerRow < photosLength;

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

  // Функция изменения индекса
  const handleIndexChange = useCallback((newIndex: number) => {
    setIndex(newIndex);
    onIndexChange(newIndex);
    // Сбрасываем accumulator при смене индекса
    resetWheelAccumulator();
  }, [onIndexChange, resetWheelAccumulator]);

  // =========================
  // 6) ЕДИНАЯ НАВИГАЦИЯ (главная точка правды)
  // =========================
  const navigateVertical = useCallback((direction: 'up' | 'down') => {
    if (animating) return;
    if (!guardCooldown()) return;

    const step = columnsPerRow;
    const nextIndex = direction === 'down' ? index + step : index - step;

    // границы
    if (nextIndex < 0 || nextIndex >= photosLength) return;

    // аккуратный сброс аккумулятора, чтобы "хвосты" не переносились
    resetWheelAccumulator();

    // Меняем индекс
    handleIndexChange(nextIndex);
  }, [animating, guardCooldown, index, photosLength, columnsPerRow, resetWheelAccumulator, handleIndexChange]);

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
      // вниз
      if (canGoDown) navigateVertical('down');
    } else {
      // вверх
      if (canGoUp) navigateVertical('up');
    }

    // сброс после срабатывания
    resetWheelAccumulator();
  }, [animating, photosLength, WHEEL_THRESHOLD, canGoDown, canGoUp, navigateVertical, resetWheelAccumulator]);

  // =========================
  // 8) POINTER / SWIPE (вызов navigateVertical; логика жестов)
  // =========================
  const commitVerticalSwipe = async (direction: 'prev' | 'next') => {
    // Преобразуем direction в формат navigateVertical
    const navDirection = direction === 'next' ? 'down' : 'up';
    
    // Проверяем, можно ли перейти (navigateVertical сама проверит границы)
    const newIndex = direction === 'next' ? index + columnsPerRow : index - columnsPerRow;
    
    if (newIndex < 0 || newIndex >= photosLength) {
      setDragY(0);
      return;
    }
    
    // Сбрасываем accumulator при начале анимации
    resetWheelAccumulator();
    
    setAnimating(true);
    setDragY(direction === 'next' ? 160 : -160);
    await new Promise((r) => setTimeout(r, 140));
    
    // Используем единую функцию навигации
    navigateVertical(navDirection);
    setDragY(0);
    await new Promise((r) => setTimeout(r, 80));
    setAnimating(false);
  };

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
      // dy > 0 → палец движется вниз → следующий пост (next)
      // dy < 0 → палец движется вверх → предыдущий пост (prev)
      // Иначе вернуть translateY в 0
      if (Math.abs(dy) >= 60) {
        await commitVerticalSwipe(dy > 0 ? 'next' : 'prev');
      } else {
        setDragY(0);
      }
    } else if (axis === 'x') {
      // Горизонтальная навигация
      const dx = e.clientX - stateRef.current.startX;
      const minSwipeDistance = 50;
      if (Math.abs(dx) > minSwipeDistance) {
        if (dx > 0 && index > 0) {
          handleIndexChange(index - 1);
        } else if (dx < 0 && index < photosLength - 1) {
          handleIndexChange(index + 1);
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
  // Синхронизируем внутренний индекс с внешним
  useEffect(() => {
    setIndex(currentIndex);
    // Сбрасываем accumulator при смене индекса извне
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

  // при смене index — тоже сбрасываем накопитель
  useEffect(() => {
    resetWheelAccumulator();
  }, [index, resetWheelAccumulator]);

  // Сбрасываем расширение подписи при смене фото
  useEffect(() => {
    setCaptionExpanded(false);
  }, [index]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && index > 0) {
        handleIndexChange(index - 1);
      } else if (e.key === 'ArrowRight' && index < photosLength - 1) {
        handleIndexChange(index + 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [index, photosLength, onClose, handleIndexChange]);

  // =========================
  // 10) JSX (ниже — разметка)
  // =========================
  // Ширина одного фото (100% на мобильных, 80% на десктопе)
  const photoWidth = isMobile ? '100%' : '80%';
  const gap = isMobile ? '0%' : '2%';

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
        background: 'rgba(255, 255, 255, 0.95)',
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
      {/* Кнопка "назад" в левом верхнем углу (как в Instagram) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
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
          zIndex: 1003,
          padding: '8px',
        }}
        aria-label="Назад"
      >
        ‹
      </button>
      {/* Контейнер изображения с анимацией вертикального свайпа */}
      <div
        style={{
          transform: `translateY(${dragY}px)`,
          transition: stateRef.current.active ? 'none' : 'transform 160ms ease',
          maxWidth: '96vw',
          maxHeight: '92vh',
          paddingTop: '80px', // Отступ сверху для кнопки "назад"
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{
          display: 'flex',
          transform: isMobile 
            ? `translateX(-${index * 100}%)`
            : `translateX(calc(-${index} * (${photoWidth} + ${gap}) + (100% - ${photoWidth}) / 2))`,
          transition: stateRef.current.active && stateRef.current.axis === 'y' ? 'none' : 'transform 0.3s ease',
          height: 'calc(92vh - 80px)',
          gap: gap,
          alignItems: 'stretch',
          width: '100%',
        }}>
          {photos.map((photo, photoIndex) => (
            <div
              key={photo.id}
              style={{
                minWidth: photoWidth,
                width: photoWidth,
                flexShrink: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
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
      {photos.length > 1 && index > 0 && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleIndexChange(index - 1);
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
      {photos.length > 1 && index < photos.length - 1 && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleIndexChange(index + 1);
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
        backgroundColor: '#fff',
      }}>
        {/* Кнопки телефона и сообщения - под фото, над текстом */}
        <div style={{
          display: 'flex',
          gap: '15px',
          marginBottom: '8px',
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
                  handleIndexChange(photoIndex);
                }}
                style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: photoIndex === index ? 'rgba(72, 91, 120, 0.6)' : 'rgba(72, 91, 120, 0.2)',
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
          const currentCaption = photos[index]?.caption;
          const displayText = currentCaption || `Фото ${index + 1} из ${photos.length}`;
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

