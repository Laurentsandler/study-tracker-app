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

// GET /api/shared-courses - List shared courses the user is a member of
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get all shared courses the user is a member of
    const { data: memberships, error: memberError } = await supabase
      .from('shared_course_members')
      .select(`
        shared_course_id,
        role,
        shared_courses (
          id,
          name,
          description,
          color,
          created_by,
          invite_code,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id);

    if (memberError) {
      console.error('Error fetching shared courses:', memberError);
      return NextResponse.json({ error: 'Failed to fetch shared courses' }, { status: 500 });
    }

    // Transform the data to include role info
    interface CourseWithRole {
      id: string;
      name: string;
      description: string | null;
      color: string;
      created_by: string | null;
      invite_code: string;
      created_at: string;
      updated_at: string;
      user_role: string;
      member_count?: number;
    }

    const courses: CourseWithRole[] = memberships?.map(m => {
      const sharedCourse = m.shared_courses as unknown as {
        id: string;
        name: string;
        description: string | null;
        color: string;
        created_by: string | null;
        invite_code: string;
        created_at: string;
        updated_at: string;
      };
      return {
        ...sharedCourse,
        user_role: m.role,
      };
    }) || [];

    // Get member counts for each course
    const courseIds = courses.map(c => c.id);
    if (courseIds.length > 0) {
      const { data: memberCounts } = await supabase
        .from('shared_course_members')
        .select('shared_course_id')
        .in('shared_course_id', courseIds);

      const countMap: Record<string, number> = {};
      memberCounts?.forEach(m => {
        countMap[m.shared_course_id] = (countMap[m.shared_course_id] || 0) + 1;
      });

      courses.forEach(c => {
        c.member_count = countMap[c.id] || 0;
      });
    }

    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error in GET /api/shared-courses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/shared-courses - Create a new shared course
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Course name is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Create the shared course
    const { data: course, error: courseError } = await supabase
      .from('shared_courses')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#3b82f6',
        created_by: user.id,
      })
      .select()
      .single();

    if (courseError) {
      console.error('Error creating shared course:', courseError);
      return NextResponse.json({ error: 'Failed to create shared course' }, { status: 500 });
    }

    // Add the creator as an owner
    const { error: memberError } = await supabase
      .from('shared_course_members')
      .insert({
        shared_course_id: course.id,
        user_id: user.id,
        role: 'owner',
      });

    if (memberError) {
      console.error('Error adding creator as member:', memberError);
      // Rollback by deleting the course
      await supabase.from('shared_courses').delete().eq('id', course.id);
      return NextResponse.json({ error: 'Failed to set up course membership' }, { status: 500 });
    }

    return NextResponse.json({ ...course, user_role: 'owner', member_count: 1 }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/shared-courses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
