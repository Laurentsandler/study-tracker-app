'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, ClipboardList } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Assignment, AssignmentStatus, AssignmentPriority } from '@/types';
import { formatDate, getDaysUntilDue, getPriorityColor, getStatusColor } from '@/lib/utils';

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-500">Manage all your assignments and projects</p>
        </div>
        <Link
          href="/dashboard/assignments/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>New Assignment</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AssignmentStatus | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Assignments List */}
      <div className="bg-white rounded-xl border border-gray-200">
        {filteredAssignments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ClipboardList className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
            <p className="mb-4">Get started by adding your first assignment</p>
            <Link
              href="/dashboard/assignments/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>New Assignment</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAssignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/dashboard/assignments/${assignment.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
                      {assignment.course && (
                        <span
                          className="px-2 py-0.5 text-xs font-medium rounded-full"
                          style={{ backgroundColor: assignment.course.color + '20', color: assignment.course.color }}
                        >
                          {assignment.course.name}
                        </span>
                      )}
                    </div>
                    {assignment.description && (
                      <p className="text-gray-500 mt-1 line-clamp-2">{assignment.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      {assignment.due_date && (
                        <span>
                          Due: {formatDate(assignment.due_date)}
                          {getDaysUntilDue(assignment.due_date) <= 2 && getDaysUntilDue(assignment.due_date) >= 0 && (
                            <span className="ml-1 text-red-600 font-medium">
                              ({getDaysUntilDue(assignment.due_date)} days left)
                            </span>
                          )}
                        </span>
                      )}
                      <span>~{assignment.estimated_duration} min</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(assignment.priority)}`}>
                      {assignment.priority}
                    </span>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.status)}`}>
                      {assignment.status.replace('_', ' ')}
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
