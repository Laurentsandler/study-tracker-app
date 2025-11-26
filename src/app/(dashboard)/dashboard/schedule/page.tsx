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
          <p className="text-gray-500">Set up your availability and let AI plan your study time</p>
        </div>
        <button
          onClick={generateSchedule}
          disabled={generating || scheduleBlocks.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'calendar'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar className="h-4 w-4 inline mr-2" />
          Calendar
        </button>
        <button
          onClick={() => setActiveTab('setup')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'setup'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="h-4 w-4 inline mr-2" />
          Weekly Schedule
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors relative ${
            activeTab === 'suggestions'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Lightbulb className="h-4 w-4 inline mr-2" />
          AI Suggestions
          {suggestions.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center">
              {suggestions.length}
            </span>
          )}
        </button>
      </div>

      {/* Calendar View */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Week Navigation */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h3 className="font-semibold text-gray-900">
              {currentWeekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - 
              {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </h3>
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Legend */}
          {suggestions.length > 0 && (
            <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 flex items-center gap-4 text-xs">
              <span className="text-purple-700 font-medium">Legend:</span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-purple-200 border-2 border-dashed border-purple-400"></span>
                AI Suggestion (click to accept)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-purple-100 border border-purple-200"></span>
                Scheduled Task
              </span>
            </div>
          )}

          {/* Week Grid */}
          <div className="grid grid-cols-7 divide-x divide-gray-200">
            {getWeekDates().map((date, i) => {
              const dateStr = date.toISOString().split('T')[0];
              const dayTasks = plannedTasks.filter(
                t => t.scheduled_date === dateStr
              );
              const dayBlocks = scheduleBlocks.filter(b => b.day_of_week === date.getDay());
              const daySuggestions = suggestions.filter(s => s.suggested_date === dateStr);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div key={i} className="min-h-[200px]">
                  <div className={`p-2 text-center border-b ${isToday ? 'bg-purple-50' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500">{SHORT_DAY_NAMES[date.getDay()]}</p>
                    <p className={`text-lg font-semibold ${isToday ? 'text-purple-600' : 'text-gray-900'}`}>
                      {date.getDate()}
                    </p>
                  </div>
                  <div className="p-2 space-y-2">
                    {/* Schedule blocks (faded) */}
                    {dayBlocks.map(block => {
                      const config = getBlockTypeConfig(block.block_type);
                      return (
                        <div
                          key={block.id}
                          className={`text-xs p-1.5 rounded border ${config.color} opacity-50`}
                        >
                          <p className="font-medium truncate">{block.label || config.label}</p>
                          <p className="text-[10px]">{formatTime(block.available_start)}</p>
                        </div>
                      );
                    })}
                    {/* Planned tasks */}
                    {dayTasks.map(task => (
                      <div
                        key={task.id}
                        className={`text-xs p-1.5 rounded border cursor-pointer transition-all ${
                          task.completed
                            ? 'bg-green-50 border-green-200 line-through opacity-60'
                            : task.ai_generated
                              ? 'bg-purple-50 border-purple-200'
                              : 'bg-blue-50 border-blue-200'
                        }`}
                        onClick={() => toggleTaskComplete(task)}
                      >
                        <div className="flex items-start justify-between">
                          <p className="font-medium truncate flex-1">
                            {task.assignment?.title || task.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTask(task.id);
                            }}
                            className="text-gray-400 hover:text-red-500 ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-500">
                          {formatTime(task.scheduled_start)} - {formatTime(task.scheduled_end)}
                        </p>
                        {task.ai_generated && (
                          <Sparkles className="h-3 w-3 text-purple-500 mt-1" />
                        )}
                      </div>
                    ))}
                    {/* AI Suggestions (pending - shown as dashed) */}
                    {daySuggestions.map(suggestion => (
                      <div
                        key={suggestion.id}
                        className="text-xs p-1.5 rounded border-2 border-dashed border-purple-300 bg-purple-50/50 cursor-pointer hover:bg-purple-100 hover:border-purple-400 transition-all group"
                        onClick={() => handleSuggestionAction(suggestion.id, 'accept')}
                        title="Click to accept this suggestion"
                      >
                        <div className="flex items-start justify-between">
                          <p className="font-medium truncate flex-1 text-purple-700">
                            {suggestion.assignment?.title || 'Study'}
                          </p>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSuggestionAction(suggestion.id, 'accept');
                              }}
                              className="text-green-600 hover:text-green-700"
                              title="Accept"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSuggestionAction(suggestion.id, 'dismiss');
                              }}
                              className="text-red-500 hover:text-red-600"
                              title="Dismiss"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-purple-600">
                          {formatTime(suggestion.suggested_start)} - {formatTime(suggestion.suggested_end)}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Sparkles className="h-3 w-3 text-purple-500" />
                          <span className="text-[9px] text-purple-500 font-medium">AI Suggested</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions Bar */}
          {suggestions.length > 0 && (
            <div className="p-3 bg-purple-50 border-t border-purple-100 flex items-center justify-between">
              <p className="text-sm text-purple-700">
                <Sparkles className="h-4 w-4 inline mr-1" />
                {suggestions.length} AI suggestion{suggestions.length !== 1 ? 's' : ''} pending
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkAction('acceptAll')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium"
                >
                  <Check className="h-3 w-3" />
                  Accept All
                </button>
                <button
                  onClick={() => handleBulkAction('dismissAll')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-xs font-medium"
                >
                  <X className="h-3 w-3" />
                  Dismiss All
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weekly Schedule Setup */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          {/* Info Card */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-purple-900">Set Up Your Weekly Schedule</h3>
                <p className="text-sm text-purple-700 mt-1">
                  Add your recurring weekly commitments (classes, study periods, free time). 
                  The AI will use this to suggest optimal times for working on assignments.
                </p>
              </div>
            </div>
          </div>

          {/* Add Block Button */}
          <button
            onClick={() => setShowAddBlock(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 transition-colors w-full justify-center"
          >
            <Plus className="h-5 w-5" />
            <span>Add Time Block</span>
          </button>

          {/* Add Block Form */}
          {showAddBlock && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">New Time Block</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                  <select
                    value={newBlock.day_of_week}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    {DAY_NAMES.map((day, i) => (
                      <option key={i} value={i}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newBlock.block_type}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, block_type: e.target.value as ScheduleBlockType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  >
                    {BLOCK_TYPES.map(bt => (
                      <option key={bt.value} value={bt.value}>{bt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newBlock.available_start}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, available_start: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newBlock.available_end}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, available_end: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label (optional)</label>
                  <input
                    type="text"
                    value={newBlock.label}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g., Math Class, Study Hall"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
                  <input
                    type="text"
                    value={newBlock.location}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Home, Library, Room 101"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAddBlock(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={addScheduleBlock}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Add Block
                </button>
              </div>
            </div>
          )}

          {/* Schedule Grid by Day */}
          <div className="space-y-4">
            {DAY_NAMES.map((day, dayIndex) => {
              const dayBlocks = scheduleBlocks.filter(b => b.day_of_week === dayIndex);
              
              return (
                <div key={day} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">{day}</h3>
                  </div>
                  <div className="p-4">
                    {dayBlocks.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No time blocks set</p>
                    ) : (
                      <div className="space-y-2">
                        {dayBlocks.map(block => {
                          const config = getBlockTypeConfig(block.block_type);
                          const Icon = config.icon;
                          
                          return (
                            <div
                              key={block.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${config.color}`}
                            >
                              <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5" />
                                <div>
                                  <p className="font-medium">{block.label || config.label}</p>
                                  <p className="text-sm opacity-75">
                                    {formatTime(block.available_start)} - {formatTime(block.available_end)}
                                    {block.location && (
                                      <span className="ml-2">
                                        <MapPin className="h-3 w-3 inline" /> {block.location}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => deleteScheduleBlock(block.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
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
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Sparkles className="h-6 w-6 text-purple-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-purple-900">AI Study Insights</h3>
                  <p className="text-purple-800 mt-2">{aiInsights}</p>
                </div>
              </div>
            </div>
          )}

          {suggestions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Suggestions</h3>
              <p className="text-gray-500 mb-4">
                Click &ldquo;AI Schedule&rdquo; to generate study time suggestions based on your assignments and availability.
              </p>
              <button
                onClick={generateSchedule}
                disabled={generating || scheduleBlocks.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Sparkles className="h-5 w-5" />
                Generate Schedule
              </button>
            </div>
          ) : (
            <>
              {/* Bulk Actions */}
              <div className="flex items-center justify-between">
                <p className="text-gray-600">{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} pending</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkAction('acceptAll')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                  >
                    <Check className="h-4 w-4" />
                    Accept All
                  </button>
                  <button
                    onClick={() => handleBulkAction('dismissAll')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                  >
                    <XCircle className="h-4 w-4" />
                    Dismiss All
                  </button>
                </div>
              </div>

              {/* Suggestions List */}
              <div className="space-y-3">
                {suggestions.map(suggestion => (
                  <div
                    key={suggestion.id}
                    className="bg-white rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-purple-500" />
                          <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                            AI Suggested
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900">
                          {suggestion.assignment?.title || 'Study Session'}
                        </h3>
                        {suggestion.assignment?.course && (
                          <p className="text-sm text-gray-500">{suggestion.assignment.course.name}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(suggestion.suggested_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTime(suggestion.suggested_start)} - {formatTime(suggestion.suggested_end)}
                          </span>
                        </div>
                        {suggestion.reason && (
                          <p className="text-sm text-gray-500 mt-2 italic">&ldquo;{suggestion.reason}&rdquo;</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleSuggestionAction(suggestion.id, 'accept')}
                          className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                          title="Accept"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleSuggestionAction(suggestion.id, 'dismiss')}
                          className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                          title="Dismiss"
                        >
                          <X className="h-5 w-5" />
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
