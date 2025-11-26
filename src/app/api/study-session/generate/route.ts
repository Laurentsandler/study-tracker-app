import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateStudyNotes,
  generateStudyGuide,
  generatePracticeTest,
  generateFlashcards,
} from '@/lib/groq/client';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

// POST - Generate study materials from combined content
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
    const { content, type, topic, unit } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (!type || !['notes', 'study_guide', 'practice_test', 'flashcards'].includes(type)) {
      return NextResponse.json(
        { error: 'Valid type is required (notes, study_guide, practice_test, flashcards)' },
        { status: 400 }
      );
    }

    // Add context about the study session
    const contextualContent = `
STUDY SESSION CONTEXT:
Topic: ${topic || 'General'}
${unit ? `Unit: ${unit}` : ''}

STUDENT'S COLLECTED WORK:
${content}
`.trim();

    let result;
    switch (type) {
      case 'notes':
        result = await generateStudyNotes(contextualContent);
        break;
      case 'study_guide':
        result = await generateStudyGuide(contextualContent);
        break;
      case 'practice_test':
        result = await generatePracticeTest(contextualContent);
        break;
      case 'flashcards':
        result = await generateFlashcards(contextualContent);
        break;
      default:
        throw new Error('Invalid type');
    }

    return NextResponse.json({
      success: true,
      type,
      content: result,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating study material:', error);
    return NextResponse.json(
      { error: 'Failed to generate study material' },
      { status: 500 }
    );
  }
}
