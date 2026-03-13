import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getUserFromRequest } from '@/lib/api/helpers';

// GET /api/edx-courses/[courseId] - get a single course with logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { courseId } = await params;
    const supabase = createServerClient();

    const { data: course, error } = await supabase
      .from('edx_courses')
      .select('*')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single();

    if (error || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const { data: logs } = await supabase
      .from('edx_progress_logs')
      .select('*')
      .eq('edx_course_id', courseId)
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false });

    const totalLoggedMinutes = (logs || []).reduce((s, l) => s + l.duration_minutes, 0);

    return NextResponse.json({ ...course, total_logged_minutes: totalLoggedMinutes, progress_logs: logs || [] });
  } catch (err) {
    console.error('GET /api/edx-courses/[courseId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/edx-courses/[courseId] - update a course
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { courseId } = await params;
    const body = await request.json();
    const allowedFields = ['title', 'url', 'provider', 'category', 'start_date', 'target_end_date', 'total_estimated_hours', 'notes', 'status'];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: course, error } = await supabase
      .from('edx_courses')
      .update(updates)
      .eq('id', courseId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !course) {
      return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
    }

    return NextResponse.json(course);
  } catch (err) {
    console.error('PATCH /api/edx-courses/[courseId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/edx-courses/[courseId] - delete a course
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { courseId } = await params;
    const supabase = createServerClient();

    const { error } = await supabase
      .from('edx_courses')
      .delete()
      .eq('id', courseId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Course deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/edx-courses/[courseId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
