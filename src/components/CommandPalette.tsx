'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  ClipboardList,
  Calendar,
  FileText,
  Sparkles,
  Users,
  Plus,
  ArrowRight,
  Command,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commands: CommandItem[] = [
    {
      id: 'dashboard',
      label: 'Go to Dashboard',
      description: 'View your study overview',
      icon: <LayoutDashboard className="h-4 w-4" />,
      action: () => router.push('/dashboard'),
      keywords: ['home', 'main', 'overview'],
    },
    {
      id: 'assignments',
      label: 'View Assignments',
      description: 'Manage your assignments',
      icon: <ClipboardList className="h-4 w-4" />,
      action: () => router.push('/dashboard/assignments'),
      keywords: ['tasks', 'homework', 'work'],
    },
    {
      id: 'new-assignment',
      label: 'New Assignment',
      description: 'Create a new assignment',
      icon: <Plus className="h-4 w-4" />,
      action: () => router.push('/dashboard/assignments/new'),
      keywords: ['create', 'add', 'task'],
    },
    {
      id: 'schedule',
      label: 'View Schedule',
      description: 'Check your study schedule',
      icon: <Calendar className="h-4 w-4" />,
      action: () => router.push('/dashboard/schedule'),
      keywords: ['plan', 'calendar', 'timetable'],
    },
    {
      id: 'study',
      label: 'Help Me Study',
      description: 'AI-powered study materials',
      icon: <Sparkles className="h-4 w-4" />,
      action: () => router.push('/dashboard/study'),
      keywords: ['ai', 'learn', 'notes', 'flashcards', 'quiz'],
    },
    {
      id: 'worklogs',
      label: 'Work Logs',
      description: 'View and create work logs',
      icon: <FileText className="h-4 w-4" />,
      action: () => router.push('/dashboard/worklogs'),
      keywords: ['log', 'record', 'notes'],
    },
    {
      id: 'shared-courses',
      label: 'Shared Courses',
      description: 'Collaborate with classmates',
      icon: <Users className="h-4 w-4" />,
      action: () => router.push('/dashboard/shared-courses'),
      keywords: ['collaborate', 'group', 'team', 'class'],
    },
  ];

  const filtered = query.length === 0
    ? commands
    : commands.filter(cmd => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.keywords?.some(k => k.includes(q))
        );
      });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(prev => !prev);
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-800 border-3 border-black dark:border-gray-600 rounded-xl overflow-hidden animate-scale-in"
        style={{ boxShadow: '8px 8px 0 0 #000' }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b-3 border-black dark:border-gray-600">
          <Search className="h-5 w-5 text-gray-400 dark:text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search commands..."
            className="flex-1 text-lg font-medium bg-transparent outline-none text-black dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-bold bg-gray-100 dark:bg-gray-700 border-2 border-black dark:border-gray-600 rounded text-gray-600 dark:text-gray-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 font-medium">No results found</p>
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  setOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  i === selectedIndex
                    ? 'bg-violet-100 dark:bg-violet-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className={`p-2 border-2 border-black dark:border-gray-600 rounded-lg ${
                  i === selectedIndex ? 'bg-violet-300 dark:bg-violet-600' : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {cmd.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-black dark:text-gray-100 truncate">{cmd.label}</p>
                  {cmd.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{cmd.description}</p>
                  )}
                </div>
                {i === selectedIndex && (
                  <ArrowRight className="h-4 w-4 text-violet-500 dark:text-violet-400 shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t-3 border-black dark:border-gray-600 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs font-bold text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-[10px]">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-[10px]">↵</kbd>
              Select
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400">
            <Command className="h-3 w-3" />
            <span>K to toggle</span>
          </div>
        </div>
      </div>
    </div>
  );
}
