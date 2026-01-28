import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

// Helper to get user from auth header
async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

// Helper to verify membership
async function verifyMembership(supabase: ReturnType<typeof createServerClient>, courseId: string, userId: string) {
  const { data: membership } = await supabase
    .from('shared_course_members')
    .select('role')
    .eq('shared_course_id', courseId)
    .eq('user_id', userId)
    .single();
  
  return membership;
}

// GET /api/shared-courses/[courseId]/assignments - List shared assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId } = await params;
    const supabase = createServerClient();

    // Verify membership
    const membership = await verifyMembership(supabase, courseId, user.id);
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this course' }, { status: 403 });
    }

    // Get shared assignments
    const { data: assignments, error } = await supabase
      .from('shared_assignments')
      .select(`
        *,
        creator:profiles!shared_assignments_created_by_fkey(id, email, full_name)
      `)
      .eq('shared_course_id', courseId)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching shared assignments:', error);
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }

    // Check which assignments the user has already copied
    const assignmentIds = assignments?.map(a => a.id) || [];
    if (assignmentIds.length > 0) {
      const { data: copies } = await supabase
        .from('user_shared_assignment_copies')
        .select('shared_assignment_id')
        .eq('user_id', user.id)
        .in('shared_assignment_id', assignmentIds);

      const copiedIds = new Set(copies?.map(c => c.shared_assignment_id) || []);
      assignments?.forEach(a => {
        a.is_copied = copiedIds.has(a.id);
      });
    }

    return NextResponse.json(assignments || []);
  } catch (error) {
    console.error('Error in GET /api/shared-courses/[courseId]/assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/shared-courses/[courseId]/assignments - Create a shared assignment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId } = await params;
    const body = await request.json();
    const { title, description, due_date, priority, estimated_duration, raw_input_text } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify membership
    const membership = await verifyMembership(supabase, courseId, user.id);
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this course' }, { status: 403 });
    }

    // Create the shared assignment
    const { data: assignment, error } = await supabase
      .from('shared_assignments')
      .insert({
        shared_course_id: courseId,
        created_by: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        due_date: due_date || null,
        priority: priority || 'medium',
        estimated_duration: estimated_duration || 60,
        raw_input_text: raw_input_text || null,
      })
      .select(`
        *,
        creator:profiles!shared_assignments_created_by_fkey(id, email, full_name)
      `)
      .single();

    if (error) {
      console.error('Error creating shared assignment:', error);
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
    }

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/shared-courses/[courseId]/assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
