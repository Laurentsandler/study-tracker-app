import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getUserFromRequest, verifySharedCourseMembership } from '@/lib/api/helpers';

// POST /api/shared-courses/[courseId]/leave
// Leave a shared course (only non-owner members can leave)
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

    // Verify user is a member of the course and get their role
    const membership = await verifySharedCourseMembership(courseId, user.id);
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this course' }, { status: 403 });
    }

    // Owners cannot leave - they must delete the course
    if (membership.role === 'owner') {
      return NextResponse.json({ error: 'Course owners cannot leave. You must delete the course first.' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Remove the user from the course
    const { error: deleteError } = await supabase
      .from('shared_course_members')
      .delete()
      .eq('shared_course_id', courseId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error leaving course:', deleteError);
      return NextResponse.json({ error: 'Failed to leave course' }, { status: 500 });
    }

    // Also clean up any dismissed assignments for this course
    const { data: courseAssignments } = await supabase
      .from('shared_assignments')
      .select('id')
      .eq('shared_course_id', courseId);

    if (courseAssignments && courseAssignments.length > 0) {
      const assignmentIds = courseAssignments.map(a => a.id);
      await supabase
        .from('user_dismissed_shared_assignments')
        .delete()
        .eq('user_id', user.id)
        .in('shared_assignment_id', assignmentIds);
    }

    return NextResponse.json({ message: 'Successfully left the course' });
  } catch (error) {
    console.error('Error in POST /api/shared-courses/[courseId]/leave:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
