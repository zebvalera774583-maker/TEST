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

    const body = await request.json();
    const { name, phone, comment } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Имя и телефон обязательны' },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: 'Ошибка сохранения заявки', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      id: data.id 
    });
  } catch (error: any) {
    console.error('Ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', details: error.message },
      { status: 500 }
    );
  }
}

