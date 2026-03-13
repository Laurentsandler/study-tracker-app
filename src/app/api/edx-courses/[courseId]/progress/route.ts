import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getUserFromRequest } from '@/lib/api/helpers';

// POST /api/edx-courses/[courseId]/progress - log a study session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { courseId } = await params;
    const body = await request.json();
    const { duration_minutes, section, notes, logged_at } = body;

    if (!duration_minutes || typeof duration_minutes !== 'number' || duration_minutes <= 0) {
      return NextResponse.json({ error: 'duration_minutes must be a positive number' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify course belongs to user
    const { data: course, error: courseError } = await supabase
      .from('edx_courses')
      .select('id')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const { data: log, error } = await supabase
      .from('edx_progress_logs')
      .insert({
        edx_course_id: courseId,
        user_id: user.id,
        duration_minutes: Math.round(duration_minutes),
        section: section?.trim() || null,
        notes: notes?.trim() || null,
        logged_at: logged_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating progress log:', error);
      return NextResponse.json({ error: 'Failed to log progress' }, { status: 500 });
    }

    return NextResponse.json(log, { status: 201 });
  } catch (err) {
    console.error('POST /api/edx-courses/[courseId]/progress error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/edx-courses/[courseId]/progress?logId=xxx - delete a log entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { courseId } = await params;
    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('logId');

    if (!logId) {
      return NextResponse.json({ error: 'logId query parameter is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('edx_progress_logs')
      .delete()
      .eq('id', logId)
      .eq('edx_course_id', courseId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete log entry' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Log entry deleted' });
  } catch (err) {
    console.error('DELETE /api/edx-courses/[courseId]/progress error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
