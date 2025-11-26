import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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
  
  // Remove markdown code blocks if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  
  cleaned = cleaned.trim();
  
  // Try to find JSON object or array in the response
  const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  // Fix common JSON issues from AI responses
  cleaned = cleaned
    .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
    .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
    .replace(/[\u201C\u201D]/g, '"')  // Replace smart quotes
    .replace(/[\u2018\u2019]/g, "'"); // Replace smart apostrophes
  
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse JSON response:', cleaned);
    throw new Error('Failed to parse AI response as JSON');
  }
}

// POST - Generate AI schedule suggestions based on assignments and user schedule
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

    // Fetch user's weekly schedule
    const { data: scheduleBlocks } = await supabase
      .from('user_schedule')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week', { ascending: true })
      .order('available_start', { ascending: true });

    if (!scheduleBlocks || scheduleBlocks.length === 0) {
      return NextResponse.json(
        { error: 'Please set up your weekly schedule first', needsSchedule: true },
        { status: 400 }
      );
    }

    // Fetch pending assignments
    const { data: assignments } = await supabase
      .from('assignments')
      .select('*, course:courses(*)')
      .eq('user_id', user.id)
      .neq('status', 'completed')
      .order('due_date', { ascending: true });

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ suggestions: [], message: 'No pending assignments to schedule' });
    }

    // Fetch existing planned tasks for the next 2 weeks
    const today = new Date();
    const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    const { data: existingTasks } = await supabase
      .from('planned_tasks')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_date', today.toISOString().split('T')[0])
      .lte('scheduled_date', twoWeeksFromNow.toISOString().split('T')[0]);

    // Format data for AI
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    const formattedSchedule = scheduleBlocks.map(block => ({
      day: dayNames[block.day_of_week],
      dayNumber: block.day_of_week,
      start: block.available_start,
      end: block.available_end,
      type: block.block_type,
      label: block.label || block.block_type,
      location: block.location,
    }));

    const formattedAssignments = assignments.map(a => ({
      id: a.id,
      title: a.title,
      course: a.course?.name || 'Unknown',
      dueDate: a.due_date,
      priority: a.priority,
      estimatedMinutes: a.estimated_duration || 60,
      status: a.status,
    }));

    const formattedExistingTasks = (existingTasks || []).map(t => ({
      date: t.scheduled_date,
      start: t.scheduled_start,
      end: t.scheduled_end,
      assignmentId: t.assignment_id,
    }));

    // Calculate some helpful dates
    const todayStr = today.toISOString().split('T')[0];
    const twoWeeksStr = twoWeeksFromNow.toISOString().split('T')[0];

    // Call AI to generate suggestions
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an intelligent study scheduler assistant helping students plan their study time effectively.

CURRENT DATE CONTEXT:
- Today: ${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()} (${dayNames[today.getDay()]})
- Today (ISO): ${todayStr}
- Planning Period: ${todayStr} to ${twoWeeksStr} (next 2 weeks)
- Current Day of Week: ${today.getDay()} (0=Sunday, 6=Saturday)

TASK: Create an optimal study schedule based on the student's availability and assignments.

INPUT DATA:
1. Weekly availability - recurring time blocks showing when student is available
2. Pending assignments - with due dates, priorities, and estimated duration
3. Already scheduled tasks - to avoid conflicts

SCHEDULING RULES:
1. Schedule study sessions BEFORE due dates (ideally 1-2 days before)
2. Only use "study" and "free" time blocks for study sessions
3. NEVER schedule during "class" or "work" blocks
4. Break assignments >90 minutes into multiple sessions
5. High priority items should be scheduled first
6. Leave buffer time - don't schedule back-to-back
7. Match session length to estimated duration
8. Suggest locations based on the schedule block's location

OUTPUT FORMAT - Return ONLY a valid JSON object:
{
  "suggestions": [
    {
      "assignmentId": "uuid-from-assignments-list",
      "assignmentTitle": "Assignment Title",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "reason": "Brief explanation",
      "location": "suggested location"
    }
  ],
  "insights": "A paragraph with study tips and workload analysis"
}

VALIDATION:
- assignmentId MUST match an ID from the assignments list
- date MUST be in YYYY-MM-DD format within the planning period
- startTime and endTime MUST be in HH:MM format (24-hour)
- All suggestions must fit within available time blocks

CRITICAL: Return ONLY valid JSON. No markdown, no extra text, no code blocks.`,
        },
        {
          role: 'user',
          content: `Please create a study schedule for the next 2 weeks.

WEEKLY AVAILABILITY:
${JSON.stringify(formattedSchedule, null, 2)}

PENDING ASSIGNMENTS:
${JSON.stringify(formattedAssignments, null, 2)}

ALREADY SCHEDULED (avoid conflicts):
${JSON.stringify(formattedExistingTasks, null, 2)}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse AI response using improved parser
    let aiResponse;
    try {
      aiResponse = parseJsonResponse<{
        suggestions?: Array<{
          assignmentId: string;
          assignmentTitle: string;
          date: string;
          startTime: string;
          endTime: string;
          reason?: string;
          location?: string;
        }>;
        insights?: string;
      }>(responseText);
    } catch (parseError) {
      console.error('Error parsing AI response:', responseText);
      return NextResponse.json({ 
        suggestions: [],
        insights: 'Unable to generate suggestions at this time. Please try again.',
        error: 'Failed to parse AI response'
      });
    }

    // Validate suggestions
    const validSuggestions = (aiResponse.suggestions || []).filter(s => {
      // Ensure required fields exist
      if (!s.assignmentId || !s.date || !s.startTime || !s.endTime) return false;
      
      // Ensure assignment ID exists in our assignments list
      const assignmentExists = assignments.some(a => a.id === s.assignmentId);
      if (!assignmentExists) {
        console.warn(`Invalid assignment ID in suggestion: ${s.assignmentId}`);
        return false;
      }
      
      // Ensure date is in valid format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date)) return false;
      
      // Ensure times are in valid format
      if (!/^\d{2}:\d{2}$/.test(s.startTime) || !/^\d{2}:\d{2}$/.test(s.endTime)) return false;
      
      return true;
    });

    // Save suggestions to database
    if (validSuggestions.length > 0) {
      // Clear old pending suggestions
      await supabase
        .from('schedule_suggestions')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'pending');

      // Insert new suggestions
      const suggestionsToInsert = validSuggestions.map((s) => ({
        user_id: user.id,
        assignment_id: s.assignmentId,
        suggested_date: s.date,
        suggested_start: s.startTime,
        suggested_end: s.endTime,
        reason: s.reason || 'AI-suggested study session',
        status: 'pending',
      }));

      await supabase
        .from('schedule_suggestions')
        .insert(suggestionsToInsert);
    }

    return NextResponse.json({
      suggestions: validSuggestions,
      insights: aiResponse.insights || '',
    });
  } catch (error) {
    console.error('Error generating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to generate schedule suggestions' },
      { status: 500 }
    );
  }
}
