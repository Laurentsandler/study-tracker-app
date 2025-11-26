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

    // Call AI to generate suggestions
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an intelligent study scheduler assistant. Your job is to help students schedule their study time effectively.

Given:
1. A student's weekly availability (recurring schedule blocks)
2. Their pending assignments with due dates and estimated duration
3. Already scheduled tasks (to avoid conflicts)

Create a study plan that:
- Schedules study sessions BEFORE due dates (ideally 1-2 days before)
- Uses the student's available "study" and "free" time blocks
- Avoids scheduling during "class" blocks
- Breaks large assignments into multiple sessions if needed
- Prioritizes urgent assignments (due soon) and high-priority items
- Leaves some buffer time - don't over-schedule
- Considers the assignment's estimated duration

Today's date is: ${today.toISOString().split('T')[0]} (${dayNames[today.getDay()]})

Return a JSON object with:
{
  "suggestions": [
    {
      "assignmentId": "uuid",
      "assignmentTitle": "title for display",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "reason": "Brief explanation of why this time slot",
      "location": "suggested location based on schedule"
    }
  ],
  "insights": "A brief paragraph with study tips based on their workload"
}

Only return valid JSON, no markdown.`,
        },
        {
          role: 'user',
          content: `Here's my schedule and assignments:

WEEKLY AVAILABILITY:
${JSON.stringify(formattedSchedule, null, 2)}

PENDING ASSIGNMENTS:
${JSON.stringify(formattedAssignments, null, 2)}

ALREADY SCHEDULED (avoid conflicts):
${JSON.stringify(formattedExistingTasks, null, 2)}

Please create a study schedule for the next 2 weeks.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse AI response
    let aiResponse;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', responseText);
      return NextResponse.json({ 
        suggestions: [],
        insights: 'Unable to generate suggestions at this time. Please try again.',
        error: 'Failed to parse AI response'
      });
    }

    // Save suggestions to database
    if (aiResponse.suggestions && aiResponse.suggestions.length > 0) {
      // Clear old pending suggestions
      await supabase
        .from('schedule_suggestions')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'pending');

      // Insert new suggestions
      const suggestionsToInsert = aiResponse.suggestions.map((s: any) => ({
        user_id: user.id,
        assignment_id: s.assignmentId,
        suggested_date: s.date,
        suggested_start: s.startTime,
        suggested_end: s.endTime,
        reason: s.reason,
        status: 'pending',
      }));

      await supabase
        .from('schedule_suggestions')
        .insert(suggestionsToInsert);
    }

    return NextResponse.json({
      suggestions: aiResponse.suggestions || [],
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
