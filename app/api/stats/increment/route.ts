import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase не инициализирован' },
        { status: 500 }
      );
    }

    // Увеличиваем счетчик просмотров
    const { data, error } = await supabaseAdmin.rpc('increment_views', {
      stats_id: 1,
    });

    // Если функция не существует, используем прямой запрос
    if (error && error.message.includes('function')) {
      const { data: currentStats } = await supabaseAdmin
        .from('site_stats')
        .select('views_total')
        .eq('id', 1)
        .single();

      if (currentStats) {
        const { error: updateError } = await supabaseAdmin
          .from('site_stats')
          .update({
            views_total: (currentStats.views_total || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', 1);

        if (updateError) {
          console.error('Ошибка обновления статистики:', updateError);
          return NextResponse.json(
            { error: 'Ошибка обновления статистики', details: updateError.message },
            { status: 500 }
          );
        }
      }
    } else if (error) {
      console.error('Ошибка обновления статистики:', error);
      return NextResponse.json(
        { error: 'Ошибка обновления статистики', details: error.message },
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
