import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Проверка переменных окружения
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Отсутствуют переменные окружения Supabase');
      return NextResponse.json(
        { error: 'Ошибка конфигурации: отсутствуют ключи Supabase' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 400 }
      );
    }

    // Проверка, что это изображение
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Файл должен быть изображением' },
        { status: 400 }
      );
    }

    // Генерируем уникальное имя файла
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = fileName; // Убираем папку uploads, загружаем прямо в корень bucket

    // Конвертируем File в ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('Попытка загрузки файла:', {
      fileName: file.name,
      filePath,
      size: file.size,
      type: file.type,
    });

    // Загружаем файл в Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('Test') // Название вашего bucket
      .upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      console.error('Ошибка загрузки в Supabase:', {
        message: error.message,
        error: error,
      });
      return NextResponse.json(
        { 
          error: 'Ошибка при загрузке файла', 
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Получаем публичный URL файла
    const { data: urlData } = supabaseAdmin.storage
      .from('Test')
      .getPublicUrl(filePath);

    console.log('Файл успешно загружен:', urlData.publicUrl);

    return NextResponse.json({
      success: true,
      path: filePath,
      url: urlData.publicUrl,
      fileName: file.name,
    });
  } catch (error: any) {
    console.error('Неожиданная ошибка:', error);
    return NextResponse.json(
      { 
        error: 'Внутренняя ошибка сервера', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

