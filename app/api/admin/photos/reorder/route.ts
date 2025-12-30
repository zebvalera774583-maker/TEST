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
    const { id1, sort_order1, id2, sort_order2 } = body;

    if (!id1 || !id2) {
      return NextResponse.json(
        { error: 'Отсутствуют id' },
        { status: 400 }
      );
    }

    // Обновляем sort_order для обеих записей
    const { error: error1 } = await supabaseAdmin
      .from('site_photos')
      .update({ sort_order: sort_order1 })
      .eq('id', id1);

    if (error1) {
      console.error('Ошибка обновления фото 1:', error1);
      return NextResponse.json(
        { error: 'Ошибка обновления порядка', details: error1.message },
        { status: 500 }
      );
    }

    const { error: error2 } = await supabaseAdmin
      .from('site_photos')
      .update({ sort_order: sort_order2 })
      .eq('id', id2);

    if (error2) {
      console.error('Ошибка обновления фото 2:', error2);
      return NextResponse.json(
        { error: 'Ошибка обновления порядка', details: error2.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', details: error.message },
      { status: 500 }
    );
  }
}

