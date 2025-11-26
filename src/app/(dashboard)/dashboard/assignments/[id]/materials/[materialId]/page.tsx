'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, FileText, HelpCircle, Layers, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';

// Local interface for material with any content type
interface MaterialData {
  id: string;
  assignment_id: string;
  user_id: string;
  type: string;
  title: string;
  content: unknown;
  created_at: string;
  updated_at: string;
}

// Type guard helpers
interface FlashcardData {
  flashcards?: { front: string; back: string }[];
  cards?: { front: string; back: string; id?: string }[];
}

interface PracticeTestData {
  questions?: { question: string; options?: string[]; answer?: string; correctAnswer?: string; explanation?: string }[];
}

interface NotesData {
  summary?: string;
  keyPoints?: string[];
  importantTerms?: { term: string; definition: string }[];
}

interface StudyGuideData {
  sections?: { title: string; content: string; keyTakeaways?: string[] }[];
  reviewQuestions?: string[];
}

function isFlashcardContent(content: unknown): content is FlashcardData {
  if (typeof content !== 'object' || content === null) return false;
  const obj = content as Record<string, unknown>;
  return Array.isArray(obj.flashcards) || Array.isArray(obj.cards);
}

function isPracticeTestContent(content: unknown): content is PracticeTestData {
  if (typeof content !== 'object' || content === null) return false;
  const obj = content as Record<string, unknown>;
  return Array.isArray(obj.questions);
}

function isNotesContent(content: unknown): content is NotesData {
  if (typeof content !== 'object' || content === null) return false;
  const obj = content as Record<string, unknown>;
  return typeof obj.summary === 'string' || Array.isArray(obj.keyPoints) || Array.isArray(obj.importantTerms);
}

function isStudyGuideContent(content: unknown): content is StudyGuideData {
  if (typeof content !== 'object' || content === null) return false;
  const obj = content as Record<string, unknown>;
  return Array.isArray(obj.sections) || Array.isArray(obj.reviewQuestions);
}

export default function StudyMaterialPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;
  const materialId = params.materialId as string;

  const [material, setMaterial] = useState<MaterialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchMaterial();
  }, [materialId]);

  const fetchMaterial = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('study_materials')
        .select('*')
        .eq('id', materialId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setMaterial(data);
    } catch (err) {
      console.error('Error fetching material:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteMaterial = async () => {
    if (!material) return;

    const { error } = await supabase
      .from('study_materials')
      .delete()
      .eq('id', material.id);

    if (!error) {
      router.push(`/dashboard/assignments/${assignmentId}`);
    }
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'notes': return FileText;
      case 'study_guide': return BookOpen;
      case 'practice_test': return HelpCircle;
      case 'flashcards': return Layers;
      default: return FileText;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'notes': return 'bg-cyan-200';
      case 'study_guide': return 'bg-emerald-200';
      case 'practice_test': return 'bg-violet-200';
      case 'flashcards': return 'bg-amber-200';
      default: return 'bg-gray-200';
    }
  };

  const formatTypeName = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-black mb-2">Study material not found</h2>
        <Link href={`/dashboard/assignments/${assignmentId}`} className="text-black font-bold underline hover:no-underline">
          Back to assignment
        </Link>
      </div>
    );
  }

  const Icon = getMaterialIcon(material.type);

  // Parse the content - handle both JSON and plain text
  let displayContent: unknown = material.content;
  try {
    const parsed = typeof material.content === 'string' ? JSON.parse(material.content) : material.content;
    displayContent = parsed;
  } catch {
    // Content is plain text
  }

  // Render content based on type
  const renderContent = () => {
    // Notes
    if (material.type === 'notes' && isNotesContent(displayContent)) {
      return <NotesView content={displayContent} />;
    }
    
    // Study Guide
    if (material.type === 'study_guide' && isStudyGuideContent(displayContent)) {
      return <StudyGuideView content={displayContent} />;
    }
    
    // Flashcards
    if (material.type === 'flashcards' && isFlashcardContent(displayContent)) {
      const cards = displayContent.flashcards || displayContent.cards || [];
      if (cards.length > 0) {
        return <FlashcardView flashcards={cards} />;
      }
    }
    
    // Practice Test
    if (material.type === 'practice_test' && isPracticeTestContent(displayContent)) {
      const questions = (displayContent.questions || []).map(q => ({
        question: q.question,
        options: q.options,
        answer: q.answer || q.correctAnswer || '',
        explanation: q.explanation
      }));
      if (questions.length > 0) {
        return <PracticeTestView questions={questions} />;
      }
    }
    
    // Fallback for structured JSON
    if (typeof displayContent === 'object' && displayContent !== null) {
      return (
        <div className="prose prose-gray max-w-none">
          <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap text-gray-900">
            {JSON.stringify(displayContent, null, 2)}
          </pre>
        </div>
      );
    }
    
    // Plain text fallback
    return (
      <div className="prose prose-gray max-w-none">
        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
          {String(displayContent)}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/assignments/${assignmentId}`}
          className="inline-flex items-center gap-2 text-gray-700 hover:text-black font-bold mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assignment
        </Link>
      </div>

      {/* Material Card */}
      <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b-3 border-black">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 border-2 border-black ${getIconColor(material.type)}`}>
                <Icon className="h-6 w-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-black text-black">{material.title}</h1>
                <p className="text-sm text-gray-600 font-medium">
                  {formatTypeName(material.type)} • Created {formatDate(material.created_at)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="p-2 text-red-600 hover:bg-red-100 border-2 border-black transition-colors"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white border-3 border-black shadow-[8px_8px_0_0_#000] p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-black text-black mb-2">Delete Study Material?</h3>
            <p className="text-gray-700 font-medium mb-6">
              This will permanently delete this {material.type.replace('_', ' ')}.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2 bg-gray-200 border-3 border-black text-black font-bold shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
              >
                Cancel
              </button>
              <button
                onClick={deleteMaterial}
                className="flex-1 py-2 bg-red-400 border-3 border-black text-black font-bold shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Flashcard View Component
function FlashcardView({ flashcards }: { flashcards: { front: string; back: string }[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const currentCard = flashcards[currentIndex];

  const nextCard = () => {
    setFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const prevCard = () => {
    setFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  if (!currentCard) return null;

  return (
    <div className="space-y-6">
      <div className="text-center text-sm text-gray-600 font-bold">
        Card {currentIndex + 1} of {flashcards.length}
      </div>
      
      <div
        onClick={() => setFlipped(!flipped)}
        className={`min-h-[200px] p-8 border-3 border-black shadow-[4px_4px_0_0_#000] cursor-pointer transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${
          flipped ? 'bg-emerald-200' : 'bg-violet-200'
        }`}
      >
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-gray-700 font-bold mb-4">
            {flipped ? 'Answer' : 'Question'} (click to flip)
          </p>
          <p className="text-lg font-bold text-black">
            {flipped ? currentCard.back : currentCard.front}
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={prevCard}
          className="px-6 py-2 bg-gray-200 border-3 border-black font-bold shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          Previous
        </button>
        <button
          onClick={nextCard}
          className="px-6 py-2 bg-yellow-300 border-3 border-black font-bold shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Notes View Component
function NotesView({ content }: { content: NotesData }) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      {content.summary && (
        <div className="p-4 bg-cyan-100 border-3 border-black">
          <h3 className="text-sm font-black text-black uppercase tracking-wider mb-2">Summary</h3>
          <p className="text-gray-800 leading-relaxed font-medium">{content.summary}</p>
        </div>
      )}

      {/* Key Points */}
      {content.keyPoints && content.keyPoints.length > 0 && (
        <div>
          <h3 className="text-lg font-black text-black mb-3 flex items-center gap-2">
            <span className="w-3 h-3 bg-emerald-400 border-2 border-black"></span>
            Key Points
          </h3>
          <ul className="space-y-2">
            {content.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-emerald-100 border-2 border-black">
                <span className="flex-shrink-0 w-6 h-6 bg-emerald-300 text-black border-2 border-black flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </span>
                <span className="text-gray-800 font-medium">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Important Terms */}
      {content.importantTerms && content.importantTerms.length > 0 && (
        <div>
          <h3 className="text-lg font-black text-black mb-3 flex items-center gap-2">
            <span className="w-3 h-3 bg-violet-400 border-2 border-black"></span>
            Important Terms
          </h3>
          <div className="grid gap-3">
            {content.importantTerms.map((item, index) => (
              <div key={index} className="p-4 bg-violet-100 border-3 border-black">
                <dt className="font-black text-black mb-1">{item.term}</dt>
                <dd className="text-gray-700 font-medium">{item.definition}</dd>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Study Guide View Component
function StudyGuideView({ content }: { content: StudyGuideData }) {
  return (
    <div className="space-y-8">
      {/* Sections */}
      {content.sections && content.sections.length > 0 && (
        <div className="space-y-6">
          {content.sections.map((section, index) => (
            <div key={index} className="border-3 border-black overflow-hidden">
              <div className="bg-emerald-200 px-4 py-3 border-b-3 border-black">
                <h3 className="font-black text-black flex items-center gap-2">
                  <span className="w-7 h-7 bg-emerald-400 text-black border-2 border-black flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  {section.title}
                </h3>
              </div>
              <div className="p-4 bg-white">
                <p className="text-gray-700 leading-relaxed mb-4 font-medium">{section.content}</p>
                {section.keyTakeaways && section.keyTakeaways.length > 0 && (
                  <div className="mt-4 pt-4 border-t-2 border-black">
                    <h4 className="text-sm font-black text-black uppercase tracking-wider mb-2">Key Takeaways</h4>
                    <ul className="space-y-1">
                      {section.keyTakeaways.map((takeaway, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-700 font-medium">
                          <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                          <span>{takeaway}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Questions */}
      {content.reviewQuestions && content.reviewQuestions.length > 0 && (
        <div className="bg-amber-200 border-3 border-black p-4">
          <h3 className="font-black text-black mb-3 flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Review Questions
          </h3>
          <ol className="space-y-2 list-decimal list-inside">
            {content.reviewQuestions.map((question, index) => (
              <li key={index} className="text-gray-800 pl-2 font-medium">{question}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// Practice Test View Component
function PracticeTestView({ questions }: { questions: { question: string; options?: string[]; answer: string; explanation?: string }[] }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (questionIndex: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: answer }));
  };

  const score = questions.reduce((acc, q, i) => {
    return acc + (answers[i]?.toLowerCase() === q.answer.toLowerCase() ? 1 : 0);
  }, 0);

  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <div key={i} className="p-4 bg-gray-100 border-3 border-black">
          <p className="font-bold text-black mb-3">
            {i + 1}. {q.question}
          </p>
          {q.options ? (
            <div className="space-y-2">
              {q.options.map((option, optIndex) => (
                <label key={optIndex} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${i}`}
                    value={option}
                    checked={answers[i] === option}
                    onChange={(e) => handleAnswer(i, e.target.value)}
                    className="h-4 w-4 text-black accent-black"
                  />
                  <span className={`font-medium ${showResults && option.toLowerCase() === q.answer.toLowerCase() ? 'text-emerald-700 font-bold' : 'text-gray-700'}`}>
                    {option}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={answers[i] || ''}
              onChange={(e) => handleAnswer(i, e.target.value)}
              placeholder="Your answer..."
              className="w-full px-3 py-2 border-3 border-black text-black bg-white font-medium focus:ring-0 focus:border-black outline-none"
            />
          )}
          {showResults && (
            <div className="mt-3 pt-3 border-t-2 border-black">
              <p className="text-sm text-emerald-700 font-bold">
                ✓ Correct answer: {q.answer}
              </p>
              {q.explanation && (
                <p className="mt-1 text-sm text-gray-700 font-medium">
                  <span className="font-bold">Explanation:</span> {q.explanation}
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between pt-4 border-t-3 border-black">
        <button
          onClick={() => setShowResults(!showResults)}
          className="px-6 py-2 bg-violet-300 border-3 border-black font-bold shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          {showResults ? 'Hide Answers' : 'Check Answers'}
        </button>
        {showResults && (
          <p className="text-lg font-black text-black">
            Score: {score}/{questions.length} ({Math.round((score / questions.length) * 100)}%)
          </p>
        )}
      </div>
    </div>
  );
}
