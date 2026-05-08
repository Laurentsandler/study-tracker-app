'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  BookOpen,
  LayoutDashboard,
  ClipboardList,
  Calendar,
  Camera,
  Settings,
  LogOut,
  Menu,
  X,
  FileText,
  Sparkles,
  Users,
  Moon,
  Sun,
  Search,
  Command,
  GraduationCap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import Banner from '@/components/Banner';
import CommandPalette from '@/components/CommandPalette';
import { useTheme } from '@/components/ui/ThemeProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; full_name: string } | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser({
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email || '',
      });
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'from-violet-500 to-indigo-600' },
    { href: '/dashboard/assignments', label: 'Assignments', icon: ClipboardList, color: 'from-sky-500 to-cyan-600' },
    { href: '/dashboard/shared-courses', label: 'Shared Courses', icon: Users, color: 'from-cyan-500 to-blue-600' },
    { href: '/dashboard/edx-courses', label: 'edX Tracker', icon: GraduationCap, color: 'from-indigo-500 to-blue-600' },
    { href: '/dashboard/worklogs', label: 'Work Logs', icon: FileText, color: 'from-amber-500 to-orange-600' },
    { href: '/dashboard/study', label: 'Help Me Study', icon: Sparkles, color: 'from-pink-500 to-rose-600' },
    { href: '/dashboard/schedule', label: 'Schedule', icon: Calendar, color: 'from-emerald-500 to-teal-600' },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Command Palette */}
      <CommandPalette />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 border-r border-white/10 bg-white/70 backdrop-blur-xl transition-transform duration-300 dark:bg-slate-900/75 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="border-b border-white/15 bg-gradient-to-r from-sky-500 to-violet-600 p-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="rounded-xl border border-white/30 bg-white/20 p-2 backdrop-blur">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-black text-white">StudyTracker</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-3">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 font-semibold transition-all ${
                  active 
                    ? `bg-gradient-to-r ${item.color} border-transparent text-white shadow-lg shadow-blue-500/25`
                    : 'border-slate-300/80 bg-white/80 text-slate-700 hover:translate-x-1 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-200'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/15 bg-slate-100/80 p-4 dark:bg-slate-900/85">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/90 px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-300 bg-white/90 p-3 dark:border-slate-700 dark:bg-slate-900/80">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-400 to-violet-500 font-black text-slate-950">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {user?.full_name}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-3 font-semibold text-white transition hover:brightness-110"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-white/70 backdrop-blur-xl dark:bg-slate-950/75">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-white/20 bg-gradient-to-r from-violet-500 to-cyan-500 p-2 font-bold text-white lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Search hint - desktop */}
             <div className="hidden cursor-pointer items-center gap-2 rounded-xl border border-slate-300/80 bg-white/70 px-4 py-2 transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-900 lg:flex"
               onClick={() => {
                 document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
               }}
             >
               <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
               <span className="text-sm font-medium text-slate-400 dark:text-slate-500">Search...</span>
               <kbd className="ml-8 flex items-center gap-0.5 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                 <Command className="h-3 w-3" />K
               </kbd>
             </div>

            <div className="lg:hidden flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-r from-cyan-400 to-violet-500 p-1.5">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="font-black text-slate-800 dark:text-white">StudyTracker</span>
            </div>
            <div className="w-8 lg:hidden" />
          </div>
        </header>

        {/* Banner */}
        <Banner />

        {/* Page content */}
        <main className="p-6 lg:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
