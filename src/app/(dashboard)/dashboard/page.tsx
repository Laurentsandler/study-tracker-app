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
  Sparkles,
  Lightbulb,
  Check,
  X,
  Loader2,
  Timer,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Assignment, PlannedTask } from '@/types';
import { formatDate, getDaysUntilDue, getPriorityColor, getStatusColor } from '@/lib/utils';
import PomodoroTimer from '@/components/PomodoroTimer';

interface ScheduleSuggestion {
  id: string;
  assignment_id: string;
  suggested_date: string;
  suggested_start: string;
  suggested_end: string;
  reason: string;
  assignment?: Assignment;
}

export default function DashboardPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [todaysTasks, setTodaysTasks] = useState<PlannedTask[]>([]);
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [hasSchedule, setHasSchedule] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showTimer, setShowTimer] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

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

      // Check if user has a schedule set up
      const { data: scheduleData } = await supabase
        .from('user_schedule')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      setHasSchedule(!!(scheduleData && scheduleData.length > 0));

      // Fetch pending suggestions
      try {
        const suggestionsRes = await fetch('/api/schedule/suggestions', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (suggestionsRes.ok) {
          const suggestionsData = await suggestionsRes.json();
          setSuggestions(suggestionsData.slice(0, 3)); // Show max 3 on dashboard
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const generateSchedule = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setGenerating(true);
    try {
      const res = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        // Refetch suggestions
        const suggestionsRes = await fetch('/api/schedule/suggestions', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (suggestionsRes.ok) {
          const suggestionsData = await suggestionsRes.json();
          setSuggestions(suggestionsData.slice(0, 3));
        }
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSuggestionAction = async (suggestionId: string, action: 'accept' | 'dismiss') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('/api/schedule/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ suggestionId, action }),
    });

    if (res.ok) {
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      if (action === 'accept') {
        // Refresh today's tasks if the accepted suggestion is for today
        const today = new Date().toISOString().split('T')[0];
        const { data: tasksData } = await supabase
          .from('planned_tasks')
          .select('*, assignment:assignments(*)')
          .eq('scheduled_date', today)
          .order('scheduled_start', { ascending: true });
        if (tasksData) {
          setTodaysTasks(tasksData);
        }
      }
    }
  };

  const toggleTaskComplete = async (task: PlannedTask) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ completed: !task.completed }),
    });

    if (res.ok) {
      setTodaysTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, completed: !t.completed } : t
      ));
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTimer(!showTimer)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showTimer 
                ? 'bg-red-50 border-red-200 text-red-700' 
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Timer className="h-5 w-5" />
            <span className="hidden sm:inline">Pomodoro Timer</span>
            {showTimer ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <Link
            href="/dashboard/assignments/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>New Assignment</span>
          </Link>
        </div>
      </div>

      {/* Pomodoro Timer (Collapsible) */}
      {showTimer && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <PomodoroTimer 
              assignmentTitle={selectedAssignment?.title}
              onSessionComplete={(mode, duration) => {
                console.log(`Completed ${mode} session: ${duration} minutes`);
              }}
            />
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 h-full">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Focus on Assignment</h3>
                <p className="text-sm text-gray-500">Select an assignment to track your study time</p>
              </div>
              <div className="p-4 max-h-64 overflow-y-auto">
                {assignments.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No active assignments</p>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedAssignment(null)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        !selectedAssignment 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium text-gray-900">General Study</span>
                      <p className="text-sm text-gray-500">Not tracking a specific assignment</p>
                    </button>
                    {assignments.map(assignment => (
                      <button
                        key={assignment.id}
                        onClick={() => setSelectedAssignment(assignment)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedAssignment?.id === assignment.id 
                            ? 'border-primary-500 bg-primary-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{assignment.title}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(assignment.priority)}`}>
                            {assignment.priority}
                          </span>
                        </div>
                        {assignment.course && (
                          <p className="text-sm text-gray-500">{assignment.course.name}</p>
                        )}
                        {assignment.due_date && (
                          <p className="text-xs text-gray-400 mt-1">
                            Due: {formatDate(assignment.due_date)}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Schedule Suggestions Banner */}
      {!hasSchedule && assignments.length > 0 && (
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Set Up Smart Scheduling</h2>
                <p className="text-purple-100 mt-1">
                  Tell us your weekly schedule and let AI suggest the best times to work on your assignments.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/schedule"
              className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors flex items-center gap-2"
            >
              Set Up Schedule
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* AI Suggestions Card */}
      {hasSchedule && (suggestions.length > 0 || assignments.length > 0) && (
        <div className="bg-white rounded-xl border border-purple-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h2 className="font-semibold text-gray-900">AI Study Suggestions</h2>
            </div>
            <div className="flex items-center gap-2">
              {suggestions.length === 0 && assignments.length > 0 && (
                <button
                  onClick={generateSchedule}
                  disabled={generating}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lightbulb className="h-4 w-4" />
                  )}
                  {generating ? 'Generating...' : 'Get Suggestions'}
                </button>
              )}
              <Link
                href="/dashboard/schedule?tab=suggestions"
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                View all
              </Link>
            </div>
          </div>
          
          {suggestions.length === 0 ? (
            <div className="p-6 text-center">
              <Lightbulb className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                No pending suggestions. Click &ldquo;Get Suggestions&rdquo; to have AI plan your study time.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {suggestions.map(suggestion => (
                <div key={suggestion.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {suggestion.assignment?.title || 'Study Session'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(suggestion.suggested_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })} • {formatTime(suggestion.suggested_start)} - {formatTime(suggestion.suggested_end)}
                    </p>
                    {suggestion.reason && (
                      <p className="text-xs text-purple-600 mt-1">{suggestion.reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleSuggestionAction(suggestion.id, 'accept')}
                      className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                      title="Accept"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleSuggestionAction(suggestion.id, 'dismiss')}
                      className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                      title="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleTaskComplete(task)}
                >
                  <div className={`p-2 rounded-lg ${task.completed ? 'bg-green-100' : task.ai_generated ? 'bg-purple-100' : 'bg-gray-100'}`}>
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : task.ai_generated ? (
                      <Sparkles className="h-5 w-5 text-purple-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {task.assignment?.title || task.title || 'Untitled Task'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatTime(task.scheduled_start)} - {formatTime(task.scheduled_end)}
                    </p>
                  </div>
                  {task.ai_generated && !task.completed && (
                    <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                      AI
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
