'use client';

import { useState, useEffect } from 'react';

export default function PageWeightIndicator() {
  const [pageWeight, setPageWeight] = useState<string>('0 KB');

  useEffect(() => {
    const updateWeight = (bytes: number) => {
      let formatted: string;
      if (bytes < 1024) {
        formatted = `${bytes} B`;
      } else if (bytes < 1024 * 1024) {
        formatted = `${(bytes / 1024).toFixed(1)} KB`;
      } else {
        formatted = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      }
      setPageWeight(formatted);
    };

    const calculatePageWeight = async () => {
      try {
        let totalSize = 0;

        // Подсчет веса изображений
        const images = Array.from(document.querySelectorAll('img'));
        const imagePromises = images.map((img) => {
          const src = img.src;
          if (src && (src.startsWith('http') || src.startsWith('data:'))) {
            if (src.startsWith('data:')) {
              // Для data URLs считаем размер напрямую
              const base64Length = src.length - (src.indexOf(',') + 1);
              const size = Math.ceil(base64Length * 0.75); // Примерный размер
              return Promise.resolve(size);
            } else {
              // Для внешних URL пытаемся получить размер
              return fetch(src, { method: 'HEAD' })
                .then((response) => {
                  const contentLength = response.headers.get('content-length');
                  return contentLength ? parseInt(contentLength, 10) : 0;
                })
                .catch(() => 0);
            }
          }
          return Promise.resolve(0);
        });

        const imageSizes = await Promise.all(imagePromises);
        totalSize += imageSizes.reduce((sum, size) => sum + size, 0);

        // Подсчет веса скриптов
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        const scriptPromises = scripts.map((script) => {
          const src = (script as HTMLScriptElement).src;
          if (src) {
            return fetch(src, { method: 'HEAD' })
              .then((response) => {
                const contentLength = response.headers.get('content-length');
                return contentLength ? parseInt(contentLength, 10) : 0;
              })
              .catch(() => 0);
          }
          return Promise.resolve(0);
        });

        const scriptSizes = await Promise.all(scriptPromises);
        totalSize += scriptSizes.reduce((sum, size) => sum + size, 0);

        // Подсчет веса стилей
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        const stylePromises = styles.map((style) => {
          const href = (style as HTMLLinkElement).href;
          if (href) {
            return fetch(href, { method: 'HEAD' })
              .then((response) => {
                const contentLength = response.headers.get('content-length');
                return contentLength ? parseInt(contentLength, 10) : 0;
              })
              .catch(() => 0);
          }
          return Promise.resolve(0);
        });

        const styleSizes = await Promise.all(stylePromises);
        totalSize += styleSizes.reduce((sum, size) => sum + size, 0);

        // Подсчет веса встроенных стилей и скриптов
        const inlineStyles = document.querySelectorAll('style');
        inlineStyles.forEach((style) => {
          totalSize += new Blob([style.textContent || '']).size;
        });

        const inlineScripts = document.querySelectorAll('script:not([src])');
        inlineScripts.forEach((script) => {
          totalSize += new Blob([script.textContent || '']).size;
        });

        // Обновляем вес
        updateWeight(totalSize);
      } catch (error) {
        console.error('Ошибка подсчета веса страницы:', error);
      }
    };

    // Подсчитываем вес при загрузке
    calculatePageWeight();

    // Обновляем при изменении DOM (добавление/удаление изображений)
    const observer = new MutationObserver(() => {
      // Небольшая задержка для завершения загрузки ресурсов
      setTimeout(() => {
        calculatePageWeight();
      }, 500);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '12px',
      color: '#666',
      padding: '4px 8px',
      backgroundColor: '#f5f5f5',
      borderRadius: '4px',
    }}>
      <span>⚡</span>
      <span>{pageWeight}</span>
    </div>
  );
}
