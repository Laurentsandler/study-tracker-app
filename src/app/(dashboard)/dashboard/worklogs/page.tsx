'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  FileText, 
  BookOpen, 
  ClipboardList, 
  GraduationCap,
  FlaskConical,
  FolderOpen,
  Calendar,
  Search,
  Filter,
  Image as ImageIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Worklog, WorklogType } from '@/types';

const worklogTypeIcons: Record<WorklogType, typeof FileText> = {
  classwork: ClipboardList,
  homework: BookOpen,
  notes: FileText,
  quiz: GraduationCap,
  test: GraduationCap,
  project: FlaskConical,
  other: FolderOpen,
};

const worklogTypeLabels: Record<WorklogType, string> = {
  classwork: 'Classwork',
  homework: 'Homework',
  notes: 'Notes',
  quiz: 'Quiz',
  test: 'Test',
  project: 'Project',
  other: 'Other',
};

const worklogTypeColors: Record<WorklogType, string> = {
  classwork: 'bg-cyan-300 text-black border-2 border-black',
  homework: 'bg-violet-300 text-black border-2 border-black',
  notes: 'bg-emerald-300 text-black border-2 border-black',
  quiz: 'bg-yellow-300 text-black border-2 border-black',
  test: 'bg-rose-300 text-black border-2 border-black',
  project: 'bg-indigo-300 text-black border-2 border-black',
  other: 'bg-gray-300 text-black border-2 border-black',
};

export default function WorklogsPage() {
  const [worklogs, setWorklogs] = useState<Worklog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<WorklogType | 'all'>('all');

  useEffect(() => {
    fetchWorklogs();
  }, []);

  const fetchWorklogs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/worklogs', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWorklogs(data.worklogs || []);
      }
    } catch (error) {
      console.error('Error fetching worklogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorklogs = worklogs.filter(worklog => {
    const matchesSearch = 
      worklog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worklog.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worklog.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || worklog.worklog_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-yellow-300" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-black">📋 Work Logs</h1>
          <p className="text-gray-700 mt-1 font-medium">
            Track all your classwork, homework, and notes
          </p>
        </div>
        <Link
          href="/dashboard/worklogs/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-300 text-black font-bold border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Log Work</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black" />
          <input
            type="text"
            placeholder="Search worklogs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-3 border-black bg-white text-black placeholder-gray-500 font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as WorklogType | 'all')}
            className="pl-12 pr-8 py-3 border-3 border-black appearance-none bg-white text-black font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300 cursor-pointer"
          >
            <option value="all">All Types</option>
            {Object.entries(worklogTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Worklogs Grid */}
      {filteredWorklogs.length === 0 ? (
        <div className="text-center py-12 bg-white border-3 border-black shadow-[4px_4px_0_0_#000]">
          <FileText className="w-12 h-12 text-black mx-auto mb-4" />
          <h3 className="text-lg font-bold text-black mb-2">
            {worklogs.length === 0 ? 'No work logged yet' : 'No matching worklogs'}
          </h3>
          <p className="text-gray-700 mb-4 font-medium">
            {worklogs.length === 0
              ? 'Start logging your classwork and homework to keep track of everything.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {worklogs.length === 0 && (
            <Link
              href="/dashboard/worklogs/new"
              className="inline-flex items-center gap-2 px-5 py-3 bg-yellow-300 text-black font-bold border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>Log Your First Work</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWorklogs.map((worklog) => {
            const TypeIcon = worklogTypeIcons[worklog.worklog_type];
            return (
              <Link
                key={worklog.id}
                href={`/dashboard/worklogs/${worklog.id}`}
                className="bg-white border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all overflow-hidden"
              >
                {/* Image Preview */}
                {worklog.image_url ? (
                  <div className="aspect-video bg-gray-200 relative border-b-3 border-black">
                    <img
                      src={worklog.image_url}
                      alt={worklog.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-200 flex items-center justify-center border-b-3 border-black">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                
                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-black line-clamp-1">
                      {worklog.title}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold ${worklogTypeColors[worklog.worklog_type]}`}>
                      <TypeIcon className="w-3 h-3" />
                      {worklogTypeLabels[worklog.worklog_type]}
                    </span>
                  </div>
                  
                  {worklog.topic && (
                    <p className="text-sm font-bold text-violet-600 mb-1">
                      {worklog.topic}
                    </p>
                  )}
                  
                  {worklog.description && (
                    <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                      {worklog.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(worklog.date_completed)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
