import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getUserFromRequest, verifySharedCourseMembership } from '@/lib/api/helpers';

// POST /api/shared-courses/[courseId]/assignments/[assignmentId]/dismiss
// Dismiss (hide) a shared assignment from the user's view
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; assignmentId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId, assignmentId } = await params;

    // Verify user is a member of the course
    const membership = await verifySharedCourseMembership(courseId, user.id);
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this course' }, { status: 403 });
    }

    const supabase = createServerClient();

    // Check if the assignment exists in this course
    const { data: assignment, error: assignmentError } = await supabase
      .from('shared_assignments')
      .select('id')
      .eq('id', assignmentId)
      .eq('shared_course_id', courseId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check if already dismissed - use maybeSingle to avoid error when no record exists
    const { data: existingDismissal } = await supabase
      .from('user_dismissed_shared_assignments')
      .select('id')
      .eq('shared_assignment_id', assignmentId)
      .eq('user_id', user.id)
      .maybeSingle();

    // If already dismissed, make the operation idempotent - return success
    if (existingDismissal) {
      return NextResponse.json({ message: 'Assignment dismissed successfully' });
    }

    // Dismiss the assignment
    const { error: dismissError } = await supabase
      .from('user_dismissed_shared_assignments')
      .insert({
        shared_assignment_id: assignmentId,
        user_id: user.id,
      });

    if (dismissError) {
      console.error('Error dismissing assignment:', dismissError);
      return NextResponse.json({ error: 'Failed to dismiss assignment' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Assignment dismissed successfully' });
  } catch (error) {
    console.error('Error in POST /api/shared-courses/[courseId]/assignments/[assignmentId]/dismiss:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/shared-courses/[courseId]/assignments/[assignmentId]/dismiss
// Undismiss (unhide) a shared assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; assignmentId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId, assignmentId } = await params;

    // Verify user is a member of the course
    const membership = await verifySharedCourseMembership(courseId, user.id);
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this course' }, { status: 403 });
    }

    const supabase = createServerClient();

    // Remove the dismissal
    const { error: deleteError } = await supabase
      .from('user_dismissed_shared_assignments')
      .delete()
      .eq('shared_assignment_id', assignmentId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error undismissing assignment:', deleteError);
      return NextResponse.json({ error: 'Failed to undismiss assignment' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Assignment undismissed successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/shared-courses/[courseId]/assignments/[assignmentId]/dismiss:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
