'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Loader2,
  FileText,
  BookOpen,
  ClipboardList,
  GraduationCap,
  FlaskConical,
  FolderOpen,
  Image as ImageIcon,
  Save
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Worklog, WorklogType } from '@/types';

const worklogTypes: { value: WorklogType; label: string; icon: typeof FileText }[] = [
  { value: 'classwork', label: 'Classwork', icon: ClipboardList },
  { value: 'homework', label: 'Homework', icon: BookOpen },
  { value: 'notes', label: 'Notes', icon: FileText },
  { value: 'quiz', label: 'Quiz', icon: GraduationCap },
  { value: 'test', label: 'Test', icon: GraduationCap },
  { value: 'project', label: 'Project', icon: FlaskConical },
  { value: 'other', label: 'Other', icon: FolderOpen },
];

export default function EditWorklogPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [worklog, setWorklog] = useState<Worklog | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');
  const [worklogType, setWorklogType] = useState<WorklogType>('classwork');
  const [dateCompleted, setDateCompleted] = useState('');

  useEffect(() => {
    fetchWorklog();
  }, [id]);

  const fetchWorklog = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/worklogs/${id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const wl = data.worklog as Worklog;
        setWorklog(wl);
        setTitle(wl.title || '');
        setDescription(wl.description || '');
        setContent(wl.content || '');
        setTopic(wl.topic || '');
        setWorklogType(wl.worklog_type || 'classwork');
        setDateCompleted(wl.date_completed || new Date().toISOString().split('T')[0]);
      } else {
        router.push('/dashboard/worklogs');
      }
    } catch (error) {
      console.error('Error fetching worklog:', error);
      router.push('/dashboard/worklogs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      const response = await fetch(`/api/worklogs/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title,
          description,
          content,
          topic,
          worklog_type: worklogType,
          date_completed: dateCompleted,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update worklog');
      }
      
      router.push(`/dashboard/worklogs/${id}`);
    } catch (err) {
      console.error('Error updating worklog:', err);
      setError('Failed to update worklog. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-yellow-300" />
      </div>
    );
  }

  if (!worklog) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-700 font-medium">Worklog not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-3 bg-white border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-black">✏️ Edit Work Log</h1>
          <p className="text-gray-700 font-medium">Update the details of your work</p>
        </div>
      </div>

      {/* Image Preview (if exists) */}
      {worklog.image_url && (
        <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-6 mb-6">
          <h2 className="text-xl font-black text-black mb-4">Attached Image</h2>
          <div className="bg-gray-200 border-3 border-black overflow-hidden">
            <img
              src={worklog.image_url}
              alt={worklog.title}
              className="w-full max-h-[300px] object-contain"
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-rose-300 border-3 border-black p-4 mb-6">
          <p className="text-black font-bold">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-6">
        <h2 className="text-xl font-black text-black mb-4">Work Details</h2>
        
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-black mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Math Chapter 5 Problems"
              className="w-full px-4 py-3 border-3 border-black bg-white text-black placeholder-gray-500 font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300"
              required
            />
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-bold text-black mb-2">
              Topic / Subject
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Algebra, World History"
              className="w-full px-4 py-3 border-3 border-black bg-white text-black placeholder-gray-500 font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
          </div>

          {/* Type and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-black mb-2">
                Type
              </label>
              <select
                value={worklogType}
                onChange={(e) => setWorklogType(e.target.value as WorklogType)}
                className="w-full px-4 py-3 border-3 border-black bg-white text-black font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300 cursor-pointer"
              >
                {worklogTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-black mb-2">
                Date Completed
              </label>
              <input
                type="date"
                value={dateCompleted}
                onChange={(e) => setDateCompleted(e.target.value)}
                className="w-full px-4 py-3 border-3 border-black bg-white text-black font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-black mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the work..."
              rows={2}
              className="w-full px-4 py-3 border-3 border-black bg-white text-black placeholder-gray-500 font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-none"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-bold text-black mb-2">
              Content / Extracted Text
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="The full content extracted from your work..."
              rows={8}
              className="w-full px-4 py-3 border-3 border-black bg-white text-black placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-none"
            />
            <p className="mt-2 text-xs text-gray-600 font-medium">
              This content will be used for generating study materials and test prep
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t-3 border-black">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-3 bg-gray-200 text-black font-bold border-3 border-black hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-cyan-300 text-black font-bold border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
