'use client';

import { useState, useRef } from 'react';

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('');
    setFileUrl('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Файл "${data.fileName}" успешно загружен!`);
        setFileUrl(data.url);
      } else {
        const errorMsg = data.details 
          ? `${data.error}: ${data.details}` 
          : data.error || 'Неизвестная ошибка';
        setMessage(`Ошибка: ${errorMsg}`);
        console.error('Ошибка загрузки:', data);
      }
    } catch (error: any) {
      setMessage(`Ошибка: ${error.message}`);
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

      {message && (
        <div
          style={{
            marginTop: 20,
            padding: 10,
            backgroundColor: fileUrl ? '#d4edda' : '#f8d7da',
            color: fileUrl ? '#155724' : '#721c24',
            borderRadius: 4,
          }}
        >
          {message}
        </div>
      )}

      {fileUrl && (
        <div style={{ marginTop: 10 }}>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#007bff', textDecoration: 'underline' }}
          >
            Открыть загруженный файл
          </a>
        </div>
      )}
    </main>
  );
}
