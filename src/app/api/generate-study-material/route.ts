import { NextRequest, NextResponse } from 'next/server';
import {
  generateStudyNotes,
  generateStudyGuide,
  generatePracticeTest,
  generateFlashcards,
} from '@/lib/groq/client';

export async function POST(request: NextRequest) {
  try {
    const { content, type } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!type || !['notes', 'study_guide', 'practice_test', 'flashcards'].includes(type)) {
      return NextResponse.json(
        { error: 'Valid type is required (notes, study_guide, practice_test, flashcards)' },
        { status: 400 }
      );
    }

    let result;
    switch (type) {
      case 'notes':
        result = await generateStudyNotes(content);
        break;
      case 'study_guide':
        result = await generateStudyGuide(content);
        break;
      case 'practice_test':
        result = await generatePracticeTest(content);
        break;
      case 'flashcards':
        result = await generateFlashcards(content);
        break;
      default:
        throw new Error('Invalid type');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating study material:', error);
    return NextResponse.json(
      { error: 'Failed to generate study material' },
      { status: 500 }
    );
  }
}
