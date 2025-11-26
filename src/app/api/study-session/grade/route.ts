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
  
  // Fix common JSON issues
  cleaned = cleaned
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
  
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse JSON response:', cleaned);
    throw new Error('Failed to parse AI response as JSON');
  }
}

// POST - Grade short answer questions using AI
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
    const { questions } = body;

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: 'Questions array is required' }, { status: 400 });
    }

    // Format questions for grading
    const questionsToGrade = questions.map((q, i) => `
Question ${i + 1}: ${q.question}
Expected Answer: ${q.correctAnswer}
Student's Answer: ${q.studentAnswer}
`).join('\n---\n');

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a helpful and encouraging teacher grading student answers on a practice test.

TASK: Evaluate each student answer against the expected answer.

GRADING PHILOSOPHY - Be GENEROUS and focus on understanding:
- If the main concept is captured, mark it correct (even with different wording)
- Accept partial answers that show understanding
- Accept synonyms, alternative phrasings, and equivalent explanations
- Focus on conceptual understanding, not exact wording or memorization
- Give partial credit liberally for partially correct answers

OUTPUT FORMAT - Return ONLY a valid JSON object:
{
  "grades": [
    {
      "questionIndex": 0,
      "isCorrect": true,
      "score": 100,
      "feedback": "Excellent! Your answer correctly identifies..."
    },
    {
      "questionIndex": 1,
      "isCorrect": false,
      "score": 60,
      "feedback": "Good attempt! You got X right, but missed Y..."
    }
  ]
}

GRADING SCALE:
- 100: Perfect or excellent answer
- 80-99: Correct with minor omissions
- 60-79: Partially correct, shows understanding
- 40-59: Some correct elements, needs work
- 20-39: Minimal understanding shown
- 0-19: Incorrect or no attempt

FEEDBACK RULES:
- Always start with something positive
- Be encouraging, not discouraging
- Explain what was correct
- Gently explain what was missing (if anything)
- Keep feedback to 1-2 sentences

CRITICAL: Return ONLY valid JSON. No markdown, no extra text, no code blocks.`,
        },
        {
          role: 'user',
          content: `Please grade these short answer questions:\n\n${questionsToGrade}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse the JSON response
    let grades;
    try {
      grades = parseJsonResponse<{ grades: Array<{ questionIndex: number; isCorrect: boolean; score: number; feedback: string }> }>(responseText);
    } catch (parseError) {
      console.error('Error parsing AI response:', responseText);
      // Return a default response if parsing fails
      grades = {
        grades: questions.map((_, i) => ({
          questionIndex: i,
          isCorrect: false,
          score: 50,
          feedback: 'Unable to grade this answer automatically. Please review manually.',
        })),
      };
    }

    return NextResponse.json({
      success: true,
      grades: grades.grades || grades,
    });
  } catch (error) {
    console.error('Error grading answers:', error);
    return NextResponse.json(
      { error: 'Failed to grade answers' },
      { status: 500 }
    );
  }
}
