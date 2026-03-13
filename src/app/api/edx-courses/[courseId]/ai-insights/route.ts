import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getUserFromRequest } from '@/lib/api/helpers';
import { generateEdxInsights } from '@/lib/groq/client';

// POST /api/edx-courses/[courseId]/ai-insights - generate AI progress insights
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { courseId } = await params;
    const supabase = createServerClient();

    // Fetch course
    const { data: course, error: courseError } = await supabase
      .from('edx_courses')
      .select('*')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Fetch all progress logs
    const { data: logs } = await supabase
      .from('edx_progress_logs')
      .select('duration_minutes, section, notes, logged_at')
      .eq('edx_course_id', courseId)
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(30);

    const totalLoggedMinutes = (logs || []).reduce((s, l) => s + l.duration_minutes, 0);

    const insights = await generateEdxInsights({
      courseTitle: course.title,
      provider: course.provider,
      totalEstimatedHours: Number(course.total_estimated_hours),
      totalLoggedMinutes,
      targetEndDate: course.target_end_date,
      recentLogs: logs || [],
    });

    return NextResponse.json(insights);
  } catch (err) {
    console.error('POST /api/edx-courses/[courseId]/ai-insights error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
