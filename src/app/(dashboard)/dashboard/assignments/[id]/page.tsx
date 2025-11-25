'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  Trash2,
  BookOpen,
  FileText,
  HelpCircle,
  Layers,
  Wand2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Assignment, StudyMaterial } from '@/types';
import { formatDate, getDaysUntilDue, getPriorityColor, getStatusColor } from '@/lib/utils';

export default function AssignmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  const fetchAssignment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch assignment with course
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('*, course:courses(*)')
        .eq('id', assignmentId)
        .eq('user_id', user.id)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData);

      // Fetch study materials
      const { data: materialsData } = await supabase
        .from('study_materials')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: false });

      if (materialsData) setStudyMaterials(materialsData);
    } catch (err) {
      console.error('Error fetching assignment:', err);
      setError('Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: 'pending' | 'in_progress' | 'completed') => {
    if (!assignment) return;

    const { error } = await supabase
      .from('assignments')
      .update({ status })
      .eq('id', assignment.id);

    if (!error) {
      setAssignment({ ...assignment, status });
    }
  };

  const deleteAssignment = async () => {
    if (!assignment) return;

    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignment.id);

    if (!error) {
      router.push('/dashboard/assignments');
    }
  };

  const generateStudyMaterial = async (type: 'notes' | 'study_guide' | 'practice_test' | 'flashcards') => {
    if (!assignment) return;
    setGenerating(type);
    setError(null);

    try {
      const content = `${assignment.title}\n\n${assignment.description || ''}`;
      
      const response = await fetch('/api/generate-study-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type }),
      });

      if (!response.ok) throw new Error('Failed to generate material');

      const result = await response.json();

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: newMaterial, error: insertError } = await supabase
        .from('study_materials')
        .insert({
          assignment_id: assignment.id,
          user_id: user.id,
          type,
          title: `${type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${assignment.title}`,
          content: result,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (newMaterial) {
        setStudyMaterials([newMaterial, ...studyMaterials]);
      }
    } catch (err) {
      setError('Failed to generate study material. Please try again.');
    } finally {
      setGenerating(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Assignment not found</h2>
        <Link href="/dashboard/assignments" className="text-primary-600 hover:text-primary-700">
          Back to assignments
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/assignments"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to assignments
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Assignment Details Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
              {assignment.course && (
                <span
                  className="px-3 py-1 text-sm font-medium rounded-full"
                  style={{ backgroundColor: assignment.course.color + '20', color: assignment.course.color }}
                >
                  {assignment.course.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(assignment.priority)}`}>
                {assignment.priority} priority
              </span>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(assignment.status)}`}>
                {assignment.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/assignments/${assignment.id}/edit`}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit className="h-5 w-5" />
            </Link>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {assignment.description && (
          <p className="text-gray-600 mb-6">{assignment.description}</p>
        )}

        <div className="flex items-center gap-6 text-sm text-gray-500">
          {assignment.due_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Due: {formatDate(assignment.due_date)}</span>
              {getDaysUntilDue(assignment.due_date) >= 0 && getDaysUntilDue(assignment.due_date) <= 7 && (
                <span className={`font-medium ${getDaysUntilDue(assignment.due_date) <= 2 ? 'text-red-600' : 'text-orange-600'}`}>
                  ({getDaysUntilDue(assignment.due_date)} days left)
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>~{assignment.estimated_duration} minutes</span>
          </div>
        </div>

        {/* Status Update Buttons */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">Update Status:</p>
          <div className="flex gap-2">
            <button
              onClick={() => updateStatus('pending')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                assignment.status === 'pending'
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => updateStatus('in_progress')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                assignment.status === 'in_progress'
                  ? 'bg-yellow-200 text-yellow-800'
                  : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => updateStatus('completed')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                assignment.status === 'completed'
                  ? 'bg-green-200 text-green-800'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              Completed
            </button>
          </div>
        </div>
      </div>

      {/* Study Materials Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Study Materials</h2>

        {/* Generate Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { type: 'notes', label: 'Notes', icon: FileText },
            { type: 'study_guide', label: 'Study Guide', icon: BookOpen },
            { type: 'practice_test', label: 'Practice Test', icon: HelpCircle },
            { type: 'flashcards', label: 'Flashcards', icon: Layers },
          ].map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => generateStudyMaterial(type as any)}
              disabled={generating !== null}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-lg hover:from-purple-100 hover:to-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating === type ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600" />
              ) : (
                <Icon className="h-4 w-4 text-purple-600" />
              )}
              <span className="text-sm font-medium text-gray-700">
                {generating === type ? 'Generating...' : `Generate ${label}`}
              </span>
            </button>
          ))}
        </div>

        {/* Materials List */}
        {studyMaterials.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Wand2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No study materials yet</p>
            <p className="text-sm">Generate notes, guides, tests, or flashcards above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {studyMaterials.map((material) => {
              const Icon = getMaterialIcon(material.type);
              return (
                <Link
                  key={material.id}
                  href={`/dashboard/assignments/${assignment.id}/materials/${material.id}`}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Icon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{material.title}</h3>
                    <p className="text-sm text-gray-500">
                      {material.type.replace('_', ' ')} • Created {formatDate(material.created_at)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Assignment?</h3>
            <p className="text-gray-500 mb-6">
              This will permanently delete &quot;{assignment.title}&quot; and all associated study materials.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteAssignment}
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
