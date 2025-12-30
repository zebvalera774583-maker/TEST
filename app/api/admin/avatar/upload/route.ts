import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase не инициализирован' },
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
    const fileName = `avatar-${Date.now()}.${fileExt}`;

    // Конвертируем File в ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Загружаем файл в Supabase Storage
    const { data, error: uploadError } = await supabaseAdmin.storage
      .from('Test')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Ошибка загрузки аватарки:', uploadError);
      return NextResponse.json(
        { error: 'Ошибка при загрузке файла', details: uploadError.message },
        { status: 500 }
      );
    }

    // Получаем публичный URL файла
    const { data: urlData } = supabaseAdmin.storage
      .from('Test')
      .getPublicUrl(fileName);

    // Проверяем, существует ли запись с id=1
    const { data: existingStats, error: checkError } = await supabaseAdmin
      .from('site_stats')
      .select('id')
      .eq('id', 1)
      .single();

    // Если записи нет, создаем её
    if (checkError || !existingStats) {
      const { data: newStats, error: insertError } = await supabaseAdmin
        .from('site_stats')
        .insert({ id: 1, views_total: 0, avatar_url: urlData.publicUrl })
        .select()
        .single();

      if (insertError) {
        console.error('Ошибка создания записи site_stats:', insertError);
        await supabaseAdmin.storage.from('Test').remove([fileName]);
        return NextResponse.json(
          { 
            error: 'Ошибка сохранения аватарки', 
            details: insertError.message,
            hint: 'Убедитесь, что таблица site_stats создана и колонка avatar_url добавлена'
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        avatar_url: urlData.publicUrl,
        data: newStats,
      });
    }

    // Сохраняем URL в БД
    const { data: statsData, error: dbError } = await supabaseAdmin
      .from('site_stats')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', 1)
      .select()
      .single();

    if (dbError) {
      console.error('Ошибка сохранения аватарки в БД:', dbError);
      console.error('Детали ошибки:', JSON.stringify(dbError, null, 2));
      // Пытаемся удалить загруженный файл
      await supabaseAdmin.storage.from('Test').remove([fileName]);
      return NextResponse.json(
        { 
          error: 'Ошибка сохранения аватарки', 
          details: dbError.message,
          code: dbError.code,
          hint: dbError.message?.includes('column') 
            ? 'Колонка avatar_url не существует. Выполните SQL из add_avatar_url_column.sql'
            : 'Проверьте, что таблица site_stats создана и RLS настроен правильно'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      avatar_url: urlData.publicUrl,
      data: statsData,
    });
  } catch (error: any) {
    console.error('Ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', details: error.message },
      { status: 500 }
    );
  }
}

