import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Проверка переменных окружения
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Отсутствуют переменные окружения Supabase');
      return NextResponse.json(
        { error: 'Ошибка конфигурации: отсутствуют ключи Supabase' },
        { status: 500 }
      );
    }

    // Проверка, что supabaseAdmin инициализирован
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Ошибка конфигурации: Supabase не инициализирован' },
        { status: 500 }
      );
    }

    // Сохраняем в локальную переменную для TypeScript
    const admin = supabaseAdmin;

    // Получаем список всех файлов из bucket "Test"
    const { data, error } = await admin.storage
      .from('Test')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('Ошибка загрузки списка файлов:', error);
      return NextResponse.json(
        { error: 'Ошибка при получении списка файлов', details: error.message },
        { status: 500 }
      );
    }

    // Фильтруем только изображения
    const imageFiles = data?.filter((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '');
    }) || [];

    // Получаем публичные URL для каждого изображения
    const imagesWithUrls = imageFiles.map((file) => {
      const { data: urlData } = admin.storage
        .from('Test')
        .getPublicUrl(file.name);

      return {
        name: file.name,
        url: urlData.publicUrl,
        created_at: file.created_at,
        updated_at: file.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      images: imagesWithUrls,
      count: imagesWithUrls.length,
    });
  } catch (error: any) {
    console.error('Неожиданная ошибка:', error);
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

