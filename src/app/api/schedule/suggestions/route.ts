import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

// GET - Fetch pending suggestions
export async function GET(request: NextRequest) {
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

    const { data, error } = await supabase
      .from('schedule_suggestions')
      .select('*, assignment:assignments(*, course:courses(*))')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('suggested_date', { ascending: true })
      .order('suggested_start', { ascending: true });

    if (error) {
      console.error('Error fetching suggestions:', error);
      return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/schedule/suggestions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Accept or dismiss a suggestion
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
    const { suggestionId, action } = body;

    if (!suggestionId || !['accept', 'dismiss', 'acceptAll', 'dismissAll'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (action === 'acceptAll') {
      // Get all pending suggestions
      const { data: suggestions } = await supabase
        .from('schedule_suggestions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (suggestions && suggestions.length > 0) {
        // Create planned tasks from all suggestions
        const tasks = suggestions.map(s => ({
          user_id: user.id,
          assignment_id: s.assignment_id,
          scheduled_date: s.suggested_date,
          scheduled_start: s.suggested_start,
          scheduled_end: s.suggested_end,
          notes: s.reason,
          ai_generated: true,
          task_type: 'assignment',
        }));

        await supabase.from('planned_tasks').insert(tasks);

        // Mark all as accepted
        await supabase
          .from('schedule_suggestions')
          .update({ status: 'accepted' })
          .eq('user_id', user.id)
          .eq('status', 'pending');
      }

      return NextResponse.json({ success: true, action: 'acceptAll' });
    }

    if (action === 'dismissAll') {
      await supabase
        .from('schedule_suggestions')
        .update({ status: 'dismissed' })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      return NextResponse.json({ success: true, action: 'dismissAll' });
    }

    // Fetch the specific suggestion
    const { data: suggestion } = await supabase
      .from('schedule_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .eq('user_id', user.id)
      .single();

    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }

    if (action === 'accept') {
      // Create a planned task from the suggestion
      const { error: taskError } = await supabase
        .from('planned_tasks')
        .insert({
          user_id: user.id,
          assignment_id: suggestion.assignment_id,
          scheduled_date: suggestion.suggested_date,
          scheduled_start: suggestion.suggested_start,
          scheduled_end: suggestion.suggested_end,
          notes: suggestion.reason,
          ai_generated: true,
          task_type: 'assignment',
        });

      if (taskError) {
        console.error('Error creating task:', taskError);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
      }

      // Mark suggestion as accepted
      await supabase
        .from('schedule_suggestions')
        .update({ status: 'accepted' })
        .eq('id', suggestionId);

      return NextResponse.json({ success: true, action: 'accept' });
    }

    if (action === 'dismiss') {
      await supabase
        .from('schedule_suggestions')
        .update({ status: 'dismissed' })
        .eq('id', suggestionId);

      return NextResponse.json({ success: true, action: 'dismiss' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/schedule/suggestions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
