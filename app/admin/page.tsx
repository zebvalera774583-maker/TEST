'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Если уже авторизован, перенаправляем на главную
    const authStatus = localStorage.getItem('admin_authenticated');
    if (authStatus === 'true') {
      router.push('/');
    }
  }, [router]);

  const handleLogin = async () => {
    if (!password.trim()) {
      setError('Введите пароль');
      return;
    }

    setLoading(true);
    setError('');

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
        // Перенаправляем на главную страницу
        router.push('/');
      } else {
        setError(data.error || 'Неверный пароль');
      }
    } catch (error) {
      console.error('Ошибка входа:', error);
      setError('Ошибка при входе. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        width: '100%',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '10px',
          textAlign: 'center',
        }}>
          Ашот мебель
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#666',
          marginBottom: '30px',
          textAlign: 'center',
        }}>
          Вход в админ-панель
        </p>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                handleLogin();
              }
            }}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              border: error ? '2px solid #dc3545' : '1px solid #ddd',
              borderRadius: '8px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            autoFocus
          />
          {error && (
            <p style={{
              color: '#dc3545',
              fontSize: '14px',
              marginTop: '8px',
            }}>
              {error}
            </p>
          )}
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '16px',
            fontWeight: '500',
            backgroundColor: loading ? '#999' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = '#0051cc';
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = '#0070f3';
          }}
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>

        <div style={{
          marginTop: '20px',
          textAlign: 'center',
        }}>
          <a
            href="/"
            style={{
              color: '#0070f3',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            ← Вернуться на главную
          </a>
        </div>
      </div>
    </div>
  );
}
