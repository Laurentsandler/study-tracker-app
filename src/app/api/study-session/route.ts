import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGroqClient } from '@/lib/groq/client';

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
  
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse JSON response:', cleaned);
    throw new Error('Failed to parse AI response as JSON');
  }
}

// POST - Create a study session by gathering relevant content using AI
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
    const {
      topic,
      unit,
      subject,
      dateFrom,
      dateTo,
      courseId,
      includeWorklogs = true,
      includeAssignments = true,
    } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const groq = getGroqClient();

    // Step 1: Use AI to expand the topic into related subtopics and keywords
    // This understands College Board curriculum (AP classes) and common course structures
    const expansionCompletion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert in academic curricula, especially College Board AP courses, IB programs, and standard high school/college courses.

Given a study topic, generate a comprehensive list of related subtopics, concepts, and keywords that would help find relevant study materials.

For example:
- "Chemistry of Life" (AP Bio Unit 1) → proteins, amino acids, carbohydrates, lipids, nucleic acids, DNA, RNA, enzymes, macromolecules, monomers, polymers, dehydration synthesis, hydrolysis, functional groups, pH, buffers, water properties, hydrogen bonds, organic molecules
- "Cells" (AP Bio Unit 2) → cell membrane, phospholipid bilayer, organelles, mitochondria, chloroplast, nucleus, ribosomes, endoplasmic reticulum, golgi apparatus, vesicles, cytoskeleton, cell wall, prokaryotes, eukaryotes
- "World War II" (AP History) → axis powers, allied powers, holocaust, D-Day, Pearl Harbor, atomic bomb, Hitler, Churchill, Roosevelt, Stalin, Treaty of Versailles, fascism, Nazi Germany
- "Quadratic Functions" (Algebra) → parabola, vertex, axis of symmetry, roots, zeros, factoring, quadratic formula, discriminant, completing the square, standard form, vertex form

Return a JSON object with:
- relatedTerms: Array of 20-40 related terms, concepts, and keywords (lowercase)
- broaderContext: Brief description of what this topic covers
- courseContext: What course/exam this likely relates to (e.g., "AP Biology", "AP US History")

Only return valid JSON, no markdown.`,
        },
        {
          role: 'user',
          content: `Topic: ${topic}${unit ? `\nUnit: ${unit}` : ''}${subject ? `\nSubject/Course: ${subject}` : ''}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    let relatedTerms: string[] = [];
    let courseContext = '';
    try {
      const expansionResponse = expansionCompletion.choices[0]?.message?.content || '{}';
      const expansion = parseJsonResponse<{
        relatedTerms?: string[];
        broaderContext?: string;
        courseContext?: string;
      }>(expansionResponse);
      relatedTerms = expansion.relatedTerms || [];
      courseContext = expansion.courseContext || '';
    } catch (e) {
      console.error('Error parsing topic expansion:', e);
    }

    // Build comprehensive search terms
    const searchTerms = [
      topic.toLowerCase(),
      ...(unit ? [unit.toLowerCase()] : []),
      ...(subject ? [subject.toLowerCase()] : []),
      ...relatedTerms.map(t => t.toLowerCase()),
    ];

    // Collect all materials first
    const allWorklogs: any[] = [];
    const allAssignments: any[] = [];

    // Fetch all worklogs within date range
    if (includeWorklogs) {
      let worklogQuery = supabase
        .from('worklogs')
        .select('*')
        .eq('user_id', user.id)
        .order('date_completed', { ascending: false });

      if (courseId) {
        worklogQuery = worklogQuery.eq('course_id', courseId);
      }
      if (dateFrom) {
        worklogQuery = worklogQuery.gte('date_completed', dateFrom);
      }
      if (dateTo) {
        worklogQuery = worklogQuery.lte('date_completed', dateTo);
      }

      const { data: worklogs } = await worklogQuery;
      if (worklogs) allWorklogs.push(...worklogs);
    }

    // Fetch all assignments within date range
    if (includeAssignments) {
      let assignmentQuery = supabase
        .from('assignments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (courseId) {
        assignmentQuery = assignmentQuery.eq('course_id', courseId);
      }
      if (dateFrom) {
        assignmentQuery = assignmentQuery.gte('created_at', dateFrom);
      }
      if (dateTo) {
        assignmentQuery = assignmentQuery.lte('created_at', dateTo);
      }

      const { data: assignments } = await assignmentQuery;
      if (assignments) allAssignments.push(...assignments);
    }

    // Step 2: Use AI to determine which materials are relevant
    // Prepare summaries of all materials for AI to evaluate
    const materialSummaries = [
      ...allWorklogs.map(wl => ({
        id: wl.id,
        type: 'worklog' as const,
        title: wl.title,
        date: wl.date_completed,
        summary: [wl.title, wl.topic, wl.description?.substring(0, 200)].filter(Boolean).join(' | '),
        fullContent: [wl.title, wl.description, wl.content].filter(Boolean).join('\n\n'),
      })),
      ...allAssignments.map(a => ({
        id: a.id,
        type: 'assignment' as const,
        title: a.title,
        date: a.created_at,
        summary: [a.title, a.description?.substring(0, 200)].filter(Boolean).join(' | '),
        fullContent: [a.title, a.description, a.raw_input_text].filter(Boolean).join('\n\n'),
      })),
    ];

    let relevantIds: string[] = [];

    if (materialSummaries.length > 0) {
      // First do a quick keyword filter to reduce the list
      const keywordFiltered = materialSummaries.filter(m => {
        const text = m.summary.toLowerCase() + ' ' + m.fullContent.toLowerCase();
        return searchTerms.some(term => text.includes(term));
      });

      // If keyword filter finds materials, use those
      // Otherwise, ask AI to evaluate all materials
      const materialsToEvaluate = keywordFiltered.length > 0 ? keywordFiltered : materialSummaries;

      if (materialsToEvaluate.length > 0) {
        // Create a compact list for AI to evaluate
        const materialList = materialsToEvaluate.map((m, i) => 
          `[${i}] ${m.type}: "${m.title}" - ${m.summary.substring(0, 150)}`
        ).join('\n');

        const relevanceCompletion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are helping a student find study materials related to their topic.

Given a study topic and a list of the student's work, identify which items are relevant.

Be INCLUSIVE - if a material MIGHT be related to the topic, include it. Consider:
- Direct mentions of the topic
- Subtopics that fall under this topic
- Prerequisites or foundational concepts
- Related labs, experiments, or activities
- Practice problems on related concepts

Return a JSON object with:
- relevantIndices: Array of numbers (the indices [0], [1], etc. of relevant materials)
- reasoning: Brief explanation of why these are relevant

Only return valid JSON, no markdown.`,
            },
            {
              role: 'user',
              content: `Study Topic: ${topic}${unit ? ` (${unit})` : ''}${courseContext ? `\nCourse: ${courseContext}` : ''}

Student's Materials:
${materialList}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 1000,
        });

        try {
          const relevanceResponse = relevanceCompletion.choices[0]?.message?.content || '{}';
          const relevance = parseJsonResponse<{ relevantIndices?: number[]; reasoning?: string }>(relevanceResponse);
          
          if (relevance.relevantIndices && Array.isArray(relevance.relevantIndices)) {
            relevantIds = relevance.relevantIndices
              .filter(i => i >= 0 && i < materialsToEvaluate.length)
              .map(i => materialsToEvaluate[i].id);
          }
        } catch (e) {
          console.error('Error parsing relevance response:', e);
          // Fall back to keyword-matched materials
          relevantIds = keywordFiltered.map(m => m.id);
        }
      }
    }

    // Build final sources list
    const sources: {
      type: 'worklog' | 'assignment';
      id: string;
      title: string;
      date: string;
      content: string;
      topic?: string;
    }[] = [];

    for (const wl of allWorklogs) {
      if (relevantIds.includes(wl.id) && (wl.content || wl.description)) {
        sources.push({
          type: 'worklog',
          id: wl.id,
          title: wl.title,
          date: wl.date_completed,
          content: [wl.title, wl.description, wl.content].filter(Boolean).join('\n\n'),
          topic: wl.topic || undefined,
        });
      }
    }

    for (const a of allAssignments) {
      if (relevantIds.includes(a.id) && (a.description || a.raw_input_text)) {
        sources.push({
          type: 'assignment',
          id: a.id,
          title: a.title,
          date: a.created_at,
          content: [a.title, a.description, a.raw_input_text].filter(Boolean).join('\n\n'),
        });
      }
    }

    // Combine all content
    const combinedContent = sources.map(s => 
      `--- ${s.type.toUpperCase()}: ${s.title} (${s.date}) ---\n${s.content}`
    ).join('\n\n');

    // Step 3: Generate study plan overview using AI
    let overview: {
      keyTopics?: string[];
      recommendedFocus?: string[];
      estimatedStudyTime?: number;
      summary?: string;
    } | null = null;

    if (combinedContent.length > 0) {
      try {
        const overviewCompletion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are a helpful study assistant. Analyze the student's work and create a study plan overview.
              
Return a JSON object with:
- keyTopics: Array of 5-10 key topics/concepts found in the material
- recommendedFocus: Array of 3-5 areas the student should focus on most
- estimatedStudyTime: Estimated total study time in minutes
- summary: A brief 2-3 sentence summary of what this material covers

Only return valid JSON, no markdown.`,
            },
            {
              role: 'user',
              content: `The student wants to study for: ${topic}${unit ? ` (Unit: ${unit})` : ''}${subject ? ` in ${subject}` : ''}${courseContext ? `\nThis appears to be for: ${courseContext}` : ''}

Here is their collected work:\n\n${combinedContent.substring(0, 8000)}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        });

        const response = overviewCompletion.choices[0]?.message?.content || '{}';
        overview = parseJsonResponse(response);
      } catch (e) {
        console.error('Error generating overview:', e);
      }
    }

    // Calculate date range
    const dates = sources.map(s => new Date(s.date)).filter(d => !isNaN(d.getTime()));
    const dateRange = dates.length > 0 ? {
      from: new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0],
      to: new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0],
    } : { from: '', to: '' };

    return NextResponse.json({
      success: true,
      data: {
        topic,
        unit,
        subject,
        courseContext,
        relatedTerms: relatedTerms.slice(0, 15), // Return top related terms for UI
        sources,
        combinedContent,
        overview: {
          topic,
          unit,
          totalSources: sources.length,
          worklogCount: sources.filter(s => s.type === 'worklog').length,
          assignmentCount: sources.filter(s => s.type === 'assignment').length,
          dateRange,
          keyTopics: overview?.keyTopics || [],
          recommendedFocus: overview?.recommendedFocus || [],
          estimatedStudyTime: overview?.estimatedStudyTime || 60,
          summary: overview?.summary || '',
        },
      },
    });
  } catch (error) {
    console.error('Error creating study session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
