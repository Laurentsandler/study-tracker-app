'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wand2, Mic, AlertCircle, Upload, FileText, X, File } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase/client';
import { CreateAssignmentInput, Course } from '@/types';

export default function NewAssignmentPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractingText, setExtractingText] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateAssignmentInput>({
    defaultValues: {
      priority: 'medium',
      estimated_duration: 60,
    }
  });

  // Watch form values to show them in the UI
  const watchedValues = watch();

  useEffect(() => {
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
    fetchCourses();
  }, []);

  const onSubmit = async (data: CreateAssignmentInput) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Clean up the data before insert
      const insertData = {
        title: data.title,
        description: data.description || null,
        course_id: data.course_id || null,
        due_date: data.due_date || null,
        priority: data.priority || 'medium',
        estimated_duration: data.estimated_duration || 60,
        user_id: user.id,
        status: 'pending',
      };

      console.log('Inserting assignment:', insertData); // Debug log

      const { data: result, error: insertError } = await supabase
        .from('assignments')
        .insert(insertData)
        .select();

      console.log('Insert result:', result, 'Error:', insertError); // Debug log

      if (insertError) throw insertError;
      router.push('/dashboard/assignments');
    } catch (err) {
      console.error('Assignment creation error:', err); // Debug log
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
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
      console.log('AI Parsed:', parsed); // Debug log
      
      setValue('title', parsed.title || '', { shouldValidate: true, shouldDirty: true });
      setValue('description', parsed.description || '', { shouldValidate: true, shouldDirty: true });
      if (parsed.due_date) {
        const dateStr = parsed.due_date.split('T')[0];
        setValue('due_date', dateStr, { shouldValidate: true, shouldDirty: true });
      }
      setValue('priority', parsed.priority || 'medium', { shouldValidate: true, shouldDirty: true });
      setValue('estimated_duration', parsed.estimated_duration || 60, { shouldValidate: true, shouldDirty: true });
      setShowAiInput(false);
      setAiText(''); // Clear the AI input
      setUploadedFile(null); // Clear uploaded file
    } catch (err) {
      setError('Failed to parse text with AI. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ];
    const allowedExtensions = ['.pdf', '.docx', '.txt', '.md', '.markdown'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      setError('Please upload a PDF, DOCX, TXT, or Markdown file');
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
      // Reset file input
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

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📄';
    if (ext === 'docx' || ext === 'doc') return '📝';
    if (ext === 'txt' || ext === 'md' || ext === 'markdown') return '📃';
    return '📎';
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/assignments"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assignments
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Assignment</h1>
        <p className="text-gray-500">Add a new assignment manually or paste text for AI parsing</p>
      </div>

      {/* AI Input Toggle */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl border border-purple-100 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wand2 className="h-5 w-5 text-purple-600" />
            <div>
              <p className="font-medium text-gray-900">AI-Assisted Entry</p>
              <p className="text-sm text-gray-500">Upload a document or paste text for AI parsing</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAiInput(!showAiInput)}
            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
          >
            {showAiInput ? 'Manual Entry' : 'Use AI'}
          </button>
        </div>

        {showAiInput && (
          <div className="mt-4 space-y-4">
            {/* File Upload Area */}
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
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer bg-white hover:bg-purple-50 transition-colors"
                >
                  {extractingText ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2" />
                      <span className="text-sm text-gray-500">Extracting text...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-purple-400 mb-2" />
                      <p className="text-sm font-medium text-gray-700">Upload a document</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, DOCX, TXT, or Markdown (max 10MB)</p>
                    </>
                  )}
                </label>
              ) : (
                <div className="flex items-center justify-between p-4 bg-white border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getFileIcon(uploadedFile.name)}</span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{uploadedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(uploadedFile.size / 1024).toFixed(1)} KB • Text extracted
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeUploadedFile}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-gradient-to-r from-purple-50 to-blue-50 text-sm text-gray-500">
                  or paste text directly
                </span>
              </div>
            </div>

            {/* Text Input */}
            <textarea
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Paste assignment details here... e.g., 'Math homework due Friday - Chapter 5 problems 1-20, worth 50 points, should take about 2 hours'"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none text-gray-900 bg-white"
            />
            
            {aiText && (
              <p className="text-xs text-gray-500">
                {aiText.length.toLocaleString()} characters extracted
              </p>
            )}

            <button
              type="button"
              onClick={handleAiParse}
              disabled={aiLoading || !aiText.trim()}
              className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl border border-gray-200 space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            {...register('title', { required: 'Title is required' })}
            type="text"
            id="title"
            placeholder="e.g., Chapter 5 Homework"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 bg-white"
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            {...register('description')}
            id="description"
            rows={3}
            placeholder="Add details about this assignment..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none text-gray-900 bg-white"
          />
        </div>

        {/* Course */}
        <div>
          <label htmlFor="course_id" className="block text-sm font-medium text-gray-700 mb-2">
            Course
          </label>
          <select
            {...register('course_id')}
            id="course_id"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 bg-white"
          >
            <option value="">Select a course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>

        {/* Due Date & Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <input
              {...register('due_date')}
              type="date"
              id="due_date"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 bg-white"
            />
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              {...register('priority')}
              id="priority"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 bg-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {/* Estimated Duration */}
        <div>
          <label htmlFor="estimated_duration" className="block text-sm font-medium text-gray-700 mb-2">
            Estimated Duration (minutes)
          </label>
          <input
            {...register('estimated_duration', { valueAsNumber: true })}
            type="number"
            id="estimated_duration"
            min={1}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-gray-900 bg-white"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Assignment'}
          </button>
        </div>
      </form>
    </div>
  );
}
