import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getUserFromRequest, verifySharedCourseMembership, isValidPriority, isValidDuration } from '@/lib/api/helpers';

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

    // Verify membership
    const membership = await verifySharedCourseMembership(courseId, user.id);
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this course' }, { status: 403 });
    }

    const supabase = createServerClient();

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

    // Check which assignments the user has already copied or dismissed
    const assignmentIds = assignments?.map(a => a.id) || [];
    if (assignmentIds.length > 0) {
      // Check copies
      const { data: copies } = await supabase
        .from('user_shared_assignment_copies')
        .select('shared_assignment_id')
        .eq('user_id', user.id)
        .in('shared_assignment_id', assignmentIds);

      const copiedIds = new Set(copies?.map(c => c.shared_assignment_id) || []);

      // Check dismissed assignments
      const { data: dismissed } = await supabase
        .from('user_dismissed_shared_assignments')
        .select('shared_assignment_id')
        .eq('user_id', user.id)
        .in('shared_assignment_id', assignmentIds);

      const dismissedIds = new Set(dismissed?.map(d => d.shared_assignment_id) || []);

      assignments?.forEach(a => {
        a.is_copied = copiedIds.has(a.id);
        a.is_dismissed = dismissedIds.has(a.id);
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

    // Validate priority and duration
    const validatedPriority = isValidPriority(priority) ? priority : 'medium';
    const validatedDuration = isValidDuration(estimated_duration) ? estimated_duration : 60;

    // Verify membership
    const membership = await verifySharedCourseMembership(courseId, user.id);
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this course' }, { status: 403 });
    }

    const supabase = createServerClient();

    // Create the shared assignment
    const { data: assignment, error } = await supabase
      .from('shared_assignments')
      .insert({
        shared_course_id: courseId,
        created_by: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        due_date: due_date || null,
        priority: validatedPriority,
        estimated_duration: validatedDuration,
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

    // Auto-add the assignment to all course members' local assignments
    // Get all course members
    const { data: members } = await supabase
      .from('shared_course_members')
      .select('user_id')
      .eq('shared_course_id', courseId);

    if (members && members.length > 0) {
      // Get the shared course name for local course matching
      const { data: sharedCourse } = await supabase
        .from('shared_courses')
        .select('name')
        .eq('id', courseId)
        .single();

      for (const member of members) {
        // Skip if this member already has a copy (e.g. the creator)
        const { data: existingCopy } = await supabase
          .from('user_shared_assignment_copies')
          .select('id')
          .eq('shared_assignment_id', assignment.id)
          .eq('user_id', member.user_id)
          .maybeSingle();

        if (existingCopy) continue;

        // Try to find a matching local course by name
        let localCourseId: string | null = null;
        if (sharedCourse) {
          const { data: localCourse } = await supabase
            .from('courses')
            .select('id')
            .eq('user_id', member.user_id)
            .ilike('name', sharedCourse.name)
            .limit(1)
            .maybeSingle();
          localCourseId = localCourse?.id || null;
        }

        // Create local assignment for this member
        const { data: localAssignment, error: localError } = await supabase
          .from('assignments')
          .insert({
            user_id: member.user_id,
            course_id: localCourseId,
            title: assignment.title,
            description: assignment.description,
            due_date: assignment.due_date,
            priority: assignment.priority,
            estimated_duration: assignment.estimated_duration,
            raw_input_text: assignment.raw_input_text,
            status: 'pending',
          })
          .select('id')
          .single();

        if (localError) {
          console.error(`Failed to auto-create assignment for member ${member.user_id}:`, localError);
          continue;
        }

        // Track the copy so the member sees it as already copied
        await supabase
          .from('user_shared_assignment_copies')
          .insert({
            shared_assignment_id: assignment.id,
            user_id: member.user_id,
            local_assignment_id: localAssignment.id,
          })
          .select()
          .maybeSingle();
      }
    }

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/shared-courses/[courseId]/assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
