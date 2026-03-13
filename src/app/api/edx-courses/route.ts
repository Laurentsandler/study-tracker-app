import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getUserFromRequest } from '@/lib/api/helpers';

// GET /api/edx-courses - list the user's edX courses with total logged time
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();

    const { data: courses, error } = await supabase
      .from('edx_courses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching edx courses:', error);
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }

    // Attach total logged minutes for each course
    const courseIds = (courses || []).map((c) => c.id);
    let logTotals: Record<string, number> = {};
    if (courseIds.length > 0) {
      const { data: logs } = await supabase
        .from('edx_progress_logs')
        .select('edx_course_id, duration_minutes')
        .eq('user_id', user.id)
        .in('edx_course_id', courseIds);

      (logs || []).forEach((l) => {
        logTotals[l.edx_course_id] = (logTotals[l.edx_course_id] || 0) + l.duration_minutes;
      });
    }

    const enriched = (courses || []).map((c) => ({
      ...c,
      total_logged_minutes: logTotals[c.id] || 0,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/edx-courses error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/edx-courses - create a new edX course
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, url, provider, category, start_date, target_end_date, total_estimated_hours, notes, status } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: course, error } = await supabase
      .from('edx_courses')
      .insert({
        user_id: user.id,
        title: title.trim(),
        url: url?.trim() || null,
        provider: provider?.trim() || 'edX',
        category: category?.trim() || null,
        start_date: start_date || null,
        target_end_date: target_end_date || null,
        total_estimated_hours: total_estimated_hours ?? 0,
        notes: notes?.trim() || null,
        status: status || 'in_progress',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating edx course:', error);
      return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
    }

    return NextResponse.json({ ...course, total_logged_minutes: 0 }, { status: 201 });
  } catch (err) {
    console.error('POST /api/edx-courses error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
