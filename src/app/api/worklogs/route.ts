import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role for server-side operations
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

// GET - List all worklogs for user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    
    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch worklogs
    const { data: worklogs, error } = await supabase
      .from('worklogs')
      .select('*, course:courses(*), assignment:assignments(*)')
      .eq('user_id', user.id)
      .order('date_completed', { ascending: false });

    if (error) {
      console.error('Error fetching worklogs:', error);
      return NextResponse.json({ error: 'Failed to fetch worklogs' }, { status: 500 });
    }

    // Generate signed URLs for images
    const worklogsWithSignedUrls = await Promise.all(
      worklogs.map(async (worklog) => {
        if (worklog.storage_path) {
          const { data: signedUrlData } = await supabase.storage
            .from('worklog-images')
            .createSignedUrl(worklog.storage_path, 3600); // 1 hour expiry
          
          if (signedUrlData?.signedUrl) {
            return { ...worklog, image_url: signedUrlData.signedUrl };
          }
        }
        return worklog;
      })
    );

    return NextResponse.json({ worklogs: worklogsWithSignedUrls });
  } catch (error) {
    console.error('Error in worklogs GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new worklog
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    
    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      content,
      topic,
      worklog_type = 'classwork',
      date_completed,
      assignment_id,
      course_id,
      image_url,
      storage_path,
      raw_extracted_text,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Create worklog
    const { data: worklog, error } = await supabase
      .from('worklogs')
      .insert({
        user_id: user.id,
        title,
        description,
        content,
        topic,
        worklog_type,
        date_completed: date_completed || new Date().toISOString().split('T')[0],
        assignment_id,
        course_id,
        image_url,
        storage_path,
        raw_extracted_text,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating worklog:', error);
      return NextResponse.json({ error: 'Failed to create worklog' }, { status: 500 });
    }

    return NextResponse.json({ worklog }, { status: 201 });
  } catch (error) {
    console.error('Error in worklogs POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
