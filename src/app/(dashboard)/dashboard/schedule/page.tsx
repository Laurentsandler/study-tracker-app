'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  MapPin,
  BookOpen,
  Coffee,
  Briefcase,
  GraduationCap,
  Lightbulb,
  Check,
  XCircle,
  CheckCheck,
  Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { UserSchedule, PlannedTask, ScheduleBlockType, Assignment } from '@/types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const BLOCK_TYPES: { value: ScheduleBlockType; label: string; icon: any; color: string }[] = [
  { value: 'class', label: 'Class', icon: GraduationCap, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'study', label: 'Study Time', icon: BookOpen, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'free', label: 'Free Time', icon: Coffee, color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'work', label: 'Work', icon: Briefcase, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'other', label: 'Other', icon: Clock, color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

// Priority colors for tasks
const PRIORITY_COLORS = {
  high: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  low: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

interface ScheduleSuggestion {
  id: string;
  assignment_id: string;
  suggested_date: string;
  suggested_start: string;
  suggested_end: string;
  reason: string;
  assignment?: Assignment;
}

export default function SchedulePage() {
  const [scheduleBlocks, setScheduleBlocks] = useState<UserSchedule[]>([]);
  const [plannedTasks, setPlannedTasks] = useState<PlannedTask[]>([]);
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'setup' | 'calendar' | 'suggestions'>('calendar');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek;
    return new Date(today.setDate(diff));
  });

  // Add block form state
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newBlock, setNewBlock] = useState({
    day_of_week: 0,
    available_start: '09:00',
    available_end: '10:00',
    label: '',
    block_type: 'study' as ScheduleBlockType,
    location: '',
  });

  useEffect(() => {
    fetchData();
  }, [currentWeekStart]);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setLoading(true);

    // Fetch schedule blocks
    const scheduleRes = await fetch('/api/schedule', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (scheduleRes.ok) {
      const data = await scheduleRes.json();
      setScheduleBlocks(data);
    }

    // Fetch planned tasks for current week
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const tasksRes = await fetch(
      `/api/tasks?startDate=${currentWeekStart.toISOString().split('T')[0]}&endDate=${weekEnd.toISOString().split('T')[0]}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    );
    if (tasksRes.ok) {
      const data = await tasksRes.json();
      setPlannedTasks(data);
    }

    // Fetch pending suggestions
    const suggestionsRes = await fetch('/api/schedule/suggestions', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (suggestionsRes.ok) {
      const data = await suggestionsRes.json();
      setSuggestions(data);
    }

    setLoading(false);
  };

  const addScheduleBlock = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(newBlock),
    });

    if (res.ok) {
      const data = await res.json();
      setScheduleBlocks(prev => [...prev, data].sort((a, b) => 
        a.day_of_week - b.day_of_week || a.available_start.localeCompare(b.available_start)
      ));
      setShowAddBlock(false);
      setNewBlock({
        day_of_week: 0,
        available_start: '09:00',
        available_end: '10:00',
        label: '',
        block_type: 'study',
        location: '',
      });
    }
  };

  const deleteScheduleBlock = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/schedule/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      setScheduleBlocks(prev => prev.filter(b => b.id !== id));
    }
  };

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

      const data = await res.json();
      
      if (data.needsSchedule) {
        setActiveTab('setup');
        alert('Please set up your weekly schedule first!');
      } else if (data.suggestions) {
        // Refetch suggestions
        const suggestionsRes = await fetch('/api/schedule/suggestions', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (suggestionsRes.ok) {
          const suggestionsData = await suggestionsRes.json();
          setSuggestions(suggestionsData);
        }
        setAiInsights(data.insights || '');
        setActiveTab('suggestions');
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
        fetchData(); // Refresh tasks
      }
    }
  };

  const handleBulkAction = async (action: 'acceptAll' | 'dismissAll') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('/api/schedule/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ suggestionId: 'bulk', action }),
    });

    if (res.ok) {
      setSuggestions([]);
      if (action === 'acceptAll') {
        fetchData();
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
      setPlannedTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, completed: !t.completed } : t
      ));
    }
  };

  const deleteTask = async (taskId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      setPlannedTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  const getBlockTypeConfig = (type: ScheduleBlockType) => {
    return BLOCK_TYPES.find(bt => bt.value === type) || BLOCK_TYPES[4];
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-500">Manage your study time with AI-powered planning</p>
        </div>
        <button
          onClick={generateSchedule}
          disabled={generating || scheduleBlocks.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 font-medium"
        >
          {generating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          <span>{generating ? 'Generating...' : 'AI Schedule'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'calendar'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Calendar
        </button>
        <button
          onClick={() => setActiveTab('setup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'setup'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="h-4 w-4" />
          Weekly Setup
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all relative ${
            activeTab === 'suggestions'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Lightbulb className="h-4 w-4" />
          AI Suggestions
          {suggestions.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {suggestions.length}
            </span>
          )}
        </button>
      </div>

      {/* Calendar View */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Week Navigation Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-sm text-gray-500">
                  {currentWeekStart.toLocaleDateString('en-US', { day: 'numeric' })} - {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { day: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => navigateWeek('next')}
                className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 border-t border-gray-100">
              {getWeekDates().map((date, i) => {
                const isToday = date.toDateString() === new Date().toDateString();
                const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                
                return (
                  <div 
                    key={i} 
                    className={`py-3 text-center border-r last:border-r-0 border-gray-100 ${
                      isToday ? 'bg-purple-50' : isPast ? 'bg-gray-50/50' : ''
                    }`}
                  >
                    <p className={`text-xs font-medium uppercase tracking-wide ${
                      isToday ? 'text-purple-600' : 'text-gray-400'
                    }`}>
                      {SHORT_DAY_NAMES[date.getDay()]}
                    </p>
                    <div className={`mt-1 mx-auto w-9 h-9 flex items-center justify-center rounded-full ${
                      isToday 
                        ? 'bg-purple-600 text-white' 
                        : isPast 
                          ? 'text-gray-400' 
                          : 'text-gray-900'
                    }`}>
                      <span className="text-sm font-semibold">{date.getDate()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Suggestions Banner */}
          {suggestions.length > 0 && (
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl p-4 shadow-lg shadow-purple-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {suggestions.length} AI Suggestion{suggestions.length !== 1 ? 's' : ''} Ready
                    </p>
                    <p className="text-purple-100 text-sm">Click on dashed cards below to accept</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkAction('acceptAll')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white text-purple-600 rounded-xl hover:bg-purple-50 text-sm font-medium transition-colors"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Accept All
                  </button>
                  <button
                    onClick={() => handleBulkAction('dismissAll')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white border border-white/20 rounded-xl hover:bg-white/20 text-sm font-medium transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tasks Grid */}
          <div className="grid grid-cols-7 gap-3">
            {getWeekDates().map((date, i) => {
              const dateStr = date.toISOString().split('T')[0];
              const dayTasks = plannedTasks.filter(t => t.scheduled_date === dateStr);
              const daySuggestions = suggestions.filter(s => s.suggested_date === dateStr);
              const isToday = date.toDateString() === new Date().toDateString();
              const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
              const hasItems = dayTasks.length > 0 || daySuggestions.length > 0;

              return (
                <div 
                  key={i} 
                  className={`min-h-[180px] rounded-2xl border transition-all ${
                    isToday 
                      ? 'bg-purple-50/50 border-purple-200 ring-2 ring-purple-100' 
                      : hasItems
                        ? 'bg-white border-gray-200 shadow-sm'
                        : 'bg-gray-50/50 border-gray-100'
                  }`}
                >
                  <div className="p-3 space-y-2">
                    {/* Planned tasks */}
                    {dayTasks.map(task => {
                      const priority = task.assignment?.priority || 'medium';
                      const colors = PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.medium;
                      
                      return (
                        <div
                          key={task.id}
                          className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                            task.completed
                              ? 'bg-gray-50 border-gray-200 opacity-60'
                              : `${colors.bg} ${colors.border} hover:shadow-md`
                          }`}
                          onClick={() => toggleTaskComplete(task)}
                        >
                          {/* Priority indicator */}
                          {!task.completed && (
                            <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${colors.dot}`} />
                          )}
                          
                          {/* Task content */}
                          <div className="pr-6">
                            <p className={`text-sm font-medium leading-tight ${
                              task.completed ? 'line-through text-gray-400' : colors.text
                            }`}>
                              {task.assignment?.title || task.title}
                            </p>
                            <p className={`text-xs mt-1 ${
                              task.completed ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {formatTime(task.scheduled_start)} - {formatTime(task.scheduled_end)}
                            </p>
                          </div>

                          {/* Hover actions */}
                          <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {task.completed ? (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <>
                                {task.ai_generated && (
                                  <span className="p-1 bg-purple-100 rounded-md">
                                    <Sparkles className="h-3 w-3 text-purple-500" />
                                  </span>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTask(task.id);
                                  }}
                                  className="p-1 bg-red-100 text-red-500 rounded-md hover:bg-red-200 transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* AI Suggestions */}
                    {daySuggestions.map(suggestion => (
                      <div
                        key={suggestion.id}
                        className="group relative p-3 rounded-xl border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50 cursor-pointer hover:border-purple-400 hover:shadow-md transition-all"
                        onClick={() => handleSuggestionAction(suggestion.id, 'accept')}
                      >
                        {/* AI badge */}
                        <div className="absolute -top-2 -right-2 p-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg shadow-lg">
                          <Sparkles className="h-3 w-3 text-white" />
                        </div>

                        <p className="text-sm font-medium text-purple-700 leading-tight pr-4">
                          {suggestion.assignment?.title || 'Study Session'}
                        </p>
                        <p className="text-xs text-purple-500 mt-1">
                          {formatTime(suggestion.suggested_start)} - {formatTime(suggestion.suggested_end)}
                        </p>

                        {/* Hover actions */}
                        <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSuggestionAction(suggestion.id, 'accept');
                            }}
                            className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                            title="Accept"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSuggestionAction(suggestion.id, 'dismiss');
                            }}
                            className="p-1.5 bg-white text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                            title="Dismiss"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Empty state for past days */}
                    {!hasItems && isPast && (
                      <div className="flex items-center justify-center h-24">
                        <p className="text-xs text-gray-400">No tasks</p>
                      </div>
                    )}

                    {/* Empty state for future days */}
                    {!hasItems && !isPast && (
                      <div className="flex flex-col items-center justify-center h-24 text-center">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-400">Free day</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{plannedTasks.length}</p>
                <p className="text-xs text-gray-500">Scheduled Tasks</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="p-2.5 bg-green-50 rounded-xl">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {plannedTasks.filter(t => t.completed).length}
                </p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 rounded-xl">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{suggestions.length}</p>
                <p className="text-xs text-gray-500">AI Suggestions</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Schedule Setup */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          {/* Info Card */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-purple-100 rounded-xl">
                <Lightbulb className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900">Set Up Your Weekly Schedule</h3>
                <p className="text-sm text-purple-700 mt-1">
                  Add your recurring commitments like classes and study blocks. The AI uses this to find the best times for your assignments.
                </p>
              </div>
            </div>
          </div>

          {/* Add Block Button */}
          <button
            onClick={() => setShowAddBlock(true)}
            className="flex items-center gap-3 px-5 py-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50/50 transition-all w-full justify-center group"
          >
            <div className="p-2 bg-gray-100 rounded-xl group-hover:bg-purple-100 transition-colors">
              <Plus className="h-5 w-5" />
            </div>
            <span className="font-medium">Add Time Block</span>
          </button>

          {/* Add Block Form */}
          {showAddBlock && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-lg">New Time Block</h3>
                <button
                  onClick={() => setShowAddBlock(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
                  <select
                    value={newBlock.day_of_week}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  >
                    {DAY_NAMES.map((day, i) => (
                      <option key={i} value={i}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={newBlock.block_type}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, block_type: e.target.value as ScheduleBlockType }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  >
                    {BLOCK_TYPES.map(bt => (
                      <option key={bt.value} value={bt.value}>{bt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={newBlock.available_start}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, available_start: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input
                    type="time"
                    value={newBlock.available_end}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, available_end: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Label (optional)</label>
                  <input
                    type="text"
                    value={newBlock.label}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g., Math Class, Study Hall"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location (optional)</label>
                  <input
                    type="text"
                    value={newBlock.location}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Home, Library, Room 101"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAddBlock(false)}
                  className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addScheduleBlock}
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium transition-colors shadow-sm"
                >
                  Add Block
                </button>
              </div>
            </div>
          )}

          {/* Schedule Grid by Day */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {DAY_NAMES.map((day, dayIndex) => {
              const dayBlocks = scheduleBlocks.filter(b => b.day_of_week === dayIndex);
              const isWeekend = dayIndex === 0 || dayIndex === 6;
              
              return (
                <div 
                  key={day} 
                  className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                    dayBlocks.length > 0 
                      ? 'border-gray-200 shadow-sm' 
                      : 'border-gray-100'
                  }`}
                >
                  <div className={`px-4 py-3 border-b ${
                    isWeekend ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <h3 className={`font-semibold ${isWeekend ? 'text-purple-900' : 'text-gray-900'}`}>
                      {day}
                    </h3>
                  </div>
                  <div className="p-3 min-h-[100px]">
                    {dayBlocks.length === 0 ? (
                      <p className="text-sm text-gray-400 italic text-center py-6">No blocks</p>
                    ) : (
                      <div className="space-y-2">
                        {dayBlocks.map(block => {
                          const config = getBlockTypeConfig(block.block_type);
                          const Icon = config.icon;
                          
                          return (
                            <div
                              key={block.id}
                              className={`group flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-sm ${config.color}`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-1.5 bg-white/50 rounded-lg">
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{block.label || config.label}</p>
                                  <p className="text-xs opacity-75">
                                    {formatTime(block.available_start)} - {formatTime(block.available_end)}
                                  </p>
                                  {block.location && (
                                    <p className="text-xs opacity-75 flex items-center gap-1 mt-0.5">
                                      <MapPin className="h-3 w-3" /> {block.location}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => deleteScheduleBlock(block.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      {activeTab === 'suggestions' && (
        <div className="space-y-6">
          {/* AI Insights */}
          {aiInsights && (
            <div className="bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 rounded-2xl p-6 shadow-xl shadow-purple-500/20">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Lightbulb className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">AI Study Insights</h3>
                  <p className="text-purple-100 mt-2 leading-relaxed">{aiInsights}</p>
                </div>
              </div>
            </div>
          )}

          {suggestions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
              <div className="w-16 h-16 mx-auto bg-purple-50 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Suggestions Yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Let the AI analyze your assignments and availability to create an optimized study schedule.
              </p>
              <button
                onClick={generateSchedule}
                disabled={generating || scheduleBlocks.length === 0}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 font-medium shadow-lg shadow-purple-500/25 transition-all"
              >
                <Sparkles className="h-5 w-5" />
                Generate AI Schedule
              </button>
            </div>
          ) : (
            <>
              {/* Header with bulk actions */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {suggestions.length} Suggestion{suggestions.length !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-gray-500">Review and accept tasks to add them to your schedule</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkAction('acceptAll')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 font-medium shadow-sm transition-colors"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Accept All
                  </button>
                  <button
                    onClick={() => handleBulkAction('dismissAll')}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                    Clear All
                  </button>
                </div>
              </div>

              {/* Suggestions Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {suggestions.map(suggestion => (
                  <div
                    key={suggestion.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                  >
                    {/* Gradient top bar */}
                    <div className="h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
                    
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Badge */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                              <Sparkles className="h-3.5 w-3.5" />
                              AI Suggested
                            </span>
                            {suggestion.assignment?.priority && (
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                suggestion.assignment.priority === 'high' 
                                  ? 'bg-rose-50 text-rose-600'
                                  : suggestion.assignment.priority === 'medium'
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-emerald-50 text-emerald-600'
                              }`}>
                                {suggestion.assignment.priority.charAt(0).toUpperCase() + suggestion.assignment.priority.slice(1)}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h4 className="font-semibold text-gray-900 text-lg mb-1">
                            {suggestion.assignment?.title || 'Study Session'}
                          </h4>
                          
                          {/* Course */}
                          {suggestion.assignment?.course && (
                            <p className="text-sm text-gray-500 mb-3">{suggestion.assignment.course.name}</p>
                          )}

                          {/* Date & Time */}
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <span className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {new Date(suggestion.suggested_date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <span className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                              <Clock className="h-4 w-4 text-gray-400" />
                              {formatTime(suggestion.suggested_start)} - {formatTime(suggestion.suggested_end)}
                            </span>
                          </div>

                          {/* Reason */}
                          {suggestion.reason && (
                            <p className="text-sm text-gray-500 mt-4 italic border-l-2 border-purple-200 pl-3">
                              &ldquo;{suggestion.reason}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleSuggestionAction(suggestion.id, 'accept')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 font-medium transition-colors"
                        >
                          <Check className="h-4 w-4" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleSuggestionAction(suggestion.id, 'dismiss')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-medium transition-colors"
                        >
                          <X className="h-4 w-4" />
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
