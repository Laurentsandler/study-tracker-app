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

For each question, evaluate the student's answer against the expected answer. Be GENEROUS in your grading:
- If the student's answer captures the main concept, mark it correct even if wording differs
- Accept partial answers that show understanding
- Accept synonyms and alternative phrasings
- Focus on conceptual understanding, not exact wording

For each question, return:
- isCorrect: true/false (be generous!)
- score: 0-100 (give partial credit liberally)
- feedback: Brief, encouraging feedback explaining why it's correct or what was missing

Return a JSON object with an array called "grades" containing objects with: questionIndex, isCorrect, score, feedback

Only return valid JSON, no markdown.`,
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
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        grades = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
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
