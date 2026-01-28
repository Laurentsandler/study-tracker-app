'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Users, Copy, Check, X, Share2, UserPlus, Loader2, Trash2, EyeOff, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { SharedCourse, SharedAssignment } from '@/types';

// Helper to convert hex color to rgba with opacity
function hexToRgba(hex: string, opacity: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(59, 130, 246, ${opacity})`; // fallback to blue
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export default function SharedCoursesPage() {
  const [courses, setCourses] = useState<(SharedCourse & { user_role: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<(SharedCourse & { user_role: string }) | null>(null);
  const [assignments, setAssignments] = useState<SharedAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [leavingCourse, setLeavingCourse] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
    // Get current user ID for permission checks
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  const fetchCourses = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch('/api/shared-courses', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (error) {
      console.error('Error fetching shared courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async (courseId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setLoadingAssignments(true);
    try {
      const res = await fetch(`/api/shared-courses/${courseId}/assignments`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleSelectCourse = (course: (SharedCourse & { user_role: string })) => {
    setSelectedCourse(course);
    setCopyError(null);
    setActionError(null);
    fetchAssignments(course.id);
  };

  const handleCopyAssignment = async (assignmentId: string) => {
    if (!selectedCourse) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setCopyingId(assignmentId);
    setCopyError(null);

    try {
      const res = await fetch(`/api/shared-courses/${selectedCourse.id}/assignments/${assignmentId}/copy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        // Refresh assignments to show updated copy status
        fetchAssignments(selectedCourse.id);
      } else {
        const data = await res.json();
        setCopyError(data.error || 'Failed to copy assignment');
      }
    } catch (error) {
      console.error('Error copying assignment:', error);
      setCopyError('Failed to copy assignment. Please try again.');
    } finally {
      setCopyingId(null);
    }
  };

  const handleDismissAssignment = async (assignmentId: string, isDismissed: boolean) => {
    if (!selectedCourse) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setDismissingId(assignmentId);
    setActionError(null);

    try {
      const res = await fetch(`/api/shared-courses/${selectedCourse.id}/assignments/${assignmentId}/dismiss`, {
        method: isDismissed ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        fetchAssignments(selectedCourse.id);
      } else {
        const data = await res.json();
        setActionError(data.error || 'Failed to update assignment');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      setActionError('Failed to update assignment. Please try again.');
    } finally {
      setDismissingId(null);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!selectedCourse) return;

    if (!confirm('Are you sure you want to delete this assignment? This cannot be undone.')) {
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setDeletingId(assignmentId);
    setActionError(null);

    try {
      const res = await fetch(`/api/shared-courses/${selectedCourse.id}/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        fetchAssignments(selectedCourse.id);
      } else {
        const data = await res.json();
        setActionError(data.error || 'Failed to delete assignment');
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      setActionError('Failed to delete assignment. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLeaveCourse = async () => {
    if (!selectedCourse) return;

    if (!confirm('Are you sure you want to leave this course? You will need an invite code to rejoin.')) {
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setLeavingCourse(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/shared-courses/${selectedCourse.id}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        // Remove the course from the list and clear selection
        setCourses(courses.filter(c => c.id !== selectedCourse.id));
        setSelectedCourse(null);
        setAssignments([]);
      } else {
        const data = await res.json();
        setActionError(data.error || 'Failed to leave course');
      }
    } catch (error) {
      console.error('Error leaving course:', error);
      setActionError('Failed to leave course. Please try again.');
    } finally {
      setLeavingCourse(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No due date';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-black border-t-yellow-300 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-black">Shared Courses</h1>
          <p className="text-gray-600 font-medium">Collaborate on assignments with classmates</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-2 px-4 py-3 bg-cyan-300 font-bold border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all"
          >
            <UserPlus className="h-5 w-5" />
            <span>Join Course</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-3 bg-yellow-300 font-bold border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all"
          >
            <Plus className="h-5 w-5" />
            <span>Create Course</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Course List */}
        <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000]">
          <div className="p-4 border-b-3 border-black bg-violet-200">
            <h2 className="font-black text-black">Your Shared Courses</h2>
          </div>
          <div className="divide-y-3 divide-black">
            {courses.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 border-3 border-black flex items-center justify-center">
                  <Users className="h-8 w-8" />
                </div>
                <p className="font-medium text-gray-700 mb-4">No shared courses yet</p>
                <p className="text-sm text-gray-500">Create a course or join one with an invite code</p>
              </div>
            ) : (
              courses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => handleSelectCourse(course)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selectedCourse?.id === course.id ? 'bg-yellow-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 border-3 border-black flex items-center justify-center"
                      style={{ backgroundColor: course.color }}
                    >
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-black truncate">{course.name}</h3>
                      <p className="text-sm text-gray-600">
                        {course.member_count} member{course.member_count !== 1 ? 's' : ''} •{' '}
                        {course.user_role === 'owner' ? 'Owner' : 'Member'}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Course Details & Assignments */}
        <div className="lg:col-span-2">
          {selectedCourse ? (
            <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000]">
              {/* Course Header */}
              <div
                className="p-4 border-b-3 border-black"
                style={{ backgroundColor: hexToRgba(selectedCourse.color, 0.25) }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-black">{selectedCourse.name}</h2>
                    {selectedCourse.description && (
                      <p className="text-gray-700 mt-1">{selectedCourse.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedCourse.user_role === 'owner' && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-black">
                        <Share2 className="h-4 w-4" />
                        <span className="font-mono font-bold text-sm">{selectedCourse.invite_code}</span>
                      </div>
                    )}
                    {selectedCourse.user_role !== 'owner' && (
                      <button
                        onClick={handleLeaveCourse}
                        disabled={leavingCourse}
                        className="flex items-center gap-2 px-3 py-2 bg-red-200 font-bold border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all text-sm disabled:opacity-50"
                      >
                        {leavingCourse ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4" />
                        )}
                        <span>Leave Course</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignments List */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <h3 className="font-bold text-black">Shared Assignments</h3>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showDismissed}
                        onChange={(e) => setShowDismissed(e.target.checked)}
                        className="w-4 h-4 border-2 border-black"
                      />
                      <span className="text-gray-600">Show dismissed</span>
                    </label>
                  </div>
                  <Link
                    href={`/dashboard/shared-courses/${selectedCourse.id}/new-assignment`}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-300 font-bold border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add Assignment
                  </Link>
                </div>

                {(copyError || actionError) && (
                  <div className="mb-4 p-3 bg-red-200 border-2 border-black text-sm font-bold text-black flex items-center justify-between">
                    <span>{[copyError, actionError].filter(Boolean).join('. ')}</span>
                    <button onClick={() => { setCopyError(null); setActionError(null); }} className="hover:text-red-700">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {loadingAssignments ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : assignments.filter(a => showDismissed || !a.is_dismissed).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">
                      {assignments.length === 0 
                        ? 'No assignments shared yet' 
                        : 'All assignments are dismissed. Check "Show dismissed" to see them.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignments
                      .filter(a => showDismissed || !a.is_dismissed)
                      .map((assignment) => (
                      <div
                        key={assignment.id}
                        className={`p-4 border-3 border-black ${assignment.is_dismissed ? 'bg-gray-200 opacity-60' : 'bg-gray-50'}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-bold text-black">{assignment.title}</h4>
                            {assignment.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {assignment.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                              <span>Due: {formatDate(assignment.due_date)}</span>
                              <span
                                className={`px-2 py-0.5 font-bold border border-black ${
                                  assignment.priority === 'high'
                                    ? 'bg-rose-300'
                                    : assignment.priority === 'medium'
                                    ? 'bg-amber-300'
                                    : 'bg-emerald-300'
                                }`}
                              >
                                {assignment.priority.toUpperCase()}
                              </span>
                              {assignment.creator && (
                                <span>By: {assignment.creator.full_name || assignment.creator.email}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Copy Button */}
                            <button
                              onClick={() => handleCopyAssignment(assignment.id)}
                              disabled={assignment.is_copied || copyingId === assignment.id}
                              className={`flex items-center gap-2 px-3 py-2 font-bold border-2 border-black transition-all ${
                                assignment.is_copied
                                  ? 'bg-emerald-300 cursor-default'
                                  : copyingId === assignment.id
                                  ? 'bg-gray-200 cursor-wait'
                                  : 'bg-yellow-300 shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000]'
                              }`}
                            >
                              {assignment.is_copied ? (
                                <>
                                  <Check className="h-4 w-4" />
                                  <span className="text-sm">Copied</span>
                                </>
                              ) : copyingId === assignment.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="text-sm">Copying...</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4" />
                                  <span className="text-sm">Copy</span>
                                </>
                              )}
                            </button>

                            {/* Dismiss/Undismiss Button */}
                            <button
                              onClick={() => handleDismissAssignment(assignment.id, assignment.is_dismissed || false)}
                              disabled={dismissingId === assignment.id}
                              className={`flex items-center gap-2 px-3 py-2 font-bold border-2 border-black transition-all ${
                                dismissingId === assignment.id
                                  ? 'bg-gray-200 cursor-wait'
                                  : assignment.is_dismissed
                                  ? 'bg-cyan-200 shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000]'
                                  : 'bg-gray-200 shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000]'
                              }`}
                              title={assignment.is_dismissed ? 'Show this assignment' : 'Dismiss this assignment'}
                            >
                              {dismissingId === assignment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                              <span className="text-sm">{assignment.is_dismissed ? 'Show' : 'Dismiss'}</span>
                            </button>

                            {/* Delete Button (only for course owners or assignment creators) */}
                            {(selectedCourse.user_role === 'owner' || assignment.created_by === currentUserId) && (
                              <button
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                disabled={deletingId === assignment.id}
                                className={`flex items-center gap-2 px-3 py-2 font-bold border-2 border-black transition-all ${
                                  deletingId === assignment.id
                                    ? 'bg-gray-200 cursor-wait'
                                    : 'bg-red-300 shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000]'
                                }`}
                                title="Delete this assignment"
                              >
                                {deletingId === assignment.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-violet-100 border-3 border-black flex items-center justify-center">
                <Users className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-black text-black mb-2">Select a Course</h3>
              <p className="text-gray-600">Choose a shared course to view and manage assignments</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Course Modal */}
      {showCreateModal && (
        <CreateCourseModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(course) => {
            setCourses([...courses, course]);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Join Course Modal */}
      {showJoinModal && (
        <JoinCourseModal
          onClose={() => setShowJoinModal(false)}
          onJoined={(course) => {
            setCourses([...courses, course]);
            setShowJoinModal(false);
          }}
        />
      )}
    </div>
  );
}

// Create Course Modal Component
function CreateCourseModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (course: SharedCourse & { user_role: string }) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch('/api/shared-courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), color }),
      });

      if (res.ok) {
        const course = await res.json();
        onCreated(course);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create course');
      }
    } catch {
      setError('Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white border-3 border-black shadow-[6px_6px_0_0_#000] w-full max-w-md">
        <div className="p-4 border-b-3 border-black bg-yellow-200 flex items-center justify-between">
          <h2 className="font-black text-black">Create Shared Course</h2>
          <button onClick={onClose} className="p-1 hover:bg-yellow-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-bold text-black mb-2">Course Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Math 101"
              className="w-full px-4 py-3 border-3 border-black focus:ring-0 focus:border-black outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="w-full px-4 py-3 border-3 border-black focus:ring-0 focus:border-black outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">Color</label>
            <div className="flex gap-2">
              {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 border-3 border-black ${color === c ? 'ring-2 ring-black ring-offset-2' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-red-600 font-bold text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3 bg-yellow-300 font-bold border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Course'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Join Course Modal Component
function JoinCourseModal({
  onClose,
  onJoined,
}: {
  onClose: () => void;
  onJoined: (course: SharedCourse & { user_role: string }) => void;
}) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch('/api/shared-courses/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ invite_code: inviteCode.trim() }),
      });

      if (res.ok) {
        const course = await res.json();
        onJoined(course);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to join course');
      }
    } catch {
      setError('Failed to join course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white border-3 border-black shadow-[6px_6px_0_0_#000] w-full max-w-md">
        <div className="p-4 border-b-3 border-black bg-cyan-200 flex items-center justify-between">
          <h2 className="font-black text-black">Join Shared Course</h2>
          <button onClick={onClose} className="p-1 hover:bg-cyan-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-bold text-black mb-2">Invite Code *</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code..."
              className="w-full px-4 py-3 border-3 border-black focus:ring-0 focus:border-black outline-none font-mono"
            />
            <p className="text-sm text-gray-600 mt-2">
              Ask the course owner for the invite code to join
            </p>
          </div>
          {error && <p className="text-red-600 font-bold text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !inviteCode.trim()}
            className="w-full py-3 bg-cyan-300 font-bold border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join Course'}
          </button>
        </form>
      </div>
    </div>
  );
}
