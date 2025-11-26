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

// GET - Fetch planned tasks (with optional date range filter)
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

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const date = searchParams.get('date');

    let query = supabase
      .from('planned_tasks')
      .select('*, assignment:assignments(*, course:courses(*))')
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_start', { ascending: true });

    if (date) {
      query = query.eq('scheduled_date', date);
    } else if (startDate && endDate) {
      query = query.gte('scheduled_date', startDate).lte('scheduled_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching planned tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch planned tasks' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new planned task
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
      assignment_id, 
      scheduled_date, 
      scheduled_start, 
      scheduled_end, 
      title,
      task_type,
      notes,
      ai_generated,
      priority 
    } = body;

    if (!scheduled_date || !scheduled_start || !scheduled_end) {
      return NextResponse.json(
        { error: 'scheduled_date, scheduled_start, and scheduled_end are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('planned_tasks')
      .insert({
        user_id: user.id,
        assignment_id: assignment_id || null,
        scheduled_date,
        scheduled_start,
        scheduled_end,
        title: title || null,
        task_type: task_type || 'assignment',
        notes: notes || null,
        ai_generated: ai_generated || false,
        priority: priority || 0,
      })
      .select('*, assignment:assignments(*, course:courses(*))')
      .single();

    if (error) {
      console.error('Error creating planned task:', error);
      return NextResponse.json({ error: 'Failed to create planned task' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
