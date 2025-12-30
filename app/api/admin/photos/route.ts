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
    const { public_url, sort_order, group_id } = body;

    if (!public_url) {
      return NextResponse.json(
        { error: 'Отсутствует public_url' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('site_photos')
      .insert({
        public_url,
        sort_order: sort_order || 0,
        group_id: group_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения фото:', error);
      return NextResponse.json(
        { error: 'Ошибка сохранения фото', details: error.message },
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

export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase не инициализирован' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Отсутствует id' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('site_photos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Ошибка удаления фото:', error);
      return NextResponse.json(
        { error: 'Ошибка удаления фото', details: error.message },
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

