'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Перенаправляем на главную страницу
    router.push('/');
  }, [router]);

  return (
    <div style={{ 
      padding: '40px', 
      textAlign: 'center',
    }}>
      <p>Перенаправление на главную страницу...</p>
    </div>
  );
}
