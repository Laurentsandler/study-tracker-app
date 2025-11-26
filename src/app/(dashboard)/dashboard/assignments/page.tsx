'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, ClipboardList } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Assignment, AssignmentStatus, AssignmentPriority } from '@/types';
import { formatDate, getDaysUntilDue } from '@/lib/utils';

// Neo-Brutalism priority styles
const PRIORITY_STYLES = {
  low: 'bg-emerald-300',
  medium: 'bg-amber-300',
  high: 'bg-rose-300',
};

const STATUS_STYLES = {
  pending: 'bg-gray-200',
  in_progress: 'bg-sky-300',
  completed: 'bg-emerald-300',
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<AssignmentPriority | 'all'>('all');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('assignments')
      .select('*, course:courses(*)')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });

    if (data) {
      setAssignments(data);
    }
    setLoading(false);
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || assignment.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

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
          <h1 className="text-3xl font-black text-black">Assignments</h1>
          <p className="text-gray-600 font-medium">Manage all your assignments and projects</p>
        </div>
        <Link
          href="/dashboard/assignments/new"
          className="flex items-center gap-2 px-4 py-3 bg-yellow-300 font-bold border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all"
        >
          <Plus className="h-5 w-5" />
          <span>New Assignment</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 border-3 border-black shadow-[4px_4px_0_0_#000]">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-3 border-black font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AssignmentStatus | 'all')}
            className="px-4 py-3 border-3 border-black font-bold bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as AssignmentPriority | 'all')}
            className="px-4 py-3 border-3 border-black font-bold bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300 cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Assignments List */}
      <div className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000]">
        {filteredAssignments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 border-3 border-black flex items-center justify-center">
              <ClipboardList className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-black text-black mb-2">No assignments found</h3>
            <p className="text-gray-600 font-medium mb-6">Get started by adding your first assignment</p>
            <Link
              href="/dashboard/assignments/new"
              className="inline-flex items-center gap-2 px-4 py-3 bg-yellow-300 font-bold border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all"
            >
              <Plus className="h-5 w-5" />
              <span>New Assignment</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y-3 divide-black">
            {filteredAssignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/dashboard/assignments/${assignment.id}`}
                className="block p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-black text-black text-lg">{assignment.title}</h3>
                      {assignment.course && (
                        <span
                          className="px-2 py-1 text-xs font-bold border-2 border-black"
                          style={{ backgroundColor: assignment.course.color + '40' }}
                        >
                          {assignment.course.name}
                        </span>
                      )}
                    </div>
                    {assignment.description && (
                      <p className="text-gray-600 font-medium mt-2 line-clamp-2">{assignment.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm font-bold text-gray-600">
                      {assignment.due_date && (
                        <span>
                          Due: {formatDate(assignment.due_date)}
                          {getDaysUntilDue(assignment.due_date) <= 2 && getDaysUntilDue(assignment.due_date) >= 0 && (
                            <span className="ml-1 text-rose-600">
                              ({getDaysUntilDue(assignment.due_date)} days left!)
                            </span>
                          )}
                        </span>
                      )}
                      <span>~{assignment.estimated_duration} min</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-3 py-1 text-xs font-bold border-2 border-black ${PRIORITY_STYLES[assignment.priority as keyof typeof PRIORITY_STYLES] || 'bg-gray-200'}`}>
                      {assignment.priority.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 text-xs font-bold border-2 border-black ${STATUS_STYLES[assignment.status as keyof typeof STATUS_STYLES] || 'bg-gray-200'}`}>
                      {assignment.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
