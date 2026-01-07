import { useState, useMemo } from 'react';

interface SitePhoto {
  id: string;
  public_url: string;
  sort_order: number;
  created_at: string;
  group_id?: string;
  caption?: string;
}

interface PhotoGroup {
  groupId: string;
  photos: SitePhoto[];
}

interface UseGalleryReturn {
  // Состояние
  activeGroupIndex: number | null;
  activePhotoIndex: number;
  isFullscreen: boolean;
  
  // Флаги границ
  canGoToNextPhoto: boolean;
  canGoToPrevPhoto: boolean;
  canGoToNextGroup: boolean;
  canGoToPrevGroup: boolean;
  
  // Методы навигации
  openGallery: (groupIndex: number, photoIndex: number) => void;
  closeGallery: () => void;
  nextPhoto: () => void;
  prevPhoto: () => void;
  nextGroup: () => void;
  prevGroup: () => void;
  goToPhoto: (photoIndex: number) => void;
  
  // Текущие данные
  currentGroup: PhotoGroup | null;
  currentPhotos: SitePhoto[];
}

export function useGallery(photoGroups: PhotoGroup[]): UseGalleryReturn {
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  
  const isFullscreen = activeGroupIndex !== null;
  
  // Получаем текущую группу
  const currentGroup = activeGroupIndex !== null && activeGroupIndex >= 0 && activeGroupIndex < photoGroups.length
    ? photoGroups[activeGroupIndex]
    : null;
  
  const currentPhotos = currentGroup?.photos || [];
  
  // Флаги границ
  const canGoToNextPhoto = useMemo(() => {
    if (activeGroupIndex === null || !currentGroup) return false;
    return activePhotoIndex < currentPhotos.length - 1;
  }, [activeGroupIndex, activePhotoIndex, currentPhotos.length, currentGroup]);
  
  const canGoToPrevPhoto = useMemo(() => {
    return activePhotoIndex > 0;
  }, [activePhotoIndex]);
  
  const canGoToNextGroup = useMemo(() => {
    if (activeGroupIndex === null) return false;
    return activeGroupIndex < photoGroups.length - 1;
  }, [activeGroupIndex, photoGroups.length]);
  
  const canGoToPrevGroup = useMemo(() => {
    if (activeGroupIndex === null) return false;
    return activeGroupIndex > 0;
  }, [activeGroupIndex]);
  
  // Открыть галерею
  const openGallery = (groupIndex: number, photoIndex: number) => {
    if (groupIndex < 0 || groupIndex >= photoGroups.length) return;
    const group = photoGroups[groupIndex];
    if (!group) return;
    
    const validPhotoIndex = Math.max(0, Math.min(photoIndex, group.photos.length - 1));
    
    setActiveGroupIndex(groupIndex);
    setActivePhotoIndex(validPhotoIndex);
  };
  
  // Закрыть галерею
  const closeGallery = () => {
    setActiveGroupIndex(null);
    setActivePhotoIndex(0);
  };
  
  // Следующее фото
  const nextPhoto = () => {
    if (!canGoToNextPhoto) return;
    setActivePhotoIndex(activePhotoIndex + 1);
  };
  
  // Предыдущее фото
  const prevPhoto = () => {
    if (!canGoToPrevPhoto) return;
    setActivePhotoIndex(activePhotoIndex - 1);
  };
  
  // Следующая группа
  const nextGroup = () => {
    if (!canGoToNextGroup) return;
    setActiveGroupIndex(activeGroupIndex! + 1);
    setActivePhotoIndex(0); // Сбрасываем на первое фото новой группы
  };
  
  // Предыдущая группа
  const prevGroup = () => {
    if (!canGoToPrevGroup) return;
    setActiveGroupIndex(activeGroupIndex! - 1);
    setActivePhotoIndex(0); // Сбрасываем на первое фото новой группы
  };
  
  // Переход к конкретному фото (для точек навигации)
  const goToPhoto = (photoIndex: number) => {
    if (activeGroupIndex === null || !currentGroup) return;
    const validPhotoIndex = Math.max(0, Math.min(photoIndex, currentPhotos.length - 1));
    setActivePhotoIndex(validPhotoIndex);
  };
  
  return {
    activeGroupIndex,
    activePhotoIndex,
    isFullscreen,
    canGoToNextPhoto,
    canGoToPrevPhoto,
    canGoToNextGroup,
    canGoToPrevGroup,
    openGallery,
    closeGallery,
    nextPhoto,
    prevPhoto,
    nextGroup,
    prevGroup,
    goToPhoto,
    currentGroup,
    currentPhotos,
  };
}

