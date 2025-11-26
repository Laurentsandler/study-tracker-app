import Groq from 'groq-sdk';

// Create Groq client lazily to avoid build-time errors
const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }
  return new Groq({ apiKey });
};

// Get current date context for AI prompts
function getDateContext(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  return `Today's date: ${monthNames[now.getMonth()]} ${day}, ${year} (${dayNames[now.getDay()]})
Current date in ISO format: ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}
Current school year: ${month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`}`;
}

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
  
  // Fix common JSON issues from AI responses
  cleaned = cleaned
    .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
    .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
    .replace(/[\u201C\u201D]/g, '"')  // Replace smart quotes
    .replace(/[\u2018\u2019]/g, "'"); // Replace smart apostrophes
  
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse JSON response:', cleaned);
    throw new Error('Failed to parse AI response as JSON');
  }
}

export async function generateStudyNotes(content: string): Promise<{
  summary: string;
  keyPoints: string[];
  importantTerms: { term: string; definition: string }[];
}> {
  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are a helpful study assistant creating study notes for a student.

${getDateContext()}

TASK: Generate concise, well-organized study notes from the provided content.

OUTPUT FORMAT - Return ONLY a valid JSON object with these exact fields:
{
  "summary": "A clear 2-3 sentence summary of the main topic",
  "keyPoints": ["Point 1", "Point 2", ...],
  "importantTerms": [{"term": "Term1", "definition": "Definition1"}, ...]
}

REQUIREMENTS:
- summary: 2-3 sentences capturing the main ideas
- keyPoints: Array of 5-7 key points (strings only)
- importantTerms: Array of 5-10 vocabulary terms with clear definitions

CRITICAL: Return ONLY valid JSON. No markdown, no extra text, no code blocks.`,
      },
      {
        role: 'user',
        content: content,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const response = completion.choices[0]?.message?.content || '{}';
  return parseJsonResponse(response);
}

export async function generateStudyGuide(content: string): Promise<{
  sections: { title: string; content: string; keyTakeaways: string[] }[];
  reviewQuestions: string[];
}> {
  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are a helpful study assistant creating a comprehensive study guide.

${getDateContext()}

TASK: Generate a well-structured study guide from the provided content.

OUTPUT FORMAT - Return ONLY a valid JSON object with these exact fields:
{
  "sections": [
    {
      "title": "Section Title",
      "content": "Detailed explanation paragraph",
      "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"]
    }
  ],
  "reviewQuestions": ["Question 1?", "Question 2?", ...]
}

REQUIREMENTS:
- sections: 3-6 logical sections covering all major topics
  - title: Clear section heading
  - content: 2-4 paragraph detailed explanation
  - keyTakeaways: Array of 2-4 bullet points per section
- reviewQuestions: Array of 5-10 review questions for self-testing

CRITICAL: Return ONLY valid JSON. No markdown, no extra text, no code blocks.`,
      },
      {
        role: 'user',
        content: content,
      },
    ],
    temperature: 0.4,
    max_tokens: 3000,
  });

  const response = completion.choices[0]?.message?.content || '{}';
  return parseJsonResponse(response);
}

export async function generatePracticeTest(content: string): Promise<{
  questions: {
    id: string;
    question: string;
    type: 'multiple_choice' | 'short_answer' | 'true_false';
    options?: string[];
    correctAnswer: string;
    explanation: string;
  }[];
}> {
  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are a helpful study assistant creating a practice test.

${getDateContext()}

TASK: Generate a varied practice test from the provided content.

OUTPUT FORMAT - Return ONLY a valid JSON object with this exact structure:
{
  "questions": [
    {
      "id": "q1",
      "question": "What is...?",
      "type": "multiple_choice",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A",
      "explanation": "The answer is A because..."
    },
    {
      "id": "q2",
      "question": "Explain the concept of...",
      "type": "short_answer",
      "correctAnswer": "The expected answer includes...",
      "explanation": "This tests understanding of..."
    },
    {
      "id": "q3",
      "question": "True or False: Statement here",
      "type": "true_false",
      "correctAnswer": "True",
      "explanation": "This is true because..."
    }
  ]
}

REQUIREMENTS:
- Generate 10-15 questions total
- Mix of question types: ~6 multiple_choice, ~4 short_answer, ~3 true_false
- Each question MUST have: id, question, type, correctAnswer, explanation
- Multiple choice questions MUST have "options" array with exactly 4 choices (A, B, C, D)
- correctAnswer for multiple_choice should be just the letter (A, B, C, or D)
- IDs should be sequential: q1, q2, q3, etc.

CRITICAL: Return ONLY valid JSON. No markdown, no extra text, no code blocks.`,
      },
      {
        role: 'user',
        content: content,
      },
    ],
    temperature: 0.5,
    max_tokens: 4000,
  });

  const response = completion.choices[0]?.message?.content || '{}';
  return parseJsonResponse(response);
}

export async function generateFlashcards(content: string): Promise<{
  cards: { id: string; front: string; back: string }[];
}> {
  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are a helpful study assistant creating flashcards for effective studying.

${getDateContext()}

TASK: Generate high-quality flashcards from the provided content.

OUTPUT FORMAT - Return ONLY a valid JSON object with this exact structure:
{
  "cards": [
    {"id": "card1", "front": "Question or term", "back": "Answer or definition"},
    {"id": "card2", "front": "What is X?", "back": "X is..."},
    ...
  ]
}

REQUIREMENTS:
- Generate 15-25 flashcards
- Each card MUST have: id, front, back
- IDs should be: card1, card2, card3, etc.
- "front": The question, term, or concept (keep concise)
- "back": The answer, definition, or explanation (clear and complete)

CARD TYPES TO INCLUDE:
- Vocabulary definitions
- Key concepts and explanations
- Important facts and dates
- Cause and effect relationships
- Compare/contrast items
- Process steps or sequences

CRITICAL: Return ONLY valid JSON. No markdown, no extra text, no code blocks.`,
      },
      {
        role: 'user',
        content: content,
      },
    ],
    temperature: 0.3,
    max_tokens: 3000,
  });

  const response = completion.choices[0]?.message?.content || '{}';
  return parseJsonResponse(response);
}

export async function parseAssignmentText(
  rawText: string,
  source?: { type: 'file' | 'text'; fileName?: string; fileType?: string }
): Promise<{
  title: string;
  description: string;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  estimated_duration: number;
}> {
  const groq = getGroqClient();
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Build context about the source
  let sourceContext = '';
  if (source?.type === 'file' && source.fileName) {
    const fileTypeDesc = source.fileType?.includes('pdf') ? 'PDF document' :
                         source.fileType?.includes('word') || source.fileName.endsWith('.docx') ? 'Word document' :
                         source.fileName.endsWith('.txt') ? 'text file' :
                         source.fileName.endsWith('.md') ? 'Markdown file' : 'document';
    sourceContext = `SOURCE: The text was extracted from a ${fileTypeDesc} named "${source.fileName}".`;
  } else if (source?.type === 'text') {
    sourceContext = 'SOURCE: The user manually entered or pasted this text.';
  }
  
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are an intelligent assistant that extracts assignment details from student-provided text.

CURRENT DATE CONTEXT:
- Today: ${monthNames[currentMonth - 1]} ${currentDay}, ${currentYear} (${dayNames[currentDate.getDay()]})
- ISO Format: ${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}
- Current Year: ${currentYear}
- School Year: ${currentMonth >= 8 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`}

TASK: Parse the provided text and extract assignment information.

OUTPUT FORMAT - Return ONLY a valid JSON object with these exact fields:
{
  "title": "Clear, concise assignment title",
  "description": "All relevant details, instructions, requirements",
  "due_date": "YYYY-MM-DD or null",
  "priority": "low|medium|high",
  "estimated_duration": 60
}

EXTRACTION RULES:
1. TITLE: Create a descriptive title (e.g., "Chapter 5 Math Homework", "WWII Essay")
   - If from a syllabus, identify the specific assignment name
   
2. DESCRIPTION: Include ALL relevant details:
   - Instructions and requirements
   - Page numbers, question numbers
   - Word counts, formatting requirements
   - Any special notes or restrictions

3. DUE DATE:
   - Parse any date mentioned into YYYY-MM-DD format
   - If only day/month given, assume year ${currentYear}
   - If that date has already passed, use ${currentYear + 1}
   - "next Monday" = calculate from today
   - "Friday" without date = the coming Friday
   - Return null if no due date is mentioned

4. PRIORITY:
   - "high": exams, finals, midterms, major projects, high grade weight
   - "medium": regular homework, quizzes, standard assignments
   - "low": extra credit, practice, optional, ungraded

5. ESTIMATED_DURATION: Time in minutes to complete
   - Short worksheet: 15-30 min
   - Regular homework: 30-60 min
   - Essay/project: 60-180 min
   - Major project: 180+ min

CRITICAL: Return ONLY valid JSON. No markdown, no extra text, no code blocks.`,
      },
      {
        role: 'user',
        content: `${sourceContext ? sourceContext + '\n\n' : ''}Please extract assignment details from this content:\n\n${rawText}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 1500,
  });

  const response = completion.choices[0]?.message?.content || '{}';
  return parseJsonResponse(response);
}

export async function transcribeWithGroq(audioBase64: string): Promise<string> {
  const groq = getGroqClient();
  // Note: Groq's Whisper API requires audio file, not base64
  // This is a placeholder - you'll need to handle audio file conversion
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'Process the transcribed text and clean it up for assignment input.',
      },
      {
        role: 'user',
        content: `Transcribed audio: ${audioBase64}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 2000,
  });

  return completion.choices[0]?.message?.content || '';
}

export { getGroqClient };
