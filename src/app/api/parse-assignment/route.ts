import { NextRequest, NextResponse } from 'next/server';
import { parseAssignmentText } from '@/lib/groq/client';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const parsed = await parseAssignmentText(text);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error parsing assignment:', error);
    return NextResponse.json(
      { error: 'Failed to parse assignment text' },
      { status: 500 }
    );
  }
}
