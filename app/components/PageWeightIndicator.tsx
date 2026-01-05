'use client';

import { useState, useEffect } from 'react';

export default function PageWeightIndicator() {
  const [pageWeight, setPageWeight] = useState<string>('0 KB');

  useEffect(() => {
    const calculatePageWeight = () => {
      try {
        let totalSize = 0;

        // Подсчет веса изображений
        const images = document.querySelectorAll('img');
        images.forEach((img) => {
          const src = img.src;
          if (src && src.startsWith('http')) {
            // Пытаемся получить размер через fetch
            fetch(src, { method: 'HEAD' })
              .then((response) => {
                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                  totalSize += parseInt(contentLength, 10);
                  updateWeight(totalSize);
                }
              })
              .catch(() => {
                // Игнорируем ошибки для внешних ресурсов
              });
          }
        });

        // Подсчет веса скриптов
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach((script) => {
          const src = (script as HTMLScriptElement).src;
          if (src) {
            fetch(src, { method: 'HEAD' })
              .then((response) => {
                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                  totalSize += parseInt(contentLength, 10);
                  updateWeight(totalSize);
                }
              })
              .catch(() => {});
          }
        });

        // Подсчет веса стилей
        const styles = document.querySelectorAll('link[rel="stylesheet"]');
        styles.forEach((style) => {
          const href = (style as HTMLLinkElement).href;
          if (href) {
            fetch(href, { method: 'HEAD' })
              .then((response) => {
                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                  totalSize += parseInt(contentLength, 10);
                  updateWeight(totalSize);
                }
              })
              .catch(() => {});
          }
        });

        // Подсчет веса встроенных стилей и скриптов
        const inlineStyles = document.querySelectorAll('style');
        inlineStyles.forEach((style) => {
          totalSize += new Blob([style.textContent || '']).size;
        });

        const inlineScripts = document.querySelectorAll('script:not([src])');
        inlineScripts.forEach((script) => {
          totalSize += new Blob([script.textContent || '']).size;
        });

        // Обновляем сразу с текущим размером
        updateWeight(totalSize);
      } catch (error) {
        console.error('Ошибка подсчета веса страницы:', error);
      }
    };

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

    // Подсчитываем вес при загрузке
    calculatePageWeight();

    // Обновляем при изменении DOM (добавление/удаление изображений)
    const observer = new MutationObserver(() => {
      calculatePageWeight();
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

