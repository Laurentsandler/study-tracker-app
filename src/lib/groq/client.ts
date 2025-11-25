import Groq from 'groq-sdk';

// Create Groq client lazily to avoid build-time errors
const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }
  return new Groq({ apiKey });
};

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
        content: `You are a helpful study assistant. Generate concise study notes from the given content. 
        Return a JSON object with:
        - summary: A brief 2-3 sentence summary
        - keyPoints: An array of 5-7 key points
        - importantTerms: An array of objects with term and definition
        Only return valid JSON, no markdown.`,
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
  return JSON.parse(response);
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
        content: `You are a helpful study assistant. Generate a comprehensive study guide from the given content.
        Return a JSON object with:
        - sections: An array of objects with title, content (detailed explanation), and keyTakeaways (array of strings)
        - reviewQuestions: An array of 5-10 review questions
        Only return valid JSON, no markdown.`,
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
  return JSON.parse(response);
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
        content: `You are a helpful study assistant. Generate a practice test from the given content.
        Return a JSON object with:
        - questions: An array of 10-15 question objects with:
          - id: unique identifier (q1, q2, etc.)
          - question: the question text
          - type: "multiple_choice", "short_answer", or "true_false"
          - options: array of 4 choices (only for multiple_choice)
          - correctAnswer: the correct answer
          - explanation: brief explanation of why this is correct
        Only return valid JSON, no markdown.`,
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
  return JSON.parse(response);
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
        content: `You are a helpful study assistant. Generate flashcards from the given content.
        Return a JSON object with:
        - cards: An array of 15-25 flashcard objects with:
          - id: unique identifier (card1, card2, etc.)
          - front: the question or term
          - back: the answer or definition
        Only return valid JSON, no markdown.`,
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
  return JSON.parse(response);
}

export async function parseAssignmentText(rawText: string): Promise<{
  title: string;
  description: string;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  estimated_duration: number;
}> {
  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant that parses assignment information from raw text.
        Extract and return a JSON object with:
        - title: A concise title for the assignment
        - description: A detailed description
        - due_date: ISO date string if a due date is mentioned, null otherwise
        - priority: "low", "medium", or "high" based on urgency/importance mentioned
        - estimated_duration: Estimated time to complete in minutes (default 60)
        Only return valid JSON, no markdown.`,
      },
      {
        role: 'user',
        content: rawText,
      },
    ],
    temperature: 0.2,
    max_tokens: 1000,
  });

  const response = completion.choices[0]?.message?.content || '{}';
  return JSON.parse(response);
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
