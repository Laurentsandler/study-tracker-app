import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getUserFromRequest, verifySharedCourseMembership } from '@/lib/api/helpers';

// POST /api/shared-courses/[courseId]/assignments/[assignmentId]/copy
// Copy a shared assignment to the user's local assignments
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

    // Check if already copied
    const { data: existingCopy } = await supabase
      .from('user_shared_assignment_copies')
      .select('id, local_assignment_id')
      .eq('shared_assignment_id', assignmentId)
      .eq('user_id', user.id)
      .single();

    if (existingCopy) {
      return NextResponse.json({ 
        error: 'Assignment already copied',
        local_assignment_id: existingCopy.local_assignment_id 
      }, { status: 400 });
    }

    // Get the shared assignment
    const { data: sharedAssignment, error: fetchError } = await supabase
      .from('shared_assignments')
      .select('*')
      .eq('id', assignmentId)
      .eq('shared_course_id', courseId)
      .single();

    if (fetchError || !sharedAssignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check if user has a matching course in their local courses
    // Try to find a course with the same name as the shared course
    const { data: sharedCourse } = await supabase
      .from('shared_courses')
      .select('name')
      .eq('id', courseId)
      .single();

    let localCourseId = null;
    if (sharedCourse) {
      // Use maybeSingle() to handle case where no match or multiple matches exist
      const { data: localCourse } = await supabase
        .from('courses')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', sharedCourse.name)
        .limit(1)
        .maybeSingle();
      
      localCourseId = localCourse?.id || null;
    }

    // Create a local copy of the assignment
    const { data: localAssignment, error: insertError } = await supabase
      .from('assignments')
      .insert({
        user_id: user.id,
        course_id: localCourseId,
        title: sharedAssignment.title,
        description: sharedAssignment.description,
        due_date: sharedAssignment.due_date,
        priority: sharedAssignment.priority,
        estimated_duration: sharedAssignment.estimated_duration,
        raw_input_text: sharedAssignment.raw_input_text,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating local assignment:', insertError);
      return NextResponse.json({ error: 'Failed to copy assignment' }, { status: 500 });
    }

    // Track the copy - this is important to prevent duplicate copies
    const { error: copyError } = await supabase
      .from('user_shared_assignment_copies')
      .insert({
        shared_assignment_id: assignmentId,
        user_id: user.id,
        local_assignment_id: localAssignment.id,
      });

    if (copyError) {
      console.error('Error tracking copy:', copyError);
      // If tracking fails, delete the local assignment to maintain data integrity
      await supabase.from('assignments').delete().eq('id', localAssignment.id);
      return NextResponse.json({ error: 'Failed to track assignment copy' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Assignment copied successfully',
      local_assignment: localAssignment,
    });
  } catch (error) {
    console.error('Error in POST /api/shared-courses/[courseId]/assignments/[assignmentId]/copy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
