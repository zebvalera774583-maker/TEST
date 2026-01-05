'use client';

import { useState, useEffect } from 'react';

interface ContactRequest {
  id: string;
  name: string;
  phone: string;
  comment: string | null;
  created_at: string;
}

export default function ContactRequests() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/contact-requests');
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки заявок');
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err: any) {
      console.error('Ошибка:', err);
      setError(err.message || 'Ошибка загрузки заявок');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: '#666',
      }}>
        Загрузка заявок...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: '#dc3545',
      }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      <h1 style={{
        fontSize: '24px',
        fontWeight: '600',
        marginBottom: '24px',
        color: '#333',
      }}>
        Заявки
      </h1>

      {requests.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: '#666',
        }}>
          Заявок пока нет
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {requests.map((request) => (
            <div
              key={request.id}
              style={{
                padding: '20px',
                backgroundColor: '#fff',
                border: '1px solid #f0f0f0',
                borderRadius: '8px',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px',
              }}>
                <div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '4px',
                  }}>
                    {request.name}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#666',
                  }}>
                    {request.phone}
                  </div>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#999',
                }}>
                  {formatDate(request.created_at)}
                </div>
              </div>
              {request.comment && (
                <div style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f0f0f0',
                  fontSize: '14px',
                  color: '#666',
                  lineHeight: '1.6',
                }}>
                  {request.comment}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

