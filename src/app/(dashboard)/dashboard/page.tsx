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
  Zap,
  TrendingUp,
  Target,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Assignment, PlannedTask } from '@/types';
import { formatDate, getDaysUntilDue, getPriorityColor, getStatusColor } from '@/lib/utils';
import PomodoroTimer from '@/components/PomodoroTimer';
import ProgressRing from '@/components/ui/ProgressRing';

interface ScheduleSuggestion {
  id: string;
  assignment_id: string;
  suggested_date: string;
  suggested_start: string;
  suggested_end: string;
  reason: string;
  assignment?: Assignment;
}

// Neo-Brutalism priority styles
const PRIORITY_STYLES = {
  low: 'bg-emerald-300 dark:bg-emerald-500',
  medium: 'bg-amber-300 dark:bg-amber-500',
  high: 'bg-rose-300 dark:bg-rose-500',
};

const STATUS_STYLES = {
  pending: 'bg-gray-200 dark:bg-gray-600',
  in_progress: 'bg-sky-300 dark:bg-sky-500',
  completed: 'bg-emerald-300 dark:bg-emerald-500',
};

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 6) return { text: 'Burning the midnight oil', emoji: '🌙' };
  if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
  if (hour < 17) return { text: 'Good afternoon', emoji: '📚' };
  if (hour < 21) return { text: 'Good evening', emoji: '🌆' };
  return { text: 'Night owl mode', emoji: '🦉' };
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
  const [completedCount, setCompletedCount] = useState(0);
  const [totalAssignments, setTotalAssignments] = useState(0);

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

      // Fetch total and completed assignments for progress
      const { count: totalCount } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: doneCount } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');

      setTotalAssignments(totalCount || 0);
      setCompletedCount(doneCount || 0);

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

    // Optimistic update: immediately remove the suggestion from the list
    const removedSuggestion = suggestions.find(s => s.id === suggestionId);
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));

    const res = await fetch('/api/schedule/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ suggestionId, action }),
    });

    if (res.ok) {
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
    } else {
      // Rollback optimistic update on failure by restoring just this suggestion
      if (removedSuggestion) {
        setSuggestions(prev => [...prev, removedSuggestion]);
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
        <div className="w-12 h-12 border-4 border-black dark:border-gray-600 border-t-yellow-300 dark:border-t-yellow-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  const greeting = getGreeting();
  const completionPercent = totalAssignments > 0 ? Math.round((completedCount / totalAssignments) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div className="flex items-center gap-4">
          {/* Progress Ring */}
          <div className="hidden sm:block">
            <ProgressRing
              progress={completionPercent}
              size={64}
              strokeWidth={5}
              color="#a855f7"
              bgColor="#d1d5db"
            >
              <span className="text-xs font-black text-black dark:text-gray-200">{completionPercent}%</span>
            </ProgressRing>
          </div>
          <div>
            <h1 className="text-3xl font-black text-black dark:text-white flex items-center gap-2">
              <span>{greeting.emoji}</span> {greeting.text}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 font-medium mt-1">
              {completedCount} of {totalAssignments} assignments completed
              {stats.urgent > 0 && (
                <span className="ml-2 text-rose-600 dark:text-rose-400 font-bold">
                  • {stats.urgent} due soon
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTimer(!showTimer)}
            className={`flex items-center gap-2 px-4 py-3 font-bold border-3 border-black dark:border-gray-600 rounded-xl transition-all ${
              showTimer 
                ? 'bg-rose-300 dark:bg-rose-500 shadow-[4px_4px_0_0_#000] text-black dark:text-white' 
                : 'bg-white dark:bg-gray-800 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] text-black dark:text-gray-200'
            }`}
          >
            <Timer className="h-5 w-5" />
            <span className="hidden sm:inline">Pomodoro</span>
            {showTimer ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <Link
            href="/dashboard/assignments/new"
            className="flex items-center gap-2 px-4 py-3 bg-yellow-300 dark:bg-yellow-500 font-bold border-3 border-black dark:border-gray-600 rounded-xl shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all text-black"
          >
            <Plus className="h-5 w-5" />
            <span>New Assignment</span>
          </Link>
        </div>
      </div>

      {/* Pomodoro Timer (Collapsible) */}
      {showTimer && (
        <div className="grid lg:grid-cols-3 gap-6 animate-fade-in-delay">
          <div className="lg:col-span-1">
            <PomodoroTimer 
              assignmentTitle={selectedAssignment?.title}
              onSessionComplete={(mode, duration) => {
                console.log(`Completed ${mode} session: ${duration} minutes`);
              }}
            />
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 border-3 border-black dark:border-gray-600 shadow-[4px_4px_0_0_#000] h-full rounded-xl">
              <div className="p-4 border-b-3 border-black dark:border-gray-600 bg-cyan-100 dark:bg-cyan-900 rounded-t-xl">
                <h3 className="font-bold text-black dark:text-gray-100">Focus on Assignment</h3>
                <p className="text-sm text-gray-700 dark:text-gray-400">Select an assignment to track your study time</p>
              </div>
              <div className="p-4 max-h-64 overflow-y-auto">
                {assignments.length === 0 ? (
                  <p className="text-center text-gray-600 dark:text-gray-400 py-4 font-medium">No active assignments</p>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={() => setSelectedAssignment(null)}
                      className={`w-full text-left p-4 border-3 border-black dark:border-gray-600 rounded-xl transition-all ${
                        !selectedAssignment 
                          ? 'bg-yellow-200 dark:bg-yellow-700 shadow-[4px_4px_0_0_#000]' 
                          : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 shadow-[2px_2px_0_0_#000]'
                      }`}
                    >
                      <span className="font-bold text-black dark:text-gray-100">General Study</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Not tracking a specific assignment</p>
                    </button>
                    {assignments.map(assignment => (
                      <button
                        key={assignment.id}
                        onClick={() => setSelectedAssignment(assignment)}
                        className={`w-full text-left p-4 border-3 border-black dark:border-gray-600 rounded-xl transition-all ${
                          selectedAssignment?.id === assignment.id 
                            ? 'bg-yellow-200 dark:bg-yellow-700 shadow-[4px_4px_0_0_#000]' 
                            : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 shadow-[2px_2px_0_0_#000]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-black dark:text-gray-100">{assignment.title}</span>
                          <span className={`px-2 py-1 text-xs font-bold border-2 border-black dark:border-gray-600 rounded ${PRIORITY_STYLES[assignment.priority as keyof typeof PRIORITY_STYLES] || 'bg-gray-200 dark:bg-gray-600'}`}>
                            {assignment.priority.toUpperCase()}
                          </span>
                        </div>
                        {assignment.course && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{assignment.course.name}</p>
                        )}
                        {assignment.due_date && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-medium">
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
        <div className="bg-violet-300 dark:bg-violet-700 border-3 border-black dark:border-gray-600 shadow-[6px_6px_0_0_#000] p-6 rounded-xl animate-fade-in-delay">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white dark:bg-gray-800 border-3 border-black dark:border-gray-600 rounded-xl">
                <Sparkles className="h-6 w-6 text-black dark:text-gray-100" />
              </div>
              <div>
                <h2 className="text-xl font-black text-black dark:text-white">Set Up Smart Scheduling</h2>
                <p className="text-gray-800 dark:text-gray-300 font-medium mt-1">
                  Tell us your weekly schedule and let AI suggest the best times to work on your assignments.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/schedule"
              className="px-4 py-3 bg-yellow-300 dark:bg-yellow-500 font-bold border-3 border-black dark:border-gray-600 rounded-xl shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all flex items-center gap-2 shrink-0 text-black"
            >
              Set Up Schedule
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* AI Suggestions Card */}
      {hasSchedule && (suggestions.length > 0 || assignments.length > 0) && (
        <div className="bg-white dark:bg-gray-800 border-3 border-black dark:border-gray-600 shadow-[4px_4px_0_0_#000] overflow-hidden rounded-xl animate-fade-in-delay-2">
          <div className="px-6 py-4 bg-violet-200 dark:bg-violet-800 border-b-3 border-black dark:border-gray-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-t-xl">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-black dark:text-gray-100" />
              <h2 className="font-black text-black dark:text-white">AI Study Suggestions</h2>
            </div>
            <div className="flex items-center gap-3">
              {suggestions.length === 0 && assignments.length > 0 && (
                <button
                  onClick={generateSchedule}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-300 dark:bg-yellow-500 font-bold border-3 border-black dark:border-gray-600 rounded-xl shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-black"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {generating ? 'Generating...' : 'Get Suggestions'}
                </button>
              )}
              <Link
                href="/dashboard/schedule?tab=suggestions"
                className="font-bold text-black dark:text-gray-200 hover:underline underline-offset-4"
              >
                View all →
              </Link>
            </div>
          </div>
          
          {suggestions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 border-3 border-black dark:border-gray-600 rounded-xl flex items-center justify-center">
                <Lightbulb className="h-8 w-8 text-black dark:text-gray-300" />
              </div>
              <p className="text-gray-700 dark:text-gray-400 font-medium">
                No pending suggestions. Click &ldquo;Get Suggestions&rdquo; to have AI plan your study time.
              </p>
            </div>
          ) : (
            <div className="divide-y-3 divide-black dark:divide-gray-600">
              {suggestions.map(suggestion => (
                <div key={suggestion.id} className="p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-bold text-black dark:text-gray-100 text-lg">
                      {suggestion.assignment?.title || 'Study Session'}
                    </p>
                    <p className="text-gray-700 dark:text-gray-400 font-medium">
                      {new Date(suggestion.suggested_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })} • {formatTime(suggestion.suggested_start)} - {formatTime(suggestion.suggested_end)}
                    </p>
                    {suggestion.reason && (
                      <p className="text-sm text-violet-700 dark:text-violet-400 font-medium mt-1">{suggestion.reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <button
                      onClick={() => handleSuggestionAction(suggestion.id, 'accept')}
                      className="p-2 bg-emerald-300 dark:bg-emerald-500 border-3 border-black dark:border-gray-600 rounded-xl shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] transition-all"
                      title="Accept"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleSuggestionAction(suggestion.id, 'dismiss')}
                      className="p-2 bg-gray-200 dark:bg-gray-600 border-3 border-black dark:border-gray-600 rounded-xl shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] transition-all"
                      title="Dismiss"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-delay-2">
        <div className="bg-cyan-200 dark:bg-cyan-800 p-5 border-3 border-black dark:border-gray-600 shadow-[4px_4px_0_0_#000] rounded-xl hover:translate-y-[-2px] transition-transform">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white dark:bg-gray-800 border-3 border-black dark:border-gray-600 rounded-xl">
              <ClipboardList className="h-6 w-6 text-black dark:text-cyan-300" />
            </div>
            <div>
              <p className="text-3xl font-black text-black dark:text-white">{stats.total}</p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Active</p>
            </div>
          </div>
        </div>

        <div className="bg-rose-300 dark:bg-rose-800 p-5 border-3 border-black dark:border-gray-600 shadow-[4px_4px_0_0_#000] rounded-xl hover:translate-y-[-2px] transition-transform">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white dark:bg-gray-800 border-3 border-black dark:border-gray-600 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-black dark:text-rose-300" />
            </div>
            <div>
              <p className="text-3xl font-black text-black dark:text-white">{stats.urgent}</p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Due Soon</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-200 dark:bg-amber-800 p-5 border-3 border-black dark:border-gray-600 shadow-[4px_4px_0_0_#000] rounded-xl hover:translate-y-[-2px] transition-transform">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white dark:bg-gray-800 border-3 border-black dark:border-gray-600 rounded-xl">
              <Clock className="h-6 w-6 text-black dark:text-amber-300" />
            </div>
            <div>
              <p className="text-3xl font-black text-black dark:text-white">{stats.inProgress}</p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">In Progress</p>
            </div>
          </div>
        </div>

        <div className="bg-emerald-300 dark:bg-emerald-800 p-5 border-3 border-black dark:border-gray-600 shadow-[4px_4px_0_0_#000] rounded-xl hover:translate-y-[-2px] transition-transform">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white dark:bg-gray-800 border-3 border-black dark:border-gray-600 rounded-xl">
              <Target className="h-6 w-6 text-black dark:text-emerald-300" />
            </div>
            <div>
              <p className="text-3xl font-black text-black dark:text-white">{completedCount}</p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Completed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 animate-fade-in-delay-3">
        {/* Upcoming Assignments */}
        <div className="bg-white dark:bg-gray-800 border-3 border-black dark:border-gray-600 shadow-[4px_4px_0_0_#000] rounded-xl">
          <div className="p-5 border-b-3 border-black dark:border-gray-600 bg-yellow-200 dark:bg-yellow-700 flex items-center justify-between rounded-t-xl">
            <h2 className="text-lg font-black text-black dark:text-white">Upcoming Assignments</h2>
            <Link
              href="/dashboard/assignments"
              className="font-bold text-black dark:text-gray-200 hover:underline underline-offset-4 flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y-3 divide-black dark:divide-gray-600">
            {assignments.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 border-3 border-black dark:border-gray-600 rounded-xl flex items-center justify-center">
                  <ClipboardList className="h-8 w-8 text-black dark:text-gray-400" />
                </div>
                <p className="font-medium text-gray-700 dark:text-gray-400">No assignments yet</p>
                <Link
                  href="/dashboard/assignments/new"
                  className="inline-block mt-3 px-4 py-2 bg-yellow-300 dark:bg-yellow-500 font-bold border-3 border-black dark:border-gray-600 rounded-xl shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] transition-all text-black"
                >
                  Add your first assignment
                </Link>
              </div>
            ) : (
              assignments.map((assignment) => (
                <Link
                  key={assignment.id}
                  href={`/dashboard/assignments/${assignment.id}`}
                  className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-black dark:text-gray-100 truncate">{assignment.title}</h3>
                      {assignment.course && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium truncate">{assignment.course.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-1 text-xs font-bold border-2 border-black dark:border-gray-600 rounded ${PRIORITY_STYLES[assignment.priority as keyof typeof PRIORITY_STYLES] || 'bg-gray-200 dark:bg-gray-600'}`}>
                        {assignment.priority.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 text-xs font-bold border-2 border-black dark:border-gray-600 rounded ${STATUS_STYLES[assignment.status as keyof typeof STATUS_STYLES] || 'bg-gray-200 dark:bg-gray-600'}`}>
                        {assignment.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {assignment.due_date && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                      Due: {formatDate(assignment.due_date)}
                      {getDaysUntilDue(assignment.due_date) <= 2 && (
                        <span className="ml-2 text-rose-600 dark:text-rose-400 font-bold">
                          ({getDaysUntilDue(assignment.due_date)} days left!)
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
        <div className="bg-white dark:bg-gray-800 border-3 border-black dark:border-gray-600 shadow-[4px_4px_0_0_#000] rounded-xl">
          <div className="p-5 border-b-3 border-black dark:border-gray-600 bg-cyan-200 dark:bg-cyan-800 flex items-center justify-between rounded-t-xl">
            <h2 className="text-lg font-black text-black dark:text-white">Today&apos;s Schedule</h2>
            <Link
              href="/dashboard/schedule"
              className="font-bold text-black dark:text-gray-200 hover:underline underline-offset-4 flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y-3 divide-black dark:divide-gray-600">
            {todaysTasks.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 border-3 border-black dark:border-gray-600 rounded-xl flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-black dark:text-gray-400" />
                </div>
                <p className="font-medium text-gray-700 dark:text-gray-400">No tasks scheduled for today</p>
                <Link
                  href="/dashboard/schedule"
                  className="inline-block mt-3 px-4 py-2 bg-cyan-300 dark:bg-cyan-600 font-bold border-3 border-black dark:border-gray-600 rounded-xl shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] transition-all text-black dark:text-white"
                >
                  Plan your day
                </Link>
              </div>
            ) : (
              todaysTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => toggleTaskComplete(task)}
                >
                  <div className={`p-3 border-3 border-black dark:border-gray-600 rounded-xl ${task.completed ? 'bg-emerald-300 dark:bg-emerald-500' : task.ai_generated ? 'bg-violet-200 dark:bg-violet-600' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : task.ai_generated ? (
                      <Sparkles className="h-5 w-5" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold truncate ${task.completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-black dark:text-gray-100'}`}>
                      {task.assignment?.title || task.title || 'Untitled Task'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {formatTime(task.scheduled_start)} - {formatTime(task.scheduled_end)}
                    </p>
                  </div>
                  {task.ai_generated && !task.completed && (
                    <span className="px-2 py-1 text-xs font-bold bg-violet-200 dark:bg-violet-600 border-2 border-black dark:border-gray-600 rounded shrink-0 text-black dark:text-white">
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
