import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getUserFromRequest, verifySharedCourseMembership } from '@/lib/api/helpers';

// DELETE /api/shared-courses/[courseId]/assignments/[assignmentId]
// Delete a shared assignment (only course owners or assignment creators can delete)
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

    // Verify user is a member of the course and get their role
    const membership = await verifySharedCourseMembership(courseId, user.id);
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this course' }, { status: 403 });
    }

    const supabase = createServerClient();

    // Get the assignment to check if user can delete it
    const { data: assignment, error: assignmentError } = await supabase
      .from('shared_assignments')
      .select('id, created_by')
      .eq('id', assignmentId)
      .eq('shared_course_id', courseId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Only course owners or the assignment creator can delete
    const isOwner = membership.role === 'owner';
    const isCreator = assignment.created_by === user.id;

    if (!isOwner && !isCreator) {
      return NextResponse.json({ error: 'Only course owners or the assignment creator can delete this assignment' }, { status: 403 });
    }

    // Delete the assignment (include courseId for defense in depth)
    const { error: deleteError } = await supabase
      .from('shared_assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('shared_course_id', courseId);

    if (deleteError) {
      console.error('Error deleting assignment:', deleteError);
      return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/shared-courses/[courseId]/assignments/[assignmentId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
