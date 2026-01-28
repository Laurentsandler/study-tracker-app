import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getUserFromRequest } from '@/lib/api/helpers';
import { getGroqClient } from '@/lib/groq/client';

interface SharedCourseInfo {
  id: string;
  name: string;
  description: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description } = await request.json();

    if (!title && !description) {
      return NextResponse.json({ suggested_course_id: null });
    }

    const supabase = createServerClient();

    // Get user's shared courses
    const { data: memberships, error: memberError } = await supabase
      .from('shared_course_members')
      .select(`
        shared_course_id,
        shared_courses (
          id,
          name,
          description
        )
      `)
      .eq('user_id', user.id);

    if (memberError || !memberships || memberships.length === 0) {
      if (memberError) {
        console.error('Error fetching shared course memberships:', memberError);
      }
      return NextResponse.json({ suggested_course_id: null });
    }

    // Extract course info, filtering out any null entries
    const courses: SharedCourseInfo[] = memberships
      .filter(m => m.shared_courses != null)
      .map(m => {
        const sharedCourse = m.shared_courses as unknown as {
          id: string;
          name: string;
          description: string | null;
        };
        return {
          id: sharedCourse.id,
          name: sharedCourse.name,
          description: sharedCourse.description,
        };
      });

    if (courses.length === 0) {
      return NextResponse.json({ suggested_course_id: null });
    }

    // If only one course, suggest it
    if (courses.length === 1) {
      return NextResponse.json({ suggested_course_id: courses[0].id });
    }

    // Use AI to suggest the best matching course
    const groq = getGroqClient();
    const assignmentInfo = `Title: ${title || 'Not provided'}\nDescription: ${description || 'Not provided'}`;
    const courseList = courses.map((c, i) => `${i + 1}. "${c.name}"${c.description ? ` - ${c.description}` : ''}`).join('\n');

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that matches assignments to courses.
Given an assignment's title and description, determine which course it most likely belongs to.

OUTPUT FORMAT - Return ONLY a valid JSON object:
{
  "course_number": 1
}

Where course_number is the number (1-indexed) of the best matching course from the list.
If none of the courses seem to match well, return the number of the most general or likely course.

CRITICAL: Return ONLY valid JSON. No markdown, no extra text, no code blocks.`,
        },
        {
          role: 'user',
          content: `ASSIGNMENT:\n${assignmentInfo}\n\nAVAILABLE COURSES:\n${courseList}\n\nWhich course does this assignment belong to?`,
        },
      ],
      temperature: 0.1,
      max_tokens: 100,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    
    try {
      // Clean the response
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }
      cleaned = cleaned.trim();
      
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }
      
      const parsed = JSON.parse(cleaned);
      const courseNumber = parsed.course_number;
      
      if (typeof courseNumber === 'number' && courseNumber >= 1 && courseNumber <= courses.length) {
        return NextResponse.json({ suggested_course_id: courses[courseNumber - 1].id });
      }
    } catch {
      // If parsing fails, return first course as default
      return NextResponse.json({ suggested_course_id: courses[0].id });
    }

    return NextResponse.json({ suggested_course_id: courses[0].id });
  } catch (error) {
    console.error('Error suggesting shared course:', error);
    return NextResponse.json({ suggested_course_id: null });
  }
}
