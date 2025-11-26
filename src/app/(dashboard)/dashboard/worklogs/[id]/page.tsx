'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
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
  classwork: 'bg-blue-100 text-blue-700',
  homework: 'bg-purple-100 text-purple-700',
  notes: 'bg-green-100 text-green-700',
  quiz: 'bg-yellow-100 text-yellow-700',
  test: 'bg-red-100 text-red-700',
  project: 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function WorklogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
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
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!worklog) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Worklog not found</p>
        <Link href="/dashboard/worklogs" className="text-primary-600 hover:underline mt-2 inline-block">
          Back to Worklogs
        </Link>
      </div>
    );
  }

  const TypeIcon = worklogTypeIcons[worklog.worklog_type];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{worklog.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${worklogTypeColors[worklog.worklog_type]}`}>
                <TypeIcon className="w-3 h-3" />
                {worklogTypeLabels[worklog.worklog_type]}
              </span>
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                {formatDate(worklog.date_completed)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/worklogs/${id}/edit`}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Edit className="w-5 h-5" />
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Work Log?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{worklog.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {worklog.image_url ? (
            <img
              src={worklog.image_url}
              alt={worklog.title}
              className="w-full h-auto"
            />
          ) : (
            <div className="aspect-video bg-gray-100 flex flex-col items-center justify-center">
              <ImageIcon className="w-16 h-16 text-gray-300 mb-2" />
              <p className="text-gray-500">No image attached</p>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          {/* Topic */}
          {worklog.topic && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Topic / Subject</h3>
              <p className="text-lg font-semibold text-primary-600">{worklog.topic}</p>
            </div>
          )}

          {/* Description */}
          {worklog.description && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
              <p className="text-gray-900">{worklog.description}</p>
            </div>
          )}

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Type</h3>
              <div className="flex items-center gap-2">
                <TypeIcon className="w-4 h-4 text-gray-600" />
                <span className="text-gray-900 font-medium">{worklogTypeLabels[worklog.worklog_type]}</span>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Completed</h3>
              <p className="text-gray-900 font-medium">{formatDate(worklog.date_completed).split(',')[0]}</p>
            </div>
          </div>

          {/* Generate Study Materials */}
          {worklog.content && (
            <div className="bg-gradient-to-r from-primary-50 to-indigo-50 rounded-xl border border-primary-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary-600" />
                <h3 className="font-medium text-gray-900">Study Materials</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Generate AI-powered study materials from this work
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  Generate Notes
                </button>
                <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  Create Flashcards
                </button>
                <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  Practice Test
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {worklog.content && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Extracted Content</h3>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap text-gray-900 border border-gray-200">
            {worklog.content}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="mt-6 text-sm text-gray-500 flex items-center justify-between">
        <span>Created {new Date(worklog.created_at).toLocaleDateString()}</span>
        {worklog.updated_at !== worklog.created_at && (
          <span>Last updated {new Date(worklog.updated_at).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}
