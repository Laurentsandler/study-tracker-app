'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wand2, Upload, X, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase/client';
import { SharedCourse, CreateSharedAssignmentInput } from '@/types';

export default function NewSharedAssignmentPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [course, setCourse] = useState<SharedCourse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractingText, setExtractingText] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateSharedAssignmentInput>({
    defaultValues: {
      shared_course_id: courseId,
      priority: 'medium',
      estimated_duration: 60,
    }
  });

  useEffect(() => {
    const fetchCourse = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch('/api/shared-courses', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const courses = await res.json();
          const found = courses.find((c: SharedCourse) => c.id === courseId);
          if (found) {
            setCourse(found);
          } else {
            setError('Course not found');
          }
        }
      } catch {
        setError('Failed to load course');
      } finally {
        setPageLoading(false);
      }
    };
    fetchCourse();
  }, [courseId, router]);

  const onSubmit = async (data: CreateSharedAssignmentInput) => {
    setLoading(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/shared-courses/${courseId}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          due_date: data.due_date || null,
          priority: data.priority || 'medium',
          estimated_duration: data.estimated_duration || 60,
        }),
      });

      if (res.ok) {
        router.push('/dashboard/shared-courses');
      } else {
        const result = await res.json();
        setError(result.error || 'Failed to create assignment');
      }
    } catch {
      setError('Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleAiParse = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/parse-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText }),
      });

      if (!response.ok) throw new Error('Failed to parse text');

      const parsed = await response.json();
      setValue('title', parsed.title || '', { shouldValidate: true });
      setValue('description', parsed.description || '', { shouldValidate: true });
      if (parsed.due_date) {
        const dateStr = parsed.due_date.split('T')[0];
        setValue('due_date', dateStr, { shouldValidate: true });
      }
      setValue('priority', parsed.priority || 'medium', { shouldValidate: true });
      setValue('estimated_duration', parsed.estimated_duration || 60, { shouldValidate: true });
      setShowAiInput(false);
      setAiText('');
      setUploadedFile(null);
    } catch {
      setError('Failed to parse text with AI. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);
    setExtractingText(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract text');
      }

      const { text } = await response.json();
      setAiText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract text from file');
      setUploadedFile(null);
    } finally {
      setExtractingText(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setAiText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-black border-t-yellow-300 animate-spin"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link
          href="/dashboard/shared-courses"
          className="inline-flex items-center gap-2 text-gray-700 hover:text-black font-bold mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to shared courses
        </Link>
        <div className="bg-red-200 p-6 border-3 border-black">
          <p className="font-bold">Course not found or you don&apos;t have access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/shared-courses"
          className="inline-flex items-center gap-2 text-gray-700 hover:text-black font-bold mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to shared courses
        </Link>
        <h1 className="text-3xl font-black text-black">Share Assignment</h1>
        <p className="text-gray-600 font-medium">
          Add an assignment to <span className="font-bold">{course.name}</span> for all members
        </p>
      </div>

      {/* AI Input Toggle */}
      <div className="bg-violet-200 p-4 border-3 border-black shadow-[4px_4px_0_0_#000] mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wand2 className="h-5 w-5 text-black" />
            <div>
              <p className="font-bold text-black">AI-Assisted Entry</p>
              <p className="text-sm text-gray-700 font-medium">Upload a document or paste text for AI parsing</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAiInput(!showAiInput)}
            className="px-4 py-2 bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors"
          >
            {showAiInput ? 'Manual Entry' : 'Use AI'}
          </button>
        </div>

        {showAiInput && (
          <div className="mt-4 space-y-4">
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.markdown"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              
              {!uploadedFile ? (
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-3 border-dashed border-black cursor-pointer bg-white hover:bg-violet-100 transition-colors"
                >
                  {extractingText ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-2" />
                      <span className="text-sm text-gray-700 font-medium">Extracting text...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-black mb-2" />
                      <p className="text-sm font-bold text-black">Upload a document</p>
                      <p className="text-xs text-gray-600 mt-1 font-medium">PDF, DOCX, TXT, or Markdown</p>
                    </>
                  )}
                </label>
              ) : (
                <div className="flex items-center justify-between p-4 bg-white border-3 border-black">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <div>
                      <p className="font-bold text-black text-sm">{uploadedFile.name}</p>
                      <p className="text-xs text-gray-600 font-medium">Text extracted</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeUploadedFile}
                    className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-400" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-violet-200 text-sm text-gray-700 font-bold">or paste text</span>
              </div>
            </div>

            <textarea
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Paste assignment details here..."
              rows={4}
              className="w-full px-4 py-3 border-3 border-black focus:ring-0 focus:border-black outline-none resize-none text-black bg-white font-medium"
            />

            <button
              type="button"
              onClick={handleAiParse}
              disabled={aiLoading || !aiText.trim()}
              className="w-full py-3 bg-black text-white font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {aiLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Parsing...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Parse with AI
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-200 border-3 border-black flex items-center gap-3 text-black">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 border-3 border-black shadow-[4px_4px_0_0_#000] space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-bold text-black mb-2">Title *</label>
          <input
            {...register('title', { required: 'Title is required' })}
            type="text"
            id="title"
            placeholder="e.g., Chapter 5 Homework"
            className="w-full px-4 py-3 border-3 border-black focus:ring-0 focus:border-black outline-none text-black bg-white font-medium"
          />
          {errors.title && <p className="text-red-600 text-sm mt-1 font-bold">{errors.title.message}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-bold text-black mb-2">Description</label>
          <textarea
            {...register('description')}
            id="description"
            rows={3}
            placeholder="Add details about this assignment..."
            className="w-full px-4 py-3 border-3 border-black focus:ring-0 focus:border-black outline-none resize-none text-black bg-white font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="due_date" className="block text-sm font-bold text-black mb-2">Due Date</label>
            <input
              {...register('due_date')}
              type="date"
              id="due_date"
              className="w-full px-4 py-3 border-3 border-black focus:ring-0 focus:border-black outline-none text-black bg-white font-medium"
            />
          </div>
          <div>
            <label htmlFor="priority" className="block text-sm font-bold text-black mb-2">Priority</label>
            <select
              {...register('priority')}
              id="priority"
              className="w-full px-4 py-3 border-3 border-black focus:ring-0 focus:border-black outline-none text-black bg-white font-medium"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="estimated_duration" className="block text-sm font-bold text-black mb-2">
            Estimated Duration (minutes)
          </label>
          <input
            {...register('estimated_duration', { valueAsNumber: true })}
            type="number"
            id="estimated_duration"
            min={1}
            className="w-full px-4 py-3 border-3 border-black focus:ring-0 focus:border-black outline-none text-black bg-white font-medium"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 bg-gray-200 border-3 border-black text-black font-bold shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-emerald-300 border-3 border-black text-black font-bold shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Sharing...' : 'Share Assignment'}
          </button>
        </div>
      </form>
    </div>
  );
}
