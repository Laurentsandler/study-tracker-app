import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }
  return new Groq({ apiKey });
};

// Helper function to clean and parse JSON from AI response
function parseJsonResponse<T>(response: string): T {
  let cleaned = response.trim();
  
  // Remove markdown code blocks if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  
  cleaned = cleaned.trim();
  
  // Try to find JSON object or array in the response
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

// Get current date context
function getDateContext(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  return `Today: ${monthNames[now.getMonth()]} ${day}, ${year} (${dayNames[now.getDay()]})
ISO: ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    const groq = getGroqClient();

    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an intelligent assistant that extracts information from photos of student schoolwork.

CURRENT DATE: ${getDateContext()}

TASK: Analyze this photo of completed schoolwork and extract ALL visible information.

IMPORTANT - This is likely HANDWRITTEN content:
- Be extra careful when reading handwriting
- Do your best to interpret messy handwriting
- Include "[unclear]" if text is unreadable

OUTPUT FORMAT - Return ONLY a valid JSON object:
{
  "title": "Descriptive title based on content",
  "topic": "Main subject/topic",
  "content": "Full transcription of ALL visible text",
  "date_completed": "YYYY-MM-DD or null",
  "worklog_type": "classwork|homework|notes|quiz|test|project|other",
  "description": "1-2 sentence summary"
}

FIELD GUIDELINES:
1. TITLE: Create a descriptive title (e.g., "Math Chapter 5 Problems", "Biology Lab Report")
2. TOPIC: Main subject (e.g., "Algebra", "World War II", "Photosynthesis")
3. CONTENT: Transcribe ALL visible text including:
   - Written text and answers
   - Math problems and solutions
   - Diagrams described in text
   - Notes, annotations, corrections
4. DATE_COMPLETED: Extract any date visible, format as YYYY-MM-DD, or null
5. WORKLOG_TYPE: Choose the best match:
   - "classwork": Done during class
   - "homework": Assigned for home
   - "notes": Class or study notes
   - "quiz": Short quiz
   - "test": Major exam
   - "project": Project work
   - "other": Anything else
6. DESCRIPTION: Brief summary of the work

CRITICAL: Return ONLY valid JSON. No markdown, no extra text, no code blocks.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    
    const parsed = parseJsonResponse<{
      title: string;
      topic: string;
      content: string;
      date_completed: string | null;
      worklog_type: string;
      description: string;
    }>(response);

    return NextResponse.json({
      success: true,
      data: parsed,
      raw_text: response,
    });
  } catch (error) {
    console.error('Error analyzing worklog image:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image', details: String(error) },
      { status: 500 }
    );
  }
}
