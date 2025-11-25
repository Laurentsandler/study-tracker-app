'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  ClipboardList,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Assignment, PlannedTask } from '@/types';
import { formatDate, getDaysUntilDue, getPriorityColor, getStatusColor } from '@/lib/utils';

export default function DashboardPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [todaysTasks, setTodaysTasks] = useState<PlannedTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch upcoming assignments
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('*, course:courses(*)')
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .order('due_date', { ascending: true })
        .limit(5);

      if (assignmentsData) {
        setAssignments(assignmentsData);
      }

      // Fetch today's planned tasks
      const today = new Date().toISOString().split('T')[0];
      const { data: tasksData } = await supabase
        .from('planned_tasks')
        .select('*, assignment:assignments(*)')
        .eq('user_id', user.id)
        .eq('scheduled_date', today)
        .order('scheduled_start', { ascending: true });

      if (tasksData) {
        setTodaysTasks(tasksData);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const stats = {
    total: assignments.length,
    urgent: assignments.filter(a => a.due_date && getDaysUntilDue(a.due_date) <= 2).length,
    inProgress: assignments.filter(a => a.status === 'in_progress').length,
    todayTasks: todaysTasks.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back! Here&apos;s your study overview.</p>
        </div>
        <Link
          href="/dashboard/assignments/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>New Assignment</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Active Assignments</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.urgent}</p>
              <p className="text-sm text-gray-500">Due Soon</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.todayTasks}</p>
              <p className="text-sm text-gray-500">Today&apos;s Tasks</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upcoming Assignments */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Assignments</h2>
            <Link
              href="/dashboard/assignments"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {assignments.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No assignments yet</p>
                <Link
                  href="/dashboard/assignments/new"
                  className="text-primary-600 hover:text-primary-700 text-sm"
                >
                  Add your first assignment
                </Link>
              </div>
            ) : (
              assignments.map((assignment) => (
                <Link
                  key={assignment.id}
                  href={`/dashboard/assignments/${assignment.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{assignment.title}</h3>
                      {assignment.course && (
                        <p className="text-sm text-gray-500">{assignment.course.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(assignment.priority)}`}>
                        {assignment.priority}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.status)}`}>
                        {assignment.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  {assignment.due_date && (
                    <p className="text-sm text-gray-500 mt-2">
                      Due: {formatDate(assignment.due_date)}
                      {getDaysUntilDue(assignment.due_date) <= 2 && (
                        <span className="ml-2 text-red-600 font-medium">
                          ({getDaysUntilDue(assignment.due_date)} days left)
                        </span>
                      )}
                    </p>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Schedule</h2>
            <Link
              href="/dashboard/schedule"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {todaysTasks.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No tasks scheduled for today</p>
                <Link
                  href="/dashboard/schedule"
                  className="text-primary-600 hover:text-primary-700 text-sm"
                >
                  Plan your day
                </Link>
              </div>
            ) : (
              todaysTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 flex items-center gap-4"
                >
                  <div className={`p-2 rounded-lg ${task.completed ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {task.assignment?.title || 'Untitled Task'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {task.scheduled_start} - {task.scheduled_end}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
