import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      console.error('Supabase Admin не инициализирован. Проверьте SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { error: 'Supabase не инициализирован. Проверьте настройки сервера.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { name, phone, comment } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Имя и телефон обязательны' },
        { status: 400 }
      );
    }

    console.log('Попытка сохранить заявку:', { name: name.trim(), phone: phone.trim(), hasComment: !!comment });

    // Вставляем заявку в базу данных
    const { data, error } = await supabaseAdmin
      .from('contact_requests')
      .insert({
        name: name.trim(),
        phone: phone.trim(),
        comment: comment ? comment.trim() : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения заявки:', error);
      console.error('Код ошибки:', error.code);
      console.error('Детали ошибки:', error.details);
      console.error('Подсказка:', error.hint);
      
      // Более информативное сообщение об ошибке
      let errorMessage = 'Ошибка сохранения заявки';
      if (error.code === '42P01') {
        errorMessage = 'Таблица contact_requests не найдена. Выполните SQL миграцию в Supabase.';
      } else if (error.code === '42501') {
        errorMessage = 'Нет прав на вставку в таблицу contact_requests. Проверьте RLS политики.';
      } else {
        errorMessage = `Ошибка сохранения заявки: ${error.message}`;
      }
      
      return NextResponse.json(
        { error: errorMessage, details: error.message, code: error.code },
        { status: 500 }
      );
    }

    console.log('Заявка успешно сохранена:', data.id);
    return NextResponse.json({ 
      success: true,
      id: data.id 
    });
  } catch (error: any) {
    console.error('Ошибка при обработке запроса:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', details: error.message },
      { status: 500 }
    );
  }
}


