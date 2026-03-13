'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  BookOpen,
  Clock,
  CheckCircle2,
  Play,
  Pause,
  Trash2,
  Sparkles,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BarChart3,
  Target,
  TrendingUp,
  Lightbulb,
  Edit2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { EdxCourse, EdxProgressLog, EdxAiInsight, EdxCourseStatus } from '@/types';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function fmtMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function progressPct(course: EdxCourse): number {
  if (!course.total_estimated_hours || course.total_estimated_hours === 0) return 0;
  return Math.min(100, Math.round(((course.total_logged_minutes || 0) / 60 / course.total_estimated_hours) * 100));
}

const STATUS_LABELS: Record<EdxCourseStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  dropped: 'Dropped',
};

const STATUS_COLORS: Record<EdxCourseStatus, string> = {
  not_started: 'bg-gray-200 text-black',
  in_progress: 'bg-sky-300 text-black',
  completed: 'bg-emerald-300 text-black',
  dropped: 'bg-rose-200 text-black',
};

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function EdxCoursesPage() {
  const [courses, setCourses] = useState<EdxCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<EdxCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [aiInsight, setAiInsight] = useState<EdxAiInsight | null>(null);
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState(false);

  // Live timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // ── Timer ──────────────────────────────────
  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  const fmtTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [h > 0 ? String(h).padStart(2, '0') : null, String(m).padStart(2, '0'), String(s).padStart(2, '0')]
      .filter(Boolean)
      .join(':');
  };

  const stopAndLogTimer = () => {
    if (timerSeconds < 60) {
      setTimerActive(false);
      setTimerSeconds(0);
      return;
    }
    setTimerActive(false);
    setShowLogModal(true);
    // Pre-fill duration from timer
    setPrefilledMinutes(Math.round(timerSeconds / 60));
    setTimerSeconds(0);
  };

  const [prefilledMinutes, setPrefilledMinutes] = useState<number | undefined>(undefined);

  // ── Data fetching ──────────────────────────
  const fetchCourses = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch('/api/edx-courses', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
        // Refresh selected course summary (total_logged_minutes) if still selected
        setSelectedCourse((prev) => {
          if (!prev) return prev;
          const refreshed = data.find((c: EdxCourse) => c.id === prev.id);
          return refreshed ? { ...prev, total_logged_minutes: refreshed.total_logged_minutes } : prev;
        });
      }
    } catch (err) {
      console.error('Error fetching edX courses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const selectCourse = async (course: EdxCourse) => {
    setAiInsight(null);
    setInsightError(null);
    setExpandedLogs(false);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/edx-courses/${course.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setSelectedCourse(data);
    } else {
      setSelectedCourse(course);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Delete this course and all its progress logs?')) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`/api/edx-courses/${courseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    if (selectedCourse?.id === courseId) setSelectedCourse(null);
  };

  const handleDeleteLog = async (logId: string) => {
    if (!selectedCourse) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/edx-courses/${selectedCourse.id}/progress?logId=${logId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      await selectCourse(selectedCourse);
      fetchCourses();
    }
  };

  const handleGenerateInsights = async () => {
    if (!selectedCourse) return;
    setGeneratingInsight(true);
    setInsightError(null);
    setAiInsight(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch(`/api/edx-courses/${selectedCourse.id}/ai-insights`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAiInsight(data);
      } else {
        const data = await res.json();
        setInsightError(data.error || 'Failed to generate insights');
      }
    } catch {
      setInsightError('Failed to generate insights. Please try again.');
    } finally {
      setGeneratingInsight(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-black border-t-yellow-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-black dark:text-white">edX Course Tracker</h1>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            Track your time, log progress, and get AI-powered study insights
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-3 bg-yellow-300 font-bold border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all"
        >
          <Plus className="h-5 w-5" />
          Add Course
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Course list */}
        <div className="bg-white dark:bg-gray-900 border-3 border-black dark:border-gray-700 shadow-[4px_4px_0_0_#000]">
          <div className="p-4 border-b-3 border-black dark:border-gray-700 bg-indigo-200 dark:bg-indigo-700">
            <h2 className="font-black text-black dark:text-white">Your Courses</h2>
          </div>
          {courses.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 border-3 border-black flex items-center justify-center">
                <BookOpen className="h-8 w-8 dark:text-white" />
              </div>
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">No courses yet</p>
              <p className="text-sm text-gray-500">Add your first edX course to start tracking</p>
            </div>
          ) : (
            <div className="divide-y-3 divide-black dark:divide-gray-700">
              {courses.map((course) => {
                const pct = progressPct(course);
                return (
                  <button
                    key={course.id}
                    onClick={() => selectCourse(course)}
                    className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      selectedCourse?.id === course.id ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-indigo-300 dark:bg-indigo-600 border-3 border-black dark:border-gray-600 flex items-center justify-center shrink-0">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-black dark:text-white truncate">{course.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{course.provider}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 font-bold border border-black ${STATUS_COLORS[course.status]}`}>
                            {STATUS_LABELS[course.status]}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {fmtMinutes(course.total_logged_minutes || 0)} logged
                          </span>
                        </div>
                        {/* Mini progress bar */}
                        {course.total_estimated_hours > 0 && (
                          <div className="mt-1.5 h-1.5 bg-gray-200 dark:bg-gray-700 border border-black dark:border-gray-600 rounded-sm overflow-hidden">
                            <div
                              className="h-full bg-indigo-400"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selectedCourse ? (
            <div className="space-y-4">
              {/* Course header card */}
              <div className="bg-white dark:bg-gray-900 border-3 border-black dark:border-gray-700 shadow-[4px_4px_0_0_#000]">
                <div className="p-5 border-b-3 border-black dark:border-gray-700 bg-indigo-100 dark:bg-indigo-900/40">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-xl font-black text-black dark:text-white">{selectedCourse.title}</h2>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                          {selectedCourse.provider}
                        </span>
                        {selectedCourse.category && (
                          <span className="text-xs px-2 py-0.5 bg-indigo-200 dark:bg-indigo-700 border border-black dark:border-gray-600 font-bold">
                            {selectedCourse.category}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 font-bold border border-black ${STATUS_COLORS[selectedCourse.status]}`}>
                          {STATUS_LABELS[selectedCourse.status]}
                        </span>
                      </div>
                      {selectedCourse.url && (
                        <a
                          href={selectedCourse.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Course link
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="flex items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 font-bold border-2 border-black dark:border-gray-600 shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all text-sm"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(selectedCourse.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-rose-200 dark:bg-rose-700 font-bold border-2 border-black dark:border-gray-600 shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all text-sm"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard
                    icon={<Clock className="h-5 w-5" />}
                    label="Time Logged"
                    value={fmtMinutes(selectedCourse.total_logged_minutes || 0)}
                    color="bg-sky-100 dark:bg-sky-900/40"
                  />
                  <StatCard
                    icon={<Target className="h-5 w-5" />}
                    label="Estimated"
                    value={`${selectedCourse.total_estimated_hours}h`}
                    color="bg-amber-100 dark:bg-amber-900/40"
                  />
                  <StatCard
                    icon={<TrendingUp className="h-5 w-5" />}
                    label="Progress"
                    value={`${progressPct(selectedCourse)}%`}
                    color="bg-indigo-100 dark:bg-indigo-900/40"
                  />
                  <StatCard
                    icon={<BarChart3 className="h-5 w-5" />}
                    label="Sessions"
                    value={String((selectedCourse.progress_logs || []).length)}
                    color="bg-emerald-100 dark:bg-emerald-900/40"
                  />
                </div>

                {/* Progress bar */}
                {selectedCourse.total_estimated_hours > 0 && (
                  <div className="px-5 pb-5">
                    <div className="flex justify-between text-xs font-bold mb-1 text-gray-600 dark:text-gray-400">
                      <span>Progress</span>
                      <span>{progressPct(selectedCourse)}%</span>
                    </div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 border-2 border-black dark:border-gray-600 overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 dark:bg-indigo-500 transition-all"
                        style={{ width: `${progressPct(selectedCourse)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Live timer & log button */}
              <div className="bg-white dark:bg-gray-900 border-3 border-black dark:border-gray-700 shadow-[4px_4px_0_0_#000] p-5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-black text-black dark:text-white">Study Timer</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Start the timer while you study, then log it automatically
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {timerActive || timerSeconds > 0 ? (
                      <>
                        <span className="font-mono text-2xl font-black text-black dark:text-white">
                          {fmtTimer(timerSeconds)}
                        </span>
                        {timerActive ? (
                          <button
                            onClick={() => setTimerActive(false)}
                            className="flex items-center gap-2 px-3 py-2 bg-amber-300 font-bold border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all"
                          >
                            <Pause className="h-4 w-4" />
                            Pause
                          </button>
                        ) : (
                          <button
                            onClick={() => setTimerActive(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-300 font-bold border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all"
                          >
                            <Play className="h-4 w-4" />
                            Resume
                          </button>
                        )}
                        <button
                          onClick={stopAndLogTimer}
                          className="flex items-center gap-2 px-3 py-2 bg-indigo-300 dark:bg-indigo-600 font-bold border-2 border-black dark:border-gray-600 shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Done &amp; Log
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setTimerActive(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-300 font-bold border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all"
                        >
                          <Play className="h-4 w-4" />
                          Start Timer
                        </button>
                        <button
                          onClick={() => { setPrefilledMinutes(undefined); setShowLogModal(true); }}
                          className="flex items-center gap-2 px-4 py-2 bg-sky-200 dark:bg-sky-700 font-bold border-2 border-black dark:border-gray-600 shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all"
                        >
                          <Plus className="h-4 w-4" />
                          Log Manually
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Insights */}
              <div className="bg-white dark:bg-gray-900 border-3 border-black dark:border-gray-700 shadow-[4px_4px_0_0_#000]">
                <div className="p-4 border-b-3 border-black dark:border-gray-700 bg-pink-100 dark:bg-pink-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                    <h3 className="font-black text-black dark:text-white">AI Progress Insights</h3>
                  </div>
                  <button
                    onClick={handleGenerateInsights}
                    disabled={generatingInsight}
                    className="flex items-center gap-2 px-3 py-1.5 bg-pink-300 dark:bg-pink-600 font-bold border-2 border-black dark:border-gray-600 shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all text-sm disabled:opacity-50"
                  >
                    {generatingInsight ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {generatingInsight ? 'Generating...' : 'Generate Insights'}
                  </button>
                </div>
                <div className="p-4">
                  {insightError && (
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 border-2 border-black dark:border-gray-600 text-sm font-bold flex justify-between">
                      <span>{insightError}</span>
                      <button onClick={() => setInsightError(null)}><X className="h-4 w-4" /></button>
                    </div>
                  )}
                  {aiInsight ? (
                    <div className="space-y-4">
                      <p className="text-gray-700 dark:text-gray-300 font-medium">{aiInsight.summary}</p>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-black dark:border-gray-600">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <h4 className="font-black text-sm text-black dark:text-white">Strengths</h4>
                          </div>
                          <ul className="space-y-1">
                            {aiInsight.strengths.map((s, i) => (
                              <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-1">
                                <span className="text-emerald-500 font-bold">✓</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border-2 border-black dark:border-gray-600">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="h-4 w-4 text-amber-600" />
                            <h4 className="font-black text-sm text-black dark:text-white">Suggestions</h4>
                          </div>
                          <ul className="space-y-1">
                            {aiInsight.suggestions.map((s, i) => (
                              <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-1">
                                <span className="text-amber-500 font-bold">→</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="flex gap-4 flex-wrap text-sm">
                        <span className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 border-2 border-black dark:border-gray-600 font-bold">
                          🎯 Est. completion: {aiInsight.estimated_completion}
                        </span>
                        <span className="px-3 py-1.5 bg-sky-100 dark:bg-sky-900/30 border-2 border-black dark:border-gray-600 font-bold">
                          ⏱ Recommended: {aiInsight.recommended_daily_minutes} min/day
                        </span>
                      </div>
                    </div>
                  ) : !generatingInsight ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Click &ldquo;Generate Insights&rdquo; to get personalized AI recommendations based on your progress.
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Progress logs */}
              <div className="bg-white dark:bg-gray-900 border-3 border-black dark:border-gray-700 shadow-[4px_4px_0_0_#000]">
                <button
                  onClick={() => setExpandedLogs(!expandedLogs)}
                  className="w-full p-4 border-b-3 border-black dark:border-gray-700 bg-sky-100 dark:bg-sky-900/40 flex items-center justify-between hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-colors"
                >
                  <h3 className="font-black text-black dark:text-white">
                    Study Sessions ({(selectedCourse.progress_logs || []).length})
                  </h3>
                  {expandedLogs ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
                {expandedLogs && (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(selectedCourse.progress_logs || []).length === 0 ? (
                      <p className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No sessions logged yet. Start a timer or log manually!
                      </p>
                    ) : (
                      (selectedCourse.progress_logs || []).map((log: EdxProgressLog) => (
                        <div key={log.id} className="p-4 flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-black dark:text-white">{fmtMinutes(log.duration_minutes)}</span>
                              {log.section && (
                                <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 border border-black dark:border-gray-600 font-bold">
                                  {log.section}
                                </span>
                              )}
                            </div>
                            {log.notes && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{log.notes}</p>
                            )}
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {new Date(log.logged_at).toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border-3 border-black dark:border-gray-700 shadow-[4px_4px_0_0_#000] p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-indigo-100 dark:bg-indigo-900/40 border-3 border-black flex items-center justify-center">
                <BookOpen className="h-10 w-10 dark:text-white" />
              </div>
              <h3 className="text-xl font-black text-black dark:text-white mb-2">Select a Course</h3>
              <p className="text-gray-600 dark:text-gray-400">Choose a course from the list to view progress and log time</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <CourseFormModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSaved={(course) => {
            setCourses((prev) => [course, ...prev]);
            setShowAddModal(false);
            selectCourse(course);
          }}
        />
      )}
      {showEditModal && selectedCourse && (
        <CourseFormModal
          mode="edit"
          course={selectedCourse}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            setCourses((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
            setSelectedCourse((prev) => prev ? { ...prev, ...updated } : prev);
            setShowEditModal(false);
          }}
        />
      )}
      {showLogModal && selectedCourse && (
        <LogProgressModal
          course={selectedCourse}
          prefilledMinutes={prefilledMinutes}
          onClose={() => { setShowLogModal(false); setPrefilledMinutes(undefined); }}
          onLogged={() => {
            setShowLogModal(false);
            setPrefilledMinutes(undefined);
            selectCourse(selectedCourse);
            fetchCourses();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className={`p-3 border-2 border-black dark:border-gray-600 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-black text-black dark:text-white">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Course Form Modal (Add / Edit)
// ─────────────────────────────────────────────
function CourseFormModal({
  mode,
  course,
  onClose,
  onSaved,
}: {
  mode: 'add' | 'edit';
  course?: EdxCourse;
  onClose: () => void;
  onSaved: (course: EdxCourse) => void;
}) {
  const [title, setTitle] = useState(course?.title || '');
  const [url, setUrl] = useState(course?.url || '');
  const [provider, setProvider] = useState(course?.provider || 'edX');
  const [category, setCategory] = useState(course?.category || '');
  const [startDate, setStartDate] = useState(course?.start_date || '');
  const [targetEnd, setTargetEnd] = useState(course?.target_end_date || '');
  const [estimatedHours, setEstimatedHours] = useState(String(course?.total_estimated_hours || ''));
  const [notes, setNotes] = useState(course?.notes || '');
  const [status, setStatus] = useState<EdxCourseStatus>(course?.status || 'in_progress');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const payload = {
      title: title.trim(),
      url: url.trim() || null,
      provider: provider.trim() || 'edX',
      category: category.trim() || null,
      start_date: startDate || null,
      target_end_date: targetEnd || null,
      total_estimated_hours: estimatedHours ? parseFloat(estimatedHours) : 0,
      notes: notes.trim() || null,
      status,
    };

    try {
      const res = await fetch(
        mode === 'add' ? '/api/edx-courses' : `/api/edx-courses/${course!.id}`,
        {
          method: mode === 'add' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(payload),
        }
      );
      if (res.ok) {
        const data = await res.json();
        onSaved(data);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save course');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 border-3 border-black dark:border-gray-700 shadow-[6px_6px_0_0_#000] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b-3 border-black dark:border-gray-700 bg-indigo-200 dark:bg-indigo-700">
          <h2 className="font-black text-black dark:text-white">{mode === 'add' ? 'Add edX Course' : 'Edit Course'}</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 border-2 border-black font-bold text-sm text-red-800 dark:text-red-300">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-black mb-1 text-black dark:text-white">Course Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Introduction to Machine Learning"
              className="w-full px-3 py-2 border-2 border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-black mb-1 text-black dark:text-white">Provider</label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="edX"
                className="w-full px-3 py-2 border-2 border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-black mb-1 text-black dark:text-white">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full px-3 py-2 border-2 border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-black mb-1 text-black dark:text-white">Course URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.edx.org/course/..."
              className="w-full px-3 py-2 border-2 border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-black mb-1 text-black dark:text-white">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-black mb-1 text-black dark:text-white">Target End Date</label>
              <input
                type="date"
                value={targetEnd}
                onChange={(e) => setTargetEnd(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-black mb-1 text-black dark:text-white">Estimated Total Hours</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="e.g. 40"
              className="w-full px-3 py-2 border-2 border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-black mb-1 text-black dark:text-white">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EdxCourseStatus)}
              className="w-full px-3 py-2 border-2 border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-black mb-1 text-black dark:text-white">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes about this course..."
              className="w-full px-3 py-2 border-2 border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 font-bold border-2 border-black dark:border-gray-600 hover:bg-gray-300 transition-colors dark:text-white">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-indigo-300 dark:bg-indigo-600 font-bold border-2 border-black dark:border-gray-600 shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all disabled:opacity-50 dark:text-white"
            >
              {loading ? 'Saving...' : mode === 'add' ? 'Add Course' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Log Progress Modal
// ─────────────────────────────────────────────
function LogProgressModal({
  course,
  prefilledMinutes,
  onClose,
  onLogged,
}: {
  course: EdxCourse;
  prefilledMinutes?: number;
  onClose: () => void;
  onLogged: () => void;
}) {
  const [durationMinutes, setDurationMinutes] = useState(String(prefilledMinutes || ''));
  const [section, setSection] = useState('');
  const [notes, setNotes] = useState('');
  const [loggedAt, setLoggedAt] = useState(new Date().toISOString().slice(0, 16));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(durationMinutes, 10);
    if (!mins || mins <= 0) {
      setError('Please enter a valid duration in minutes');
      return;
    }
    setLoading(true);
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch(`/api/edx-courses/${course.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ duration_minutes: mins, section: section.trim() || null, notes: notes.trim() || null, logged_at: new Date(loggedAt).toISOString() }),
      });
      if (res.ok) {
        onLogged();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to log progress');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 border-3 border-black dark:border-gray-700 shadow-[6px_6px_0_0_#000] w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b-3 border-black dark:border-gray-700 bg-sky-200 dark:bg-sky-700">
          <h2 className="font-black text-black dark:text-white">Log Study Session</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Logging session for <strong className="text-black dark:text-white">{course.title}</strong>
          </p>
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 border-2 border-black font-bold text-sm text-red-800 dark:text-red-300">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-black mb-1 text-black dark:text-white">Duration (minutes) *</label>
            <input
              type="number"
              min="1"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              required
              placeholder="e.g. 45"
              className="w-full px-3 py-2 border-2 border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div>
            <label className="block text-sm font-black mb-1 text-black dark:text-white">Section / Topic</label>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g. Week 3 - Neural Networks"
              className="w-full px-3 py-2 border-2 border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div>
            <label className="block text-sm font-black mb-1 text-black dark:text-white">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="What did you cover? Any key takeaways?"
              className="w-full px-3 py-2 border-2 border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-black mb-1 text-black dark:text-white">Date &amp; Time</label>
            <input
              type="datetime-local"
              value={loggedAt}
              onChange={(e) => setLoggedAt(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black dark:border-gray-600 dark:bg-gray-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 font-bold border-2 border-black dark:border-gray-600 hover:bg-gray-300 transition-colors dark:text-white">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-sky-300 dark:bg-sky-600 font-bold border-2 border-black dark:border-gray-600 shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all disabled:opacity-50 dark:text-white"
            >
              {loading ? 'Logging...' : 'Log Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
