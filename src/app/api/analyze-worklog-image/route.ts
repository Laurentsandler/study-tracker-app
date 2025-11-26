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
  
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse JSON response:', cleaned);
    throw new Error('Failed to parse AI response as JSON');
  }
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
    
    const currentDate = new Date();
    const dateStr = currentDate.toISOString().split('T')[0];

    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an intelligent assistant that extracts information from photos of student classwork, homework, notes, or assignments.

Today's date: ${dateStr}

The user has taken a photo of their completed schoolwork. This is likely HANDWRITTEN content, so please be extra careful when reading and transcribing it. Handwriting can be messy, so do your best to interpret the text accurately.

Your task: Analyze this image and extract ALL information you can see.

IMPORTANT GUIDELINES:
1. TITLE: Create a descriptive title based on the content (e.g., "Math Chapter 5 Problems", "History Notes on Civil War", "Biology Lab Report")
2. TOPIC: Identify the main subject/topic (e.g., "Algebra", "World War II", "Photosynthesis")
3. CONTENT: Transcribe ALL the visible text/content from the image as accurately as possible. Include:
   - All written text
   - Math problems and their solutions
   - Diagrams described in text
   - Any notes or annotations
4. DATE_COMPLETED: If you see a date on the paper, extract it in YYYY-MM-DD format. Otherwise use null.
5. WORKLOG_TYPE: Determine the type of work:
   - "classwork": Work done during class
   - "homework": Work assigned to do at home
   - "notes": Class notes or study notes
   - "quiz": Quiz or short test
   - "test": Exam or major test
   - "project": Project work
   - "other": Anything else
6. DESCRIPTION: A brief 1-2 sentence summary of what this work contains

Return ONLY a valid JSON object with these fields:
{
  "title": "string",
  "topic": "string", 
  "content": "string (full transcription of all visible text)",
  "date_completed": "YYYY-MM-DD or null",
  "worklog_type": "classwork|homework|notes|quiz|test|project|other",
  "description": "string"
}`,
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
