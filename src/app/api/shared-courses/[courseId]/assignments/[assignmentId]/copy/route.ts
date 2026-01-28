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
    const supabase = createServerClient();

    // Verify user is a member of the course
    const { data: membership } = await supabase
      .from('shared_course_members')
      .select('role')
      .eq('shared_course_id', courseId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this course' }, { status: 403 });
    }

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
      const { data: localCourse } = await supabase
        .from('courses')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', sharedCourse.name)
        .single();
      
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

    // Track the copy
    const { error: copyError } = await supabase
      .from('user_shared_assignment_copies')
      .insert({
        shared_assignment_id: assignmentId,
        user_id: user.id,
        local_assignment_id: localAssignment.id,
      });

    if (copyError) {
      console.error('Error tracking copy:', copyError);
      // Assignment was created but copy tracking failed - don't fail the request
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
