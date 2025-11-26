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

// Helper to normalize times - convert midnight (00:00:00) to 23:59:59
// This handles the edge case where users want a block ending at midnight
function normalizeEndTime(time: string): string {
  if (time === '00:00:00' || time === '00:00') {
    return '23:59:59';
  }
  return time;
}

// GET - Fetch user's weekly schedule blocks
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
      .from('user_schedule')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week', { ascending: true })
      .order('available_start', { ascending: true });

    if (error) {
      console.error('Error fetching schedule:', error);
      return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new schedule block
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
    const { day_of_week, available_start, available_end, label, block_type, location } = body;

    if (day_of_week === undefined || !available_start || !available_end) {
      return NextResponse.json(
        { error: 'day_of_week, available_start, and available_end are required' },
        { status: 400 }
      );
    }

    // Normalize end time to handle midnight edge case
    const normalizedEndTime = normalizeEndTime(available_end);

    const { data, error } = await supabase
      .from('user_schedule')
      .insert({
        user_id: user.id,
        day_of_week,
        available_start,
        available_end: normalizedEndTime,
        label: label || null,
        block_type: block_type || 'study',
        location: location || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating schedule block:', error);
      return NextResponse.json({ error: 'Failed to create schedule block' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Bulk update schedule (replace all blocks for user)
export async function PUT(request: NextRequest) {
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
    const { blocks } = body;

    if (!Array.isArray(blocks)) {
      return NextResponse.json({ error: 'blocks array is required' }, { status: 400 });
    }

    // Delete all existing blocks for this user
    await supabase
      .from('user_schedule')
      .delete()
      .eq('user_id', user.id);

    // Insert new blocks
    if (blocks.length > 0) {
      const blocksWithUserId = blocks.map(block => ({
        ...block,
        user_id: user.id,
        available_end: normalizeEndTime(block.available_end),
      }));

      const { error } = await supabase
        .from('user_schedule')
        .insert(blocksWithUserId);

      if (error) {
        console.error('Error updating schedule:', error);
        return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
      }
    }

    // Fetch and return updated schedule
    const { data } = await supabase
      .from('user_schedule')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week', { ascending: true })
      .order('available_start', { ascending: true });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
