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
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import Banner from '@/components/Banner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; full_name: string } | null>(null);

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
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'bg-violet-300' },
    { href: '/dashboard/assignments', label: 'Assignments', icon: ClipboardList, color: 'bg-sky-300' },
    { href: '/dashboard/shared-courses', label: 'Shared Courses', icon: Users, color: 'bg-cyan-300' },
    { href: '/dashboard/worklogs', label: 'Work Logs', icon: FileText, color: 'bg-amber-300' },
    { href: '/dashboard/study', label: 'Help Me Study', icon: Sparkles, color: 'bg-pink-300' },
    { href: '/dashboard/schedule', label: 'Schedule', icon: Calendar, color: 'bg-emerald-300' },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white border-r-4 border-black z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b-4 border-black bg-violet-400">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="p-2 bg-white border-3 border-black rounded-xl" style={{ boxShadow: '3px 3px 0 0 #000' }}>
              <BookOpen className="h-6 w-6 text-black" />
            </div>
            <span className="text-xl font-black text-black">StudyTracker</span>
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
                className={`flex items-center gap-3 px-4 py-3 font-bold border-3 border-black rounded-xl transition-all ${
                  active 
                    ? `${item.color}` 
                    : 'bg-white hover:translate-x-1'
                }`}
                style={{ 
                  boxShadow: active ? '4px 4px 0 0 #000' : '3px 3px 0 0 #000',
                }}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t-4 border-black bg-gray-100">
          <div className="flex items-center gap-3 mb-4 p-3 bg-white border-3 border-black rounded-xl" style={{ boxShadow: '3px 3px 0 0 #000' }}>
            <div className="w-10 h-10 bg-amber-300 border-3 border-black rounded-lg flex items-center justify-center font-black">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-black truncate">
                {user?.full_name}
              </p>
              <p className="text-xs text-gray-600 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-300 border-3 border-black rounded-xl font-bold transition-all hover:translate-y-0.5"
            style={{ boxShadow: '3px 3px 0 0 #000' }}
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="bg-white border-b-4 border-black sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 bg-violet-300 border-3 border-black rounded-xl font-bold"
              style={{ boxShadow: '3px 3px 0 0 #000' }}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <div className="p-1.5 bg-violet-300 border-2 border-black rounded-lg">
                <BookOpen className="h-5 w-5 text-black" />
              </div>
              <span className="font-black text-black">StudyTracker</span>
            </div>
            <div className="w-8 lg:hidden" />
          </div>
        </header>

        {/* Banner */}
        <Banner />

        {/* Page content */}
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
