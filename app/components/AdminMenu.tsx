'use client';

import { useState, useEffect, useRef } from 'react';

interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean; // Для пунктов типа "Выйти"
}

interface AdminMenuProps {
  items: MenuItem[];
  isOpen: boolean;
  onToggle: () => void;
}

export default function AdminMenu({ items, isOpen, onToggle }: AdminMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Закрытие по клику вне меню
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        // Не закрываем, если клик по иконке гамбургера
        if (!target.closest('[data-hamburger]')) {
          if (isOpen) {
            onToggle();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Блокируем скролл фона при открытом меню на мобильных
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, onToggle]);

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onToggle();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onToggle]);

  return (
    <>
      {/* Иконка гамбургера */}
      <button
        data-hamburger
        onClick={onToggle}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          color: '#333',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.7';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        aria-label="Меню"
      >
        ☰
      </button>

      {/* Overlay (тёмный фон) */}
      {isOpen && (
        <div
          onClick={onToggle}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 1998,
            transition: 'opacity 200ms ease',
          }}
        />
      )}

      {/* Меню */}
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: 0,
          right: isOpen ? 0 : isMobile ? '-80%' : '-320px',
          width: isMobile ? '80%' : '320px',
          height: '100vh',
          backgroundColor: '#fff',
          zIndex: 1999,
          boxShadow: isOpen ? '-2px 0 10px rgba(0, 0, 0, 0.1)' : 'none',
          transition: 'right 200ms ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Заголовок меню */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#333',
          }}>
            Меню
          </h2>
          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '24px',
              color: '#666',
              padding: '4px',
              lineHeight: '1',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#333';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#666';
            }}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {/* Список пунктов меню */}
        <nav style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0',
        }}>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                item.onClick();
                onToggle();
              }}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '15px',
                color: item.danger ? '#dc3545' : '#333',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {item.icon && (
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
              )}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}

