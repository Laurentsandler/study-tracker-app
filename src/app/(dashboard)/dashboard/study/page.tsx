'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  BookOpen,
  FileText,
  HelpCircle,
  Layers,
  ArrowRight,
  Calendar,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  Target,
  Clock,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Lightbulb,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Course, StudyMaterialType } from '@/types';

interface StudySource {
  type: 'worklog' | 'assignment';
  id: string;
  title: string;
  date: string;
  content: string;
  topic?: string;
}

interface StudyOverview {
  topic: string;
  unit?: string;
  totalSources: number;
  worklogCount: number;
  assignmentCount: number;
  dateRange: { from: string; to: string };
  keyTopics: string[];
  recommendedFocus: string[];
  estimatedStudyTime: number;
  summary?: string;
}

interface GeneratedMaterial {
  type: StudyMaterialType;
  content: any;
  generatedAt: string;
}

const materialTypeInfo: Record<StudyMaterialType, { label: string; icon: typeof FileText; description: string }> = {
  notes: { label: 'Study Notes', icon: FileText, description: 'Concise summary with key points' },
  study_guide: { label: 'Study Guide', icon: BookOpen, description: 'Comprehensive guide with sections' },
  practice_test: { label: 'Practice Test', icon: HelpCircle, description: 'Quiz yourself with questions' },
  flashcards: { label: 'Flashcards', icon: Layers, description: 'Quick review cards' },
};

export default function HelpMeStudyPage() {
  const router = useRouter();
  
  // Step state
  const [step, setStep] = useState<'config' | 'review' | 'generate' | 'materials'>('config');
  
  // Configuration state
  const [topic, setTopic] = useState('');
  const [unit, setUnit] = useState('');
  const [subject, setSubject] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [includeWorklogs, setIncludeWorklogs] = useState(true);
  const [includeAssignments, setIncludeAssignments] = useState(true);
  
  // Data state
  const [courses, setCourses] = useState<Course[]>([]);
  const [sources, setSources] = useState<StudySource[]>([]);
  const [combinedContent, setCombinedContent] = useState('');
  const [overview, setOverview] = useState<StudyOverview | null>(null);
  const [generatedMaterials, setGeneratedMaterials] = useState<GeneratedMaterial[]>([]);
  const [relatedTerms, setRelatedTerms] = useState<string[]>([]);
  const [courseContext, setCourseContext] = useState<string>('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<StudyMaterialType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (data) setCourses(data);
  };

  const handleSearch = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic to study');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/study-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          topic,
          unit: unit || undefined,
          subject: subject || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          courseId: selectedCourse || undefined,
          includeWorklogs,
          includeAssignments,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to gather study materials');
      }

      const data = await response.json();
      
      if (data.success) {
        setSources(data.data.sources);
        setCombinedContent(data.data.combinedContent);
        setOverview(data.data.overview);
        setRelatedTerms(data.data.relatedTerms || []);
        setCourseContext(data.data.courseContext || '');
        setStep('review');
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to gather your study materials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateMaterial = async (type: StudyMaterialType) => {
    if (!combinedContent) {
      setError('No content available to generate materials');
      return;
    }

    setGenerating(type);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/study-session/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: combinedContent,
          type,
          topic,
          unit,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate material');
      }

      const data = await response.json();
      
      if (data.success) {
        setGeneratedMaterials(prev => [
          ...prev.filter(m => m.type !== type),
          { type, content: data.content, generatedAt: data.generatedAt },
        ]);
        setStep('materials');
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(`Failed to generate ${materialTypeInfo[type].label}. Please try again.`);
    } finally {
      setGenerating(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Help Me Study</h1>
        </div>
        <p className="text-gray-600">
          Gather your work and generate personalized study materials for any topic or unit
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {['config', 'review', 'materials'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === s
                  ? 'bg-primary-600 text-white'
                  : ['review', 'materials'].indexOf(step) >= i
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i + 1}
            </div>
            {i < 2 && (
              <div
                className={`w-12 h-1 mx-1 rounded ${
                  ['review', 'materials'].indexOf(step) > i
                    ? 'bg-primary-300'
                    : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500">
          {step === 'config' && 'Configure your study session'}
          {step === 'review' && 'Review gathered materials'}
          {step === 'materials' && 'View generated materials'}
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Step 1: Configuration */}
      {step === 'config' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary-600" />
            What do you need to study?
          </h2>

          <div className="space-y-4">
            {/* Topic - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic / Subject Matter *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Photosynthesis, World War II, Quadratic Equations"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the main topic you're studying for
              </p>
            </div>

            {/* Unit / Chapter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit / Chapter (Optional)
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., Unit 3, Chapter 5, Module 2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Course Selection */}
            {courses.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course (Optional)
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900"
                >
                  <option value="">All Courses</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date (Optional)
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date (Optional)
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900"
                />
              </div>
            </div>

            {/* Include Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Include in search:
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeWorklogs}
                    onChange={(e) => setIncludeWorklogs(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-gray-700">Work Logs</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAssignments}
                    onChange={(e) => setIncludeAssignments(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-gray-700">Assignments</span>
                </label>
              </div>
            </div>
          </div>

          {/* Search Button */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleSearch}
              disabled={loading || !topic.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI is finding related materials...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Find My Study Materials
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 'review' && overview && (
        <div className="space-y-6">
          {/* Overview Card */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {overview.topic}
                  {overview.unit && <span className="text-purple-600"> - {overview.unit}</span>}
                </h2>
                {courseContext && (
                  <p className="text-sm text-purple-600 font-medium mt-1">
                    Detected Course: {courseContext}
                  </p>
                )}
                {overview.summary && (
                  <p className="text-gray-600 mt-1">{overview.summary}</p>
                )}
              </div>
              <button
                onClick={() => setStep('config')}
                className="text-sm text-primary-600 hover:underline"
              >
                Modify Search
              </button>
            </div>

            {/* AI Search Info */}
            {relatedTerms.length > 0 && (
              <div className="mb-4 p-3 bg-white/60 rounded-lg border border-purple-100">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI searched for these related concepts:
                </p>
                <div className="flex flex-wrap gap-1">
                  {relatedTerms.map((term, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="bg-white rounded-lg p-3 border border-purple-100">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                  <ClipboardList className="w-4 h-4" />
                  <span>Sources</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{overview.totalSources}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-purple-100">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                  <FileText className="w-4 h-4" />
                  <span>Work Logs</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{overview.worklogCount}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-purple-100">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                  <GraduationCap className="w-4 h-4" />
                  <span>Assignments</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{overview.assignmentCount}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-purple-100">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  <span>Est. Time</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{overview.estimatedStudyTime}m</p>
              </div>
            </div>

            {/* Key Topics */}
            {overview.keyTopics.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  Key Topics Identified
                </h3>
                <div className="flex flex-wrap gap-2">
                  {overview.keyTopics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-white border border-purple-200 rounded-full text-sm text-gray-700"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Focus */}
            {overview.recommendedFocus.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-red-500" />
                  Recommended Focus Areas
                </h3>
                <ul className="space-y-1">
                  {overview.recommendedFocus.map((focus, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {focus}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sources List */}
          {sources.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <button
                onClick={() => setExpandedSources(!expandedSources)}
                className="w-full flex items-center justify-between mb-4"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  Found Materials ({sources.length})
                </h3>
                {expandedSources ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedSources && (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              source.type === 'worklog'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {source.type === 'worklog' ? 'Work Log' : 'Assignment'}
                          </span>
                          <h4 className="font-medium text-gray-900">{source.title}</h4>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(source.date)}
                        </span>
                      </div>
                      {source.topic && (
                        <p className="text-sm text-gray-500 mt-1">Topic: {source.topic}</p>
                      )}
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {source.content.substring(0, 200)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No Sources Warning */}
          {sources.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Materials Found</h3>
              <p className="text-gray-600 mb-4">
                We couldn't find any work logs or assignments matching "{topic}".
                Try adjusting your search or adding more work to your logs.
              </p>
              <button
                onClick={() => setStep('config')}
                className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
              >
                Try Different Search
              </button>
            </div>
          )}

          {/* Generate Materials */}
          {sources.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Generate Study Materials
              </h3>
              <p className="text-gray-600 mb-4">
                Choose what study materials you'd like to generate from your collected work:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(Object.entries(materialTypeInfo) as [StudyMaterialType, typeof materialTypeInfo.notes][]).map(
                  ([type, info]) => (
                    <button
                      key={type}
                      onClick={() => generateMaterial(type)}
                      disabled={generating !== null}
                      className="flex items-start gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-purple-50 hover:border-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                      <div className="p-2 bg-purple-100 rounded-lg">
                        {generating === type ? (
                          <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                        ) : (
                          <info.icon className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{info.label}</h4>
                        <p className="text-sm text-gray-500">{info.description}</p>
                      </div>
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Generated Materials */}
      {step === 'materials' && (
        <div className="space-y-6">
          {/* Back to review */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('review')}
              className="text-primary-600 hover:underline flex items-center gap-1"
            >
              ← Back to Overview
            </button>
            <span className="text-sm text-gray-500">
              {generatedMaterials.length} material(s) generated
            </span>
          </div>

          {/* Generated Materials Tabs */}
          {generatedMaterials.map((material) => (
            <div key={material.type} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = materialTypeInfo[material.type].icon;
                    return <Icon className="w-5 h-5 text-purple-600" />;
                  })()}
                  <h3 className="font-semibold text-gray-900">
                    {materialTypeInfo[material.type].label}
                  </h3>
                  <span className="text-xs text-gray-500">
                    Generated {formatDate(material.generatedAt)}
                  </span>
                </div>
              </div>

              <div className="p-6">
                {/* Notes Display */}
                {material.type === 'notes' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Summary</h4>
                      <p className="text-gray-600">{material.content.summary}</p>
                    </div>
                    {material.content.keyPoints?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Key Points</h4>
                        <ul className="space-y-2">
                          {material.content.keyPoints.map((point: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                              <span className="text-gray-600">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {material.content.importantTerms?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Important Terms</h4>
                        <div className="grid gap-2">
                          {material.content.importantTerms.map((term: { term: string; definition: string }, i: number) => (
                            <div key={i} className="p-3 bg-gray-50 rounded-lg">
                              <span className="font-medium text-primary-600">{term.term}</span>
                              <span className="text-gray-500"> — </span>
                              <span className="text-gray-600">{term.definition}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Study Guide Display */}
                {material.type === 'study_guide' && (
                  <div className="space-y-6">
                    {material.content.sections?.map((section: { title: string; content: string; keyTakeaways: string[] }, i: number) => (
                      <div key={i}>
                        <h4 className="font-semibold text-gray-900 mb-2">{section.title}</h4>
                        <p className="text-gray-600 mb-3">{section.content}</p>
                        {section.keyTakeaways?.length > 0 && (
                          <div className="pl-4 border-l-2 border-purple-300">
                            <p className="text-sm font-medium text-gray-500 mb-1">Key Takeaways:</p>
                            <ul className="space-y-1">
                              {section.keyTakeaways.map((point: string, j: number) => (
                                <li key={j} className="text-sm text-gray-600">• {point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                    {material.content.reviewQuestions?.length > 0 && (
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Review Questions</h4>
                        <ol className="space-y-2 list-decimal list-inside">
                          {material.content.reviewQuestions.map((q: string, i: number) => (
                            <li key={i} className="text-gray-600">{q}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {/* Practice Test Display */}
                {material.type === 'practice_test' && (
                  <PracticeTestDisplay questions={material.content.questions || []} />
                )}

                {/* Flashcards Display */}
                {material.type === 'flashcards' && (
                  <FlashcardsDisplay cards={material.content.cards || []} />
                )}
              </div>
            </div>
          ))}

          {/* Generate More */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Generate More Materials</h3>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(materialTypeInfo) as [StudyMaterialType, typeof materialTypeInfo.notes][])
                .filter(([type]) => !generatedMaterials.find(m => m.type === type))
                .map(([type, info]) => (
                  <button
                    key={type}
                    onClick={() => generateMaterial(type)}
                    disabled={generating !== null}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {generating === type ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <info.icon className="w-4 h-4 text-purple-600" />
                    )}
                    <span className="text-gray-700">{info.label}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Practice Test Component
function PracticeTestDisplay({ questions }: { questions: any[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const getScore = () => {
    return questions.filter(q => answers[q.id] === q.correctAnswer).length;
  };

  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <div key={q.id} className="p-4 bg-gray-50 rounded-lg">
          <p className="font-medium text-gray-900 mb-3">
            {i + 1}. {q.question}
          </p>
          
          {q.type === 'multiple_choice' && q.options && (
            <div className="space-y-2">
              {q.options.map((option: string, j: number) => (
                <label
                  key={j}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    answers[q.id] === option
                      ? showResults
                        ? option === q.correctAnswer
                          ? 'bg-green-100 border-green-300'
                          : 'bg-red-100 border-red-300'
                        : 'bg-primary-100 border-primary-300'
                      : 'bg-white border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={option}
                    checked={answers[q.id] === option}
                    onChange={() => handleAnswer(q.id, option)}
                    disabled={showResults}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'true_false' && (
            <div className="flex gap-4">
              {['True', 'False'].map((option) => (
                <label
                  key={option}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                    answers[q.id] === option
                      ? showResults
                        ? option === q.correctAnswer
                          ? 'bg-green-100'
                          : 'bg-red-100'
                        : 'bg-primary-100'
                      : 'bg-white border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={option}
                    checked={answers[q.id] === option}
                    onChange={() => handleAnswer(q.id, option)}
                    disabled={showResults}
                    className="w-4 h-4"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'short_answer' && (
            <input
              type="text"
              value={answers[q.id] || ''}
              onChange={(e) => handleAnswer(q.id, e.target.value)}
              disabled={showResults}
              placeholder="Type your answer..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
            />
          )}

          {showResults && (
            <div className={`mt-3 p-3 rounded-lg ${answers[q.id] === q.correctAnswer ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <p className="text-sm">
                <strong>Correct Answer:</strong> {q.correctAnswer}
              </p>
              {q.explanation && (
                <p className="text-sm text-gray-600 mt-1">{q.explanation}</p>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
        {showResults ? (
          <>
            <p className="font-semibold text-gray-900">
              Score: {getScore()} / {questions.length} ({Math.round((getScore() / questions.length) * 100)}%)
            </p>
            <button
              onClick={() => {
                setShowResults(false);
                setAnswers({});
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Try Again
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-600">
              {Object.keys(answers).length} / {questions.length} answered
            </p>
            <button
              onClick={() => setShowResults(true)}
              disabled={Object.keys(answers).length < questions.length}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              Check Answers
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Flashcards Component
function FlashcardsDisplay({ cards }: { cards: { id: string; front: string; back: string }[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());

  const currentCard = cards[currentIndex];

  const nextCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const markKnown = () => {
    setKnownCards(prev => new Set(prev).add(currentCard.id));
    nextCard();
  };

  if (!currentCard) {
    return <p className="text-gray-500">No flashcards available</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Card {currentIndex + 1} of {cards.length}</span>
        <span>{knownCards.size} marked as known</span>
      </div>

      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="cursor-pointer"
      >
        <div
          className={`relative h-64 rounded-xl transition-all duration-500 transform-gpu ${
            isFlipped ? '[transform:rotateY(180deg)]' : ''
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 flex items-center justify-center text-white text-xl font-medium text-center backface-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {currentCard.front}
          </div>
          
          {/* Back */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl p-6 flex items-center justify-center text-white text-lg text-center [transform:rotateY(180deg)]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {currentCard.back}
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-gray-500">Click card to flip</p>

      <div className="flex items-center justify-between">
        <button
          onClick={prevCard}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          Previous
        </button>
        <button
          onClick={markKnown}
          className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          I Know This
        </button>
        <button
          onClick={nextCard}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          Next
        </button>
      </div>

      {/* Progress */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all"
          style={{ width: `${(knownCards.size / cards.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
