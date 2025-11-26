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

const BLOCK_TYPES: { value: ScheduleBlockType; label: string; icon: any; color: string; bg: string }[] = [
  { value: 'class', label: 'Class', icon: GraduationCap, color: 'border-sky-400 bg-sky-200', bg: 'bg-sky-300' },
  { value: 'study', label: 'Study Time', icon: BookOpen, color: 'border-violet-400 bg-violet-200', bg: 'bg-violet-300' },
  { value: 'free', label: 'Free Time', icon: Coffee, color: 'border-emerald-400 bg-emerald-200', bg: 'bg-emerald-300' },
  { value: 'work', label: 'Work', icon: Briefcase, color: 'border-amber-400 bg-amber-200', bg: 'bg-amber-300' },
  { value: 'other', label: 'Other', icon: Clock, color: 'border-gray-400 bg-gray-200', bg: 'bg-gray-300' },
];

// Priority colors for tasks (Neo-Brutalism)
const PRIORITY_STYLES = {
  high: { bg: 'bg-rose-300', border: 'border-rose-500' },
  medium: { bg: 'bg-amber-300', border: 'border-amber-500' },
  low: { bg: 'bg-emerald-300', border: 'border-emerald-500' },
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-black">Schedule</h1>
          <p className="text-gray-600 font-medium">Manage your study time with AI-powered planning</p>
        </div>
        <button
          onClick={generateSchedule}
          disabled={generating || scheduleBlocks.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-violet-400 border-3 border-black rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:translate-y-0.5"
          style={{ boxShadow: '4px 4px 0 0 #000' }}
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
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-5 py-3 border-3 border-black rounded-xl font-bold transition-all ${
            activeTab === 'calendar'
              ? 'bg-violet-400'
              : 'bg-white hover:translate-y-0.5'
          }`}
          style={{ boxShadow: activeTab === 'calendar' ? '4px 4px 0 0 #000' : '3px 3px 0 0 #000' }}
        >
          <Calendar className="h-5 w-5" />
          Calendar
        </button>
        <button
          onClick={() => setActiveTab('setup')}
          className={`flex items-center gap-2 px-5 py-3 border-3 border-black rounded-xl font-bold transition-all ${
            activeTab === 'setup'
              ? 'bg-amber-400'
              : 'bg-white hover:translate-y-0.5'
          }`}
          style={{ boxShadow: activeTab === 'setup' ? '4px 4px 0 0 #000' : '3px 3px 0 0 #000' }}
        >
          <Clock className="h-5 w-5" />
          Weekly Setup
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex items-center gap-2 px-5 py-3 border-3 border-black rounded-xl font-bold transition-all relative ${
            activeTab === 'suggestions'
              ? 'bg-pink-400'
              : 'bg-white hover:translate-y-0.5'
          }`}
          style={{ boxShadow: activeTab === 'suggestions' ? '4px 4px 0 0 #000' : '3px 3px 0 0 #000' }}
        >
          <Lightbulb className="h-5 w-5" />
          AI Suggestions
          {suggestions.length > 0 && (
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-rose-400 border-2 border-black text-black text-xs rounded-lg flex items-center justify-center font-black">
              {suggestions.length}
            </span>
          )}
        </button>
      </div>

      {/* Calendar View */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          {/* Week Navigation Card */}
          <div className="bg-white border-3 border-black rounded-xl overflow-hidden" style={{ boxShadow: '5px 5px 0 0 #000' }}>
            <div className="flex items-center justify-between px-6 py-4 bg-sky-200 border-b-3 border-black">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-3 bg-white border-3 border-black rounded-xl font-bold transition-all hover:translate-y-0.5"
                style={{ boxShadow: '3px 3px 0 0 #000' }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <h3 className="text-xl font-black text-black">
                  {currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-sm font-bold text-black/70">
                  {currentWeekStart.toLocaleDateString('en-US', { day: 'numeric' })} - {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { day: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => navigateWeek('next')}
                className="p-3 bg-white border-3 border-black rounded-xl font-bold transition-all hover:translate-y-0.5"
                style={{ boxShadow: '3px 3px 0 0 #000' }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7">
              {getWeekDates().map((date, i) => {
                const isToday = date.toDateString() === new Date().toDateString();
                const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                
                return (
                  <div 
                    key={i} 
                    className={`py-4 text-center border-r-3 last:border-r-0 border-black ${
                      isToday ? 'bg-violet-300' : isPast ? 'bg-gray-100' : 'bg-white'
                    }`}
                  >
                    <p className={`text-xs font-black uppercase tracking-wide ${
                      isToday ? 'text-black' : 'text-gray-500'
                    }`}>
                      {SHORT_DAY_NAMES[date.getDay()]}
                    </p>
                    <div className={`mt-2 mx-auto w-10 h-10 flex items-center justify-center rounded-lg border-2 border-black ${
                      isToday 
                        ? 'bg-black text-white' 
                        : isPast 
                          ? 'bg-gray-200 text-gray-500' 
                          : 'bg-white text-black'
                    }`}>
                      <span className="text-sm font-black">{date.getDate()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Suggestions Banner */}
          {suggestions.length > 0 && (
            <div className="bg-violet-400 border-3 border-black rounded-xl p-5" style={{ boxShadow: '6px 6px 0 0 #000' }}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white border-3 border-black rounded-xl" style={{ boxShadow: '3px 3px 0 0 #000' }}>
                    <Zap className="h-6 w-6 text-black" />
                  </div>
                  <div>
                    <p className="text-black font-black text-lg">
                      {suggestions.length} AI Suggestion{suggestions.length !== 1 ? 's' : ''} Ready!
                    </p>
                    <p className="text-black/70 font-medium">Click on dashed cards to accept</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleBulkAction('acceptAll')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-400 border-3 border-black rounded-xl font-bold transition-all hover:translate-y-0.5"
                    style={{ boxShadow: '4px 4px 0 0 #000' }}
                  >
                    <CheckCheck className="h-5 w-5" />
                    Accept All
                  </button>
                  <button
                    onClick={() => handleBulkAction('dismissAll')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border-3 border-black rounded-xl font-bold transition-all hover:translate-y-0.5"
                    style={{ boxShadow: '4px 4px 0 0 #000' }}
                  >
                    <X className="h-5 w-5" />
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tasks Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
                  className={`min-h-[280px] border-3 border-black rounded-xl overflow-hidden flex flex-col ${
                    isToday 
                      ? 'bg-violet-100' 
                      : hasItems
                        ? 'bg-white'
                        : 'bg-gray-50'
                  }`}
                  style={{ boxShadow: isToday ? '5px 5px 0 0 #000' : '4px 4px 0 0 #000' }}
                >
                  {/* Day Header */}
                  <div className={`px-3 py-2 border-b-2 border-black text-center ${
                    isToday ? 'bg-violet-300' : 'bg-gray-100'
                  }`}>
                    <p className="text-xs font-black uppercase tracking-wide text-black">
                      {SHORT_DAY_NAMES[date.getDay()]}
                    </p>
                    <p className={`text-lg font-black ${isToday ? 'text-black' : 'text-gray-700'}`}>
                      {date.getDate()}
                    </p>
                  </div>

                  {/* Tasks Container */}
                  <div className="p-3 space-y-2 flex-1 overflow-y-auto">
                    {/* Planned tasks */}
                    {dayTasks.map(task => {
                      const priority = task.assignment?.priority || 'medium';
                      const styles = PRIORITY_STYLES[priority as keyof typeof PRIORITY_STYLES] || PRIORITY_STYLES.medium;
                      
                      return (
                        <div
                          key={task.id}
                          className={`group relative p-2.5 rounded-lg border-2 border-black cursor-pointer transition-all ${
                            task.completed
                              ? 'bg-gray-200 opacity-70'
                              : styles.bg
                          }`}
                          style={{ boxShadow: '2px 2px 0 0 #000' }}
                          onClick={() => toggleTaskComplete(task)}
                        >
                          {/* Task content */}
                          <div className="pr-5">
                            <p className={`text-xs font-bold leading-tight ${
                              task.completed ? 'line-through text-gray-500' : 'text-black'
                            }`}>
                              {task.assignment?.title || task.title}
                            </p>
                            <p className={`text-[10px] font-medium mt-1 ${
                              task.completed ? 'text-gray-500' : 'text-black/70'
                            }`}>
                              {formatTime(task.scheduled_start)}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                            {task.completed ? (
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTask(task.id);
                                }}
                                className="p-0.5 opacity-0 group-hover:opacity-100 bg-rose-400 border border-black rounded transition-all"
                              >
                                <Trash2 className="h-2.5 w-2.5 text-black" />
                              </button>
                            )}
                          </div>

                          {/* AI badge */}
                          {task.ai_generated && !task.completed && (
                            <div className="absolute -top-1 -left-1 p-0.5 bg-violet-400 border border-black rounded">
                              <Sparkles className="h-2.5 w-2.5 text-black" />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* AI Suggestions */}
                    {daySuggestions.map(suggestion => (
                      <div
                        key={suggestion.id}
                        className="group relative p-2.5 rounded-lg border-2 border-dashed border-violet-500 bg-violet-50 cursor-pointer hover:bg-violet-100 transition-all"
                        onClick={() => handleSuggestionAction(suggestion.id, 'accept')}
                      >
                        {/* AI badge */}
                        <div className="absolute -top-1.5 -right-1.5 p-1 bg-violet-500 border border-black rounded">
                          <Sparkles className="h-2.5 w-2.5 text-white" />
                        </div>

                        <p className="text-xs font-bold text-violet-800 leading-tight pr-3">
                          {suggestion.assignment?.title || 'Study Session'}
                        </p>
                        <p className="text-[10px] font-medium text-violet-600 mt-1">
                          {formatTime(suggestion.suggested_start)}
                        </p>

                        {/* Hover actions */}
                        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSuggestionAction(suggestion.id, 'accept');
                            }}
                            className="p-1 bg-emerald-400 border border-black rounded"
                            title="Accept"
                          >
                            <Check className="h-2.5 w-2.5 text-black" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSuggestionAction(suggestion.id, 'dismiss');
                            }}
                            className="p-1 bg-rose-400 border border-black rounded"
                            title="Dismiss"
                          >
                            <X className="h-2.5 w-2.5 text-black" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Empty state */}
                    {!hasItems && (
                      <div className="flex flex-col items-center justify-center h-full text-center py-6">
                        <div className="w-8 h-8 rounded-lg bg-gray-200 border-2 border-black flex items-center justify-center mb-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400">
                          {isPast ? 'No tasks' : 'Free'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-sky-300 border-3 border-black rounded-xl p-5 flex items-center gap-4" style={{ boxShadow: '4px 4px 0 0 #000' }}>
              <div className="p-3 bg-white border-3 border-black rounded-xl">
                <Calendar className="h-6 w-6 text-black" />
              </div>
              <div>
                <p className="text-3xl font-black text-black">{plannedTasks.length}</p>
                <p className="text-sm font-bold text-black/70">Scheduled</p>
              </div>
            </div>
            <div className="bg-emerald-300 border-3 border-black rounded-xl p-5 flex items-center gap-4" style={{ boxShadow: '4px 4px 0 0 #000' }}>
              <div className="p-3 bg-white border-3 border-black rounded-xl">
                <CheckCircle className="h-6 w-6 text-black" />
              </div>
              <div>
                <p className="text-3xl font-black text-black">
                  {plannedTasks.filter(t => t.completed).length}
                </p>
                <p className="text-sm font-bold text-black/70">Completed</p>
              </div>
            </div>
            <div className="bg-violet-300 border-3 border-black rounded-xl p-5 flex items-center gap-4" style={{ boxShadow: '4px 4px 0 0 #000' }}>
              <div className="p-3 bg-white border-3 border-black rounded-xl">
                <Sparkles className="h-6 w-6 text-black" />
              </div>
              <div>
                <p className="text-3xl font-black text-black">{suggestions.length}</p>
                <p className="text-sm font-bold text-black/70">AI Pending</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Schedule Setup */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          {/* Info Card */}
          <div className="bg-amber-200 border-3 border-black rounded-xl p-5" style={{ boxShadow: '5px 5px 0 0 #000' }}>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white border-3 border-black rounded-xl" style={{ boxShadow: '3px 3px 0 0 #000' }}>
                <Lightbulb className="h-6 w-6 text-black" />
              </div>
              <div>
                <h3 className="font-black text-black text-lg">Set Up Your Weekly Schedule</h3>
                <p className="text-black/70 font-medium mt-1">
                  Add your recurring commitments like classes and study blocks. The AI uses this to find the best times for your assignments.
                </p>
              </div>
            </div>
          </div>

          {/* Add Block Button */}
          <button
            onClick={() => setShowAddBlock(true)}
            className="flex items-center gap-3 px-6 py-5 bg-white border-3 border-dashed border-gray-400 rounded-xl w-full justify-center group hover:border-violet-500 hover:bg-violet-50 transition-all"
          >
            <div className="p-2 bg-gray-100 border-2 border-black rounded-lg group-hover:bg-violet-200 transition-colors">
              <Plus className="h-5 w-5" />
            </div>
            <span className="font-bold text-gray-600 group-hover:text-black">Add Time Block</span>
          </button>

          {/* Add Block Form */}
          {showAddBlock && (
            <div className="bg-white border-3 border-black rounded-xl p-6 space-y-5" style={{ boxShadow: '6px 6px 0 0 #000' }}>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-black text-xl">New Time Block</h3>
                <button
                  onClick={() => setShowAddBlock(false)}
                  className="p-2 bg-gray-100 border-2 border-black rounded-lg hover:bg-rose-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Day</label>
                  <select
                    value={newBlock.day_of_week}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                    className="neo-select"
                  >
                    {DAY_NAMES.map((day, i) => (
                      <option key={i} value={i}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Type</label>
                  <select
                    value={newBlock.block_type}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, block_type: e.target.value as ScheduleBlockType }))}
                    className="neo-select"
                  >
                    {BLOCK_TYPES.map(bt => (
                      <option key={bt.value} value={bt.value}>{bt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Start Time</label>
                  <input
                    type="time"
                    value={newBlock.available_start}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, available_start: e.target.value }))}
                    className="neo-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-2">End Time</label>
                  <input
                    type="time"
                    value={newBlock.available_end}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, available_end: e.target.value }))}
                    className="neo-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Label (optional)</label>
                  <input
                    type="text"
                    value={newBlock.label}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g., Math Class, Study Hall"
                    className="neo-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Location (optional)</label>
                  <input
                    type="text"
                    value={newBlock.location}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Home, Library, Room 101"
                    className="neo-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAddBlock(false)}
                  className="px-5 py-3 bg-gray-100 border-3 border-black rounded-xl font-bold transition-all hover:translate-y-0.5"
                  style={{ boxShadow: '3px 3px 0 0 #000' }}
                >
                  Cancel
                </button>
                <button
                  onClick={addScheduleBlock}
                  className="px-5 py-3 bg-emerald-400 border-3 border-black rounded-xl font-bold transition-all hover:translate-y-0.5"
                  style={{ boxShadow: '3px 3px 0 0 #000' }}
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
                  className="bg-white border-3 border-black rounded-xl overflow-hidden"
                  style={{ boxShadow: '4px 4px 0 0 #000' }}
                >
                  <div className={`px-4 py-3 border-b-3 border-black ${
                    isWeekend ? 'bg-violet-300' : 'bg-gray-100'
                  }`}>
                    <h3 className="font-black text-black">{day}</h3>
                  </div>
                  <div className="p-4 min-h-[120px]">
                    {dayBlocks.length === 0 ? (
                      <p className="text-sm font-bold text-gray-400 text-center py-8">No blocks</p>
                    ) : (
                      <div className="space-y-3">
                        {dayBlocks.map(block => {
                          const config = getBlockTypeConfig(block.block_type);
                          const Icon = config.icon;
                          
                          return (
                            <div
                              key={block.id}
                              className={`group flex items-center justify-between p-3 rounded-lg border-3 border-black ${config.bg}`}
                              style={{ boxShadow: '3px 3px 0 0 #000' }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-1.5 bg-white border-2 border-black rounded-lg">
                                  <Icon className="h-4 w-4 text-black" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-sm text-black truncate">{block.label || config.label}</p>
                                  <p className="text-xs font-medium text-black/70">
                                    {formatTime(block.available_start)} - {formatTime(block.available_end)}
                                  </p>
                                  {block.location && (
                                    <p className="text-xs font-medium text-black/60 flex items-center gap-1 mt-0.5">
                                      <MapPin className="h-3 w-3" /> {block.location}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => deleteScheduleBlock(block.id)}
                                className="p-1.5 bg-rose-300 border-2 border-black rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="h-4 w-4 text-black" />
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
            <div className="bg-pink-300 border-3 border-black rounded-xl p-6" style={{ boxShadow: '6px 6px 0 0 #000' }}>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white border-3 border-black rounded-xl" style={{ boxShadow: '3px 3px 0 0 #000' }}>
                  <Lightbulb className="h-6 w-6 text-black" />
                </div>
                <div>
                  <h3 className="font-black text-black text-xl">AI Study Insights</h3>
                  <p className="text-black/80 font-medium mt-2 leading-relaxed">{aiInsights}</p>
                </div>
              </div>
            </div>
          )}

          {suggestions.length === 0 ? (
            <div className="bg-white border-3 border-black rounded-xl p-16 text-center" style={{ boxShadow: '6px 6px 0 0 #000' }}>
              <div className="w-20 h-20 mx-auto bg-violet-200 border-3 border-black rounded-xl flex items-center justify-center mb-5" style={{ boxShadow: '4px 4px 0 0 #000' }}>
                <Sparkles className="h-10 w-10 text-black" />
              </div>
              <h3 className="text-2xl font-black text-black mb-3">No Suggestions Yet</h3>
              <p className="text-gray-600 font-medium mb-8 max-w-md mx-auto">
                Let the AI analyze your assignments and availability to create an optimized study schedule.
              </p>
              <button
                onClick={generateSchedule}
                disabled={generating || scheduleBlocks.length === 0}
                className="inline-flex items-center gap-2 px-8 py-4 bg-violet-400 border-3 border-black rounded-xl font-bold disabled:opacity-50 transition-all hover:translate-y-0.5"
                style={{ boxShadow: '5px 5px 0 0 #000' }}
              >
                <Sparkles className="h-5 w-5" />
                Generate AI Schedule
              </button>
            </div>
          ) : (
            <>
              {/* Header with bulk actions */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-black text-black">
                    {suggestions.length} Suggestion{suggestions.length !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-gray-600 font-medium">Review and accept tasks to add them to your schedule</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleBulkAction('acceptAll')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-400 border-3 border-black rounded-xl font-bold transition-all hover:translate-y-0.5"
                    style={{ boxShadow: '4px 4px 0 0 #000' }}
                  >
                    <CheckCheck className="h-5 w-5" />
                    Accept All
                  </button>
                  <button
                    onClick={() => handleBulkAction('dismissAll')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border-3 border-black rounded-xl font-bold transition-all hover:translate-y-0.5"
                    style={{ boxShadow: '4px 4px 0 0 #000' }}
                  >
                    <XCircle className="h-5 w-5" />
                    Clear All
                  </button>
                </div>
              </div>

              {/* Suggestions Grid */}
              <div className="grid gap-5 md:grid-cols-2">
                {suggestions.map(suggestion => (
                  <div
                    key={suggestion.id}
                    className="bg-white border-3 border-black rounded-xl overflow-hidden"
                    style={{ boxShadow: '5px 5px 0 0 #000' }}
                  >
                    {/* Color top bar */}
                    <div className="h-2 bg-violet-400" />
                    
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Badge */}
                          <div className="flex items-center gap-2 mb-4">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-black bg-violet-200 px-3 py-1.5 border-2 border-black rounded-lg">
                              <Sparkles className="h-3.5 w-3.5" />
                              AI Suggested
                            </span>
                            {suggestion.assignment?.priority && (
                              <span className={`text-xs font-bold px-3 py-1.5 border-2 border-black rounded-lg ${
                                suggestion.assignment.priority === 'high' 
                                  ? 'bg-rose-300'
                                  : suggestion.assignment.priority === 'medium'
                                    ? 'bg-amber-300'
                                    : 'bg-emerald-300'
                              }`}>
                                {suggestion.assignment.priority.charAt(0).toUpperCase() + suggestion.assignment.priority.slice(1)}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h4 className="font-black text-black text-xl mb-2">
                            {suggestion.assignment?.title || 'Study Session'}
                          </h4>
                          
                          {/* Course */}
                          {suggestion.assignment?.course && (
                            <p className="text-sm font-medium text-gray-600 mb-4">{suggestion.assignment.course.name}</p>
                          )}

                          {/* Date & Time */}
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="flex items-center gap-2 font-bold text-black bg-sky-200 px-3 py-2 border-2 border-black rounded-lg">
                              <Calendar className="h-4 w-4" />
                              {new Date(suggestion.suggested_date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <span className="flex items-center gap-2 font-bold text-black bg-amber-200 px-3 py-2 border-2 border-black rounded-lg">
                              <Clock className="h-4 w-4" />
                              {formatTime(suggestion.suggested_start)} - {formatTime(suggestion.suggested_end)}
                            </span>
                          </div>

                          {/* Reason */}
                          {suggestion.reason && (
                            <p className="text-sm text-gray-600 mt-4 italic border-l-4 border-violet-400 pl-3 font-medium">
                              &ldquo;{suggestion.reason}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 mt-6 pt-4 border-t-3 border-black">
                        <button
                          onClick={() => handleSuggestionAction(suggestion.id, 'accept')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-400 border-3 border-black rounded-xl font-bold transition-all hover:translate-y-0.5"
                          style={{ boxShadow: '3px 3px 0 0 #000' }}
                        >
                          <Check className="h-5 w-5" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleSuggestionAction(suggestion.id, 'dismiss')}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 border-3 border-black rounded-xl font-bold transition-all hover:translate-y-0.5"
                          style={{ boxShadow: '3px 3px 0 0 #000' }}
                        >
                          <X className="h-5 w-5" />
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
