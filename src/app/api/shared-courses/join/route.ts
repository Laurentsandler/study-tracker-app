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

// POST /api/shared-courses/join - Join a shared course using invite code
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invite_code } = body;

    if (!invite_code || typeof invite_code !== 'string' || invite_code.trim().length === 0) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Find the course by invite code
    const { data: course, error: courseError } = await supabase
      .from('shared_courses')
      .select('*')
      .eq('invite_code', invite_code.trim().toLowerCase())
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('shared_course_members')
      .select('id')
      .eq('shared_course_id', course.id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'You are already a member of this course' }, { status: 400 });
    }

    // Add user as a member
    const { error: memberError } = await supabase
      .from('shared_course_members')
      .insert({
        shared_course_id: course.id,
        user_id: user.id,
        role: 'member',
      });

    if (memberError) {
      console.error('Error joining course:', memberError);
      return NextResponse.json({ error: 'Failed to join course' }, { status: 500 });
    }

    // Get member count
    const { count } = await supabase
      .from('shared_course_members')
      .select('*', { count: 'exact', head: true })
      .eq('shared_course_id', course.id);

    return NextResponse.json({
      ...course,
      user_role: 'member',
      member_count: count || 1,
    });
  } catch (error) {
    console.error('Error in POST /api/shared-courses/join:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
