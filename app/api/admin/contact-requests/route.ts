import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase не инициализирован' },
        { status: 500 }
      );
    }

    // Получаем все заявки, отсортированные по дате (новые сверху)
    const { data, error } = await supabaseAdmin
      .from('contact_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка получения заявок:', error);
      return NextResponse.json(
        { error: 'Ошибка получения заявок', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      requests: data || []
    });
  } catch (error: any) {
    console.error('Ошибка:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', details: error.message },
      { status: 500 }
    );
  }
}

