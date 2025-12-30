import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase не инициализирован' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { avatar_url } = body;

    if (!avatar_url) {
      return NextResponse.json(
        { error: 'Отсутствует avatar_url' },
        { status: 400 }
      );
    }

    // Обновляем аватарку в site_stats (id всегда 1)
    const { data, error } = await supabaseAdmin
      .from('site_stats')
      .update({ avatar_url })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      console.error('Ошибка обновления аватарки:', error);
      return NextResponse.json(
        { error: 'Ошибка обновления аватарки', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase не инициализирован' },
        { status: 500 }
      );
    }

    // Получаем аватарку из site_stats
    const { data, error } = await supabaseAdmin
      .from('site_stats')
      .select('avatar_url')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Ошибка получения аватарки:', error);
      return NextResponse.json(
        { error: 'Ошибка получения аватарки', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, avatar_url: data?.avatar_url || null });
  } catch (error: any) {
    console.error('Ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', details: error.message },
      { status: 500 }
    );
  }
}

