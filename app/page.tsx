'use client';

import { useState, useRef } from 'react';

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка, что это изображение
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    setUploading(true);
    setImageUrl('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setImageUrl(data.url);
      } else {
        alert(`Ошибка: ${data.error || 'Неизвестная ошибка'}`);
      }
    } catch (error: any) {
      alert(`Ошибка: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>ТЕСТ!!!</h1>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        style={{ display: 'none' }}
        disabled={uploading}
      />

      <button
        onClick={handleButtonClick}
        disabled={uploading}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          fontSize: 16,
          cursor: uploading ? 'wait' : 'pointer',
          opacity: uploading ? 0.6 : 1,
        }}
      >
        {uploading ? 'Загрузка...' : 'ГРУЗИТЬ'}
      </button>

      {imageUrl && (
        <div style={{ marginTop: 20 }}>
          <img
            src={imageUrl}
            alt="Загруженное изображение"
            style={{
              maxWidth: '100%',
              maxHeight: '500px',
              display: 'block',
            }}
          />
        </div>
      )}
    </main>
  );
}
