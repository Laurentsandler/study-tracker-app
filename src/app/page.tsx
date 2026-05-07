import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Calendar,
  Camera,
  Clock,
  Mic,
  RefreshCw,
  Sparkles,
  Star,
  Users,
  Zap,
} from 'lucide-react';

const featureCards = [
  {
    title: 'Capture Assignments',
    icon: Camera,
    color: 'from-cyan-500 to-blue-600',
    text: 'Snap syllabi or whiteboards and convert them into clean, organized tasks.',
  },
  {
    title: 'AI Study Materials',
    icon: Brain,
    color: 'from-violet-500 to-indigo-600',
    text: 'Turn your class content into notes, flashcards, and exam prep in seconds.',
  },
  {
    title: 'Smart Scheduling',
    icon: Calendar,
    color: 'from-emerald-500 to-teal-600',
    text: 'Get an adaptive study plan that respects deadlines and your free time.',
  },
  {
    title: 'Voice Input',
    icon: Mic,
    color: 'from-amber-500 to-orange-500',
    text: 'Speak your tasks naturally and let StudyTracker transcribe and structure them.',
  },
  {
    title: 'Deadline Radar',
    icon: Clock,
    color: 'from-rose-500 to-pink-600',
    text: 'Catch upcoming due dates early with intelligent priority awareness.',
  },
  {
    title: 'Live Sync',
    icon: RefreshCw,
    color: 'from-sky-500 to-cyan-500',
    text: 'Stay in sync across phone, tablet, and desktop with real-time updates.',
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[110px] neo-orbit" />
        <div className="absolute top-48 -left-16 h-[320px] w-[320px] rounded-full bg-violet-500/20 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-blue-500/20 blur-[110px]" />
      </div>

      <header className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <nav className="container mx-auto flex items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-cyan-300/40 bg-cyan-400/20 p-2">
              <BookOpen className="h-6 w-6 text-cyan-200" />
            </div>
            <span className="text-2xl font-black tracking-tight">StudyTracker</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-xl border border-white/20 px-4 py-2 font-semibold hover:bg-white/10">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 font-bold text-slate-950 transition hover:brightness-110"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative container mx-auto px-4 pb-10 pt-16 md:pt-24">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 animate-fade-in">
            <Sparkles className="h-4 w-4" />
            Your AI Study Copilot
          </div>
          <h1 className="animate-fade-in-delay text-4xl font-black leading-tight md:text-6xl">
            Build a
            <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-transparent"> futuristic study workflow</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl animate-fade-in-delay-2 text-lg text-slate-300">
            Plan assignments, generate materials, and auto-schedule deep work in one immersive dashboard.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row animate-fade-in-delay-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-8 py-4 font-bold text-slate-950 transition hover:brightness-110"
            >
              Launch Workspace
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center rounded-xl border border-white/20 px-8 py-4 font-semibold hover:bg-white/10">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      <section className="relative container mx-auto px-4 pb-6">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3 text-sm">
          <div className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-semibold text-slate-200">
            <Users className="mr-2 inline h-4 w-4 text-cyan-300" /> 1000+ students
          </div>
          <div className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-semibold text-slate-200">
            <Star className="mr-2 inline h-4 w-4 text-amber-300" /> 4.9/5 rated
          </div>
          <div className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-semibold text-slate-200">
            <Zap className="mr-2 inline h-4 w-4 text-emerald-300" /> AI-powered planning
          </div>
        </div>
      </section>

      <section className="relative container mx-auto px-4 py-16">
        <h2 className="text-center text-3xl font-black md:text-4xl">Everything in one intelligent cockpit</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-slate-300">
          StudyTracker blends assignment capture, AI generation, and adaptive planning into a single futuristic experience.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map(({ title, icon: Icon, color, text }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/10">
              <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-r ${color} p-3`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="mt-2 text-slate-300">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative container mx-auto px-4 pb-20">
        <div className="rounded-3xl border border-cyan-200/20 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-violet-500/20 p-8 text-center backdrop-blur-xl md:p-12">
          <h2 className="text-3xl font-black md:text-4xl">Ready for a smarter semester?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-200">
            Start free and let AI handle the planning while you focus on learning faster.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-black text-slate-900 transition hover:bg-cyan-100"
          >
            Start Free Today
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </main>
  );
}
