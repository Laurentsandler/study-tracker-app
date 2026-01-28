'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Users, Copy, Check, X, Share2, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { SharedCourse, SharedAssignment } from '@/types';

export default function SharedCoursesPage() {
  const [courses, setCourses] = useState<(SharedCourse & { user_role: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<(SharedCourse & { user_role: string }) | null>(null);
  const [assignments, setAssignments] = useState<SharedAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  useEffect(() => {
    fetchCourses();
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
    fetchAssignments(course.id);
  };

  const handleCopyAssignment = async (assignmentId: string) => {
    if (!selectedCourse) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/shared-courses/${selectedCourse.id}/assignments/${assignmentId}/copy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        // Refresh assignments to show updated copy status
        fetchAssignments(selectedCourse.id);
      }
    } catch (error) {
      console.error('Error copying assignment:', error);
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
                style={{ backgroundColor: selectedCourse.color + '40' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-black">{selectedCourse.name}</h2>
                    {selectedCourse.description && (
                      <p className="text-gray-700 mt-1">{selectedCourse.description}</p>
                    )}
                  </div>
                  {selectedCourse.user_role === 'owner' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-black">
                      <Share2 className="h-4 w-4" />
                      <span className="font-mono font-bold text-sm">{selectedCourse.invite_code}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignments List */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-black">Shared Assignments</h3>
                  <Link
                    href={`/dashboard/shared-courses/${selectedCourse.id}/new-assignment`}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-300 font-bold border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add Assignment
                  </Link>
                </div>

                {loadingAssignments ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No assignments shared yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="p-4 border-3 border-black bg-gray-50"
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
                          <button
                            onClick={() => handleCopyAssignment(assignment.id)}
                            disabled={assignment.is_copied}
                            className={`flex items-center gap-2 px-3 py-2 font-bold border-2 border-black transition-all ${
                              assignment.is_copied
                                ? 'bg-emerald-300 cursor-default'
                                : 'bg-yellow-300 shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000]'
                            }`}
                          >
                            {assignment.is_copied ? (
                              <>
                                <Check className="h-4 w-4" />
                                <span className="text-sm">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4" />
                                <span className="text-sm">Copy to My Assignments</span>
                              </>
                            )}
                          </button>
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
