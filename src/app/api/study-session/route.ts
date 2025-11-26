import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGroqClient } from '@/lib/groq/client';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Helper function to clean and parse JSON from AI response
function parseJsonResponse<T>(response: string): T {
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
  
  const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse JSON response:', cleaned);
    throw new Error('Failed to parse AI response as JSON');
  }
}

// POST - Create a study session by gathering relevant content
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      topic,
      unit,
      subject,
      dateFrom,
      dateTo,
      courseId,
      includeWorklogs = true,
      includeAssignments = true,
    } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const sources: {
      type: 'worklog' | 'assignment';
      id: string;
      title: string;
      date: string;
      content: string;
      topic?: string;
    }[] = [];

    // Build search terms
    const searchTerms = [topic.toLowerCase()];
    if (unit) searchTerms.push(unit.toLowerCase());
    if (subject) searchTerms.push(subject.toLowerCase());

    // Fetch relevant worklogs
    if (includeWorklogs) {
      let worklogQuery = supabase
        .from('worklogs')
        .select('*')
        .eq('user_id', user.id)
        .order('date_completed', { ascending: false });

      if (courseId) {
        worklogQuery = worklogQuery.eq('course_id', courseId);
      }

      if (dateFrom) {
        worklogQuery = worklogQuery.gte('date_completed', dateFrom);
      }

      if (dateTo) {
        worklogQuery = worklogQuery.lte('date_completed', dateTo);
      }

      const { data: worklogs } = await worklogQuery;

      if (worklogs) {
        // Filter worklogs by topic/content match
        const relevantWorklogs = worklogs.filter(wl => {
          const searchableText = [
            wl.title,
            wl.description,
            wl.content,
            wl.topic,
          ].filter(Boolean).join(' ').toLowerCase();
          
          return searchTerms.some(term => searchableText.includes(term));
        });

        for (const wl of relevantWorklogs) {
          if (wl.content || wl.description) {
            sources.push({
              type: 'worklog',
              id: wl.id,
              title: wl.title,
              date: wl.date_completed,
              content: [wl.title, wl.description, wl.content].filter(Boolean).join('\n\n'),
              topic: wl.topic || undefined,
            });
          }
        }
      }
    }

    // Fetch relevant assignments
    if (includeAssignments) {
      let assignmentQuery = supabase
        .from('assignments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (courseId) {
        assignmentQuery = assignmentQuery.eq('course_id', courseId);
      }

      if (dateFrom) {
        assignmentQuery = assignmentQuery.gte('created_at', dateFrom);
      }

      if (dateTo) {
        assignmentQuery = assignmentQuery.lte('created_at', dateTo);
      }

      const { data: assignments } = await assignmentQuery;

      if (assignments) {
        const relevantAssignments = assignments.filter(a => {
          const searchableText = [
            a.title,
            a.description,
            a.raw_input_text,
          ].filter(Boolean).join(' ').toLowerCase();
          
          return searchTerms.some(term => searchableText.includes(term));
        });

        for (const a of relevantAssignments) {
          if (a.description || a.raw_input_text) {
            sources.push({
              type: 'assignment',
              id: a.id,
              title: a.title,
              date: a.created_at,
              content: [a.title, a.description, a.raw_input_text].filter(Boolean).join('\n\n'),
            });
          }
        }
      }
    }

    // Combine all content
    const combinedContent = sources.map(s => 
      `--- ${s.type.toUpperCase()}: ${s.title} (${s.date}) ---\n${s.content}`
    ).join('\n\n');

    // Generate study plan overview using AI
    let overview: {
      keyTopics?: string[];
      recommendedFocus?: string[];
      estimatedStudyTime?: number;
      summary?: string;
    } | null = null;
    if (combinedContent.length > 0) {
      try {
        const groq = getGroqClient();
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are a helpful study assistant. Analyze the student's work and create a study plan overview.
              
Return a JSON object with:
- keyTopics: Array of 5-10 key topics/concepts found in the material
- recommendedFocus: Array of 3-5 areas the student should focus on most
- estimatedStudyTime: Estimated total study time in minutes
- summary: A brief 2-3 sentence summary of what this material covers

Only return valid JSON, no markdown.`,
            },
            {
              role: 'user',
              content: `The student wants to study for: ${topic}${unit ? ` (Unit: ${unit})` : ''}${subject ? ` in ${subject}` : ''}

Here is their collected work:\n\n${combinedContent.substring(0, 8000)}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        });

        const response = completion.choices[0]?.message?.content || '{}';
        overview = parseJsonResponse(response);
      } catch (e) {
        console.error('Error generating overview:', e);
      }
    }

    // Calculate date range
    const dates = sources.map(s => new Date(s.date)).filter(d => !isNaN(d.getTime()));
    const dateRange = dates.length > 0 ? {
      from: new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0],
      to: new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0],
    } : { from: '', to: '' };

    return NextResponse.json({
      success: true,
      data: {
        topic,
        unit,
        subject,
        sources,
        combinedContent,
        overview: {
          topic,
          unit,
          totalSources: sources.length,
          worklogCount: sources.filter(s => s.type === 'worklog').length,
          assignmentCount: sources.filter(s => s.type === 'assignment').length,
          dateRange,
          keyTopics: overview?.keyTopics || [],
          recommendedFocus: overview?.recommendedFocus || [],
          estimatedStudyTime: overview?.estimatedStudyTime || 60,
          summary: overview?.summary || '',
        },
      },
    });
  } catch (error) {
    console.error('Error creating study session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
