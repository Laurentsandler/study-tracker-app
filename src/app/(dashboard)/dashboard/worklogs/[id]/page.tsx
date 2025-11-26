'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  BookOpen, 
  ClipboardList, 
  GraduationCap,
  FlaskConical,
  FolderOpen,
  Edit,
  Trash2,
  Sparkles,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Worklog, WorklogType } from '@/types';

const worklogTypeIcons: Record<WorklogType, typeof FileText> = {
  classwork: ClipboardList,
  homework: BookOpen,
  notes: FileText,
  quiz: GraduationCap,
  test: GraduationCap,
  project: FlaskConical,
  other: FolderOpen,
};

const worklogTypeLabels: Record<WorklogType, string> = {
  classwork: 'Classwork',
  homework: 'Homework',
  notes: 'Notes',
  quiz: 'Quiz',
  test: 'Test',
  project: 'Project',
  other: 'Other',
};

const worklogTypeColors: Record<WorklogType, string> = {
  classwork: 'bg-cyan-300 text-black border-2 border-black',
  homework: 'bg-violet-300 text-black border-2 border-black',
  notes: 'bg-emerald-300 text-black border-2 border-black',
  quiz: 'bg-yellow-300 text-black border-2 border-black',
  test: 'bg-rose-300 text-black border-2 border-black',
  project: 'bg-indigo-300 text-black border-2 border-black',
  other: 'bg-gray-300 text-black border-2 border-black',
};

export default function WorklogDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [worklog, setWorklog] = useState<Worklog | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        setWorklog(data.worklog);
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/worklogs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        router.push('/dashboard/worklogs');
      }
    } catch (error) {
      console.error('Error deleting worklog:', error);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
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
        <Link href="/dashboard/worklogs" className="text-violet-600 font-bold hover:underline mt-2 inline-block">
          Back to Worklogs
        </Link>
      </div>
    );
  }

  const TypeIcon = worklogTypeIcons[worklog.worklog_type];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-3 bg-white border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-black">{worklog.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold ${worklogTypeColors[worklog.worklog_type]}`}>
                <TypeIcon className="w-3 h-3" />
                {worklogTypeLabels[worklog.worklog_type]}
              </span>
              <span className="flex items-center gap-1 text-sm text-gray-700 font-medium">
                <Calendar className="w-4 h-4" />
                {formatDate(worklog.date_completed)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/worklogs/${id}/edit`}
            className="p-3 bg-cyan-300 border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            <Edit className="w-5 h-5 text-black" />
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-3 bg-rose-300 border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            <Trash2 className="w-5 h-5 text-black" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-3 border-black shadow-[8px_8px_0_0_#000] p-6 max-w-md w-full">
            <h3 className="text-xl font-black text-black mb-2">Delete Work Log?</h3>
            <p className="text-gray-700 font-medium mb-4">
              Are you sure you want to delete "{worklog.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-black font-bold border-3 border-black hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-300 text-black font-bold border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Image */}
        <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] overflow-hidden">
          {worklog.image_url ? (
            <img
              src={worklog.image_url}
              alt={worklog.title}
              className="w-full h-auto"
            />
          ) : (
            <div className="aspect-video bg-gray-200 flex flex-col items-center justify-center">
              <ImageIcon className="w-16 h-16 text-gray-400 mb-2" />
              <p className="text-gray-600 font-medium">No image attached</p>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          {/* Topic */}
          {worklog.topic && (
            <div className="bg-violet-100 border-3 border-black p-4">
              <h3 className="text-sm font-bold text-black mb-1">Topic / Subject</h3>
              <p className="text-lg font-black text-violet-700">{worklog.topic}</p>
            </div>
          )}

          {/* Description */}
          {worklog.description && (
            <div className="bg-white border-3 border-black p-4">
              <h3 className="text-sm font-bold text-black mb-2">Description</h3>
              <p className="text-gray-800">{worklog.description}</p>
            </div>
          )}

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border-3 border-black p-4">
              <h3 className="text-sm font-bold text-black mb-1">Type</h3>
              <div className="flex items-center gap-2">
                <TypeIcon className="w-4 h-4 text-black" />
                <span className="text-black font-bold">{worklogTypeLabels[worklog.worklog_type]}</span>
              </div>
            </div>
            <div className="bg-white border-3 border-black p-4">
              <h3 className="text-sm font-bold text-black mb-1">Completed</h3>
              <p className="text-black font-bold">{formatDate(worklog.date_completed).split(',')[0]}</p>
            </div>
          </div>

          {/* Generate Study Materials */}
          {worklog.content && (
            <div className="bg-yellow-300 border-3 border-black p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-black" />
                <h3 className="font-black text-black">Study Materials</h3>
              </div>
              <p className="text-sm text-gray-800 mb-3">
                Generate AI-powered study materials from this work
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="px-3 py-2 bg-white border-2 border-black text-sm text-black font-bold hover:bg-gray-100 transition-colors">
                  Generate Notes
                </button>
                <button className="px-3 py-2 bg-white border-2 border-black text-sm text-black font-bold hover:bg-gray-100 transition-colors">
                  Create Flashcards
                </button>
                <button className="px-3 py-2 bg-white border-2 border-black text-sm text-black font-bold hover:bg-gray-100 transition-colors">
                  Practice Test
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {worklog.content && (
        <div className="mt-6 bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-6">
          <h3 className="text-xl font-black text-black mb-4">Extracted Content</h3>
          <div className="bg-gray-100 border-3 border-black p-4 font-mono text-sm whitespace-pre-wrap text-black">
            {worklog.content}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="mt-6 text-sm text-gray-600 font-medium flex items-center justify-between">
        <span>Created {new Date(worklog.created_at).toLocaleDateString()}</span>
        {worklog.updated_at !== worklog.created_at && (
          <span>Last updated {new Date(worklog.updated_at).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}
