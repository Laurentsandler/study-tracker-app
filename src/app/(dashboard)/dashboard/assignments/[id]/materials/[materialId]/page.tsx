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
      case 'notes': return 'bg-blue-100 text-blue-600';
      case 'study_guide': return 'bg-green-100 text-green-600';
      case 'practice_test': return 'bg-purple-100 text-purple-600';
      case 'flashcards': return 'bg-orange-100 text-orange-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatTypeName = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Study material not found</h2>
        <Link href={`/dashboard/assignments/${assignmentId}`} className="text-primary-600 hover:text-primary-700">
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
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assignment
        </Link>
      </div>

      {/* Material Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${getIconColor(material.type)}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{material.title}</h1>
                <p className="text-sm text-gray-500">
                  {formatTypeName(material.type)} • Created {formatDate(material.created_at)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
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
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Study Material?</h3>
            <p className="text-gray-500 mb-6">
              This will permanently delete this {material.type.replace('_', ' ')}.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteMaterial}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
      <div className="text-center text-sm text-gray-500">
        Card {currentIndex + 1} of {flashcards.length}
      </div>
      
      <div
        onClick={() => setFlipped(!flipped)}
        className="min-h-[200px] p-8 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-xl cursor-pointer transition-all hover:shadow-lg"
      >
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-4">
            {flipped ? 'Answer' : 'Question'} (click to flip)
          </p>
          <p className="text-lg font-medium text-gray-900">
            {flipped ? currentCard.back : currentCard.front}
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={prevCard}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Previous
        </button>
        <button
          onClick={nextCard}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-2">Summary</h3>
          <p className="text-gray-700 leading-relaxed">{content.summary}</p>
        </div>
      )}

      {/* Key Points */}
      {content.keyPoints && content.keyPoints.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Key Points
          </h3>
          <ul className="space-y-2">
            {content.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <span className="text-gray-700">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Important Terms */}
      {content.importantTerms && content.importantTerms.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            Important Terms
          </h3>
          <div className="grid gap-3">
            {content.importantTerms.map((item, index) => (
              <div key={index} className="p-4 bg-purple-50 border border-purple-100 rounded-lg">
                <dt className="font-semibold text-purple-900 mb-1">{item.term}</dt>
                <dd className="text-gray-700">{item.definition}</dd>
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
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                    {index + 1}
                  </span>
                  {section.title}
                </h3>
              </div>
              <div className="p-4">
                <p className="text-gray-700 leading-relaxed mb-4">{section.content}</p>
                {section.keyTakeaways && section.keyTakeaways.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">Key Takeaways</h4>
                    <ul className="space-y-1">
                      {section.keyTakeaways.map((takeaway, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-600">
                          <span className="text-green-500 mt-1">✓</span>
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
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Review Questions
          </h3>
          <ol className="space-y-2 list-decimal list-inside">
            {content.reviewQuestions.map((question, index) => (
              <li key={index} className="text-gray-700 pl-2">{question}</li>
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
        <div key={i} className="p-4 bg-gray-50 rounded-lg">
          <p className="font-medium text-gray-900 mb-3">
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
                    className="h-4 w-4 text-primary-600"
                  />
                  <span className={`text-gray-700 ${showResults && option.toLowerCase() === q.answer.toLowerCase() ? 'text-green-600 font-medium' : ''}`}>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            />
          )}
          {showResults && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-green-600 font-medium">
                ✓ Correct answer: {q.answer}
              </p>
              {q.explanation && (
                <p className="mt-1 text-sm text-gray-600">
                  <span className="font-medium">Explanation:</span> {q.explanation}
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={() => setShowResults(!showResults)}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {showResults ? 'Hide Answers' : 'Check Answers'}
        </button>
        {showResults && (
          <p className="text-lg font-medium text-gray-900">
            Score: {score}/{questions.length} ({Math.round((score / questions.length) * 100)}%)
          </p>
        )}
      </div>
    </div>
  );
}
