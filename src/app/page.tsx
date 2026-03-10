import Link from 'next/link';
import { BookOpen, Camera, Calendar, Brain, Clock, Mic, ArrowRight, Sparkles, RefreshCw, Zap, Users, Star } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-yellow-100 dark:bg-[#1a1a2e]">
      {/* Header */}
      <header className="border-b-3 border-black dark:border-gray-700 bg-white dark:bg-gray-900">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-300 dark:bg-yellow-500 border-3 border-black dark:border-gray-600 shadow-[3px_3px_0_0_#000] rounded-xl">
              <BookOpen className="h-6 w-6" />
            </div>
            <span className="text-2xl font-black text-black dark:text-white">StudyTracker</span>
          </div>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="px-4 py-2 font-bold text-black dark:text-gray-200 hover:underline underline-offset-4"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-cyan-300 dark:bg-cyan-500 font-bold border-3 border-black dark:border-gray-600 rounded-xl shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] transition-all text-black"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-200 dark:bg-violet-700 border-3 border-black dark:border-gray-600 rounded-full mb-8 animate-fade-in">
            <Sparkles className="h-5 w-5 text-black dark:text-violet-200" />
            <span className="font-bold text-black dark:text-violet-200">AI-Powered Study Assistant</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-black dark:text-white mb-6 leading-tight animate-fade-in-delay">
            Your Smart
            <span className="bg-yellow-300 dark:bg-yellow-500 px-2 rounded-lg"> Study Companion</span>
          </h1>
          <p className="text-xl text-gray-700 dark:text-gray-300 font-medium max-w-2xl mx-auto mb-10 animate-fade-in-delay-2">
            Track assignments, capture materials, generate study guides, and let AI plan your perfect study schedule. All in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-delay-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-yellow-300 dark:bg-yellow-500 text-black font-black border-3 border-black dark:border-gray-600 rounded-xl shadow-[6px_6px_0_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_#000] transition-all"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 text-black dark:text-gray-200 font-bold border-3 border-black dark:border-gray-600 rounded-xl shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all"
            >
              I have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="container mx-auto px-4 pb-8">
        <div className="flex flex-wrap items-center justify-center gap-6 text-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-3 border-black dark:border-gray-600 rounded-xl shadow-[3px_3px_0_0_#000]">
            <Users className="h-5 w-5 text-violet-500" />
            <span className="font-bold text-black dark:text-gray-200">1000+ Students</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-3 border-black dark:border-gray-600 rounded-xl shadow-[3px_3px_0_0_#000]">
            <Star className="h-5 w-5 text-amber-500" />
            <span className="font-bold text-black dark:text-gray-200">4.9/5 Rating</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-3 border-black dark:border-gray-600 rounded-xl shadow-[3px_3px_0_0_#000]">
            <Zap className="h-5 w-5 text-emerald-500" />
            <span className="font-bold text-black dark:text-gray-200">AI-Powered</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-black text-center text-black dark:text-white mb-4">
          Everything You Need to Succeed
        </h2>
        <p className="text-gray-700 dark:text-gray-400 font-medium text-center mb-12 max-w-xl mx-auto">
          Powerful features designed to help you study smarter, not harder.
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-white dark:bg-gray-800 p-6 border-3 border-black dark:border-gray-600 rounded-xl shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all">
            <div className="w-14 h-14 bg-cyan-300 dark:bg-cyan-600 border-3 border-black dark:border-gray-600 rounded-xl flex items-center justify-center mb-4">
              <Camera className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-black text-black dark:text-white mb-2">
              Capture Assignments
            </h3>
            <p className="text-gray-700 dark:text-gray-400 font-medium">
              Take photos of syllabi, handouts, and whiteboard notes. We&apos;ll extract the text and organize it for you.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white dark:bg-gray-800 p-6 border-3 border-black dark:border-gray-600 rounded-xl shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all">
            <div className="w-14 h-14 bg-violet-300 dark:bg-violet-600 border-3 border-black dark:border-gray-600 rounded-xl flex items-center justify-center mb-4">
              <Brain className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-black text-black dark:text-white mb-2">
              AI Study Materials
            </h3>
            <p className="text-gray-700 dark:text-gray-400 font-medium">
              Generate notes, study guides, practice tests, and flashcards automatically from your assignment content.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white dark:bg-gray-800 p-6 border-3 border-black dark:border-gray-600 rounded-xl shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all">
            <div className="w-14 h-14 bg-emerald-300 dark:bg-emerald-600 border-3 border-black dark:border-gray-600 rounded-xl flex items-center justify-center mb-4">
              <Calendar className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-black text-black dark:text-white mb-2">
              Smart Scheduling
            </h3>
            <p className="text-gray-700 dark:text-gray-400 font-medium">
              Tell us your availability and due dates. We&apos;ll create an optimized study plan that fits your life.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white dark:bg-gray-800 p-6 border-3 border-black dark:border-gray-600 rounded-xl shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all">
            <div className="w-14 h-14 bg-amber-300 dark:bg-amber-600 border-3 border-black dark:border-gray-600 rounded-xl flex items-center justify-center mb-4">
              <Mic className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-black text-black dark:text-white mb-2">
              Voice Input
            </h3>
            <p className="text-gray-700 dark:text-gray-400 font-medium">
              Speak your assignments and notes. Our AI transcribes and organizes everything hands-free.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white dark:bg-gray-800 p-6 border-3 border-black dark:border-gray-600 rounded-xl shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all">
            <div className="w-14 h-14 bg-rose-300 dark:bg-rose-600 border-3 border-black dark:border-gray-600 rounded-xl flex items-center justify-center mb-4">
              <Clock className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-black text-black dark:text-white mb-2">
              Due Date Tracking
            </h3>
            <p className="text-gray-700 dark:text-gray-400 font-medium">
              Never miss a deadline. Get smart reminders based on assignment priority and your workload.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white dark:bg-gray-800 p-6 border-3 border-black dark:border-gray-600 rounded-xl shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all">
            <div className="w-14 h-14 bg-sky-300 dark:bg-sky-600 border-3 border-black dark:border-gray-600 rounded-xl flex items-center justify-center mb-4">
              <RefreshCw className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-black text-black dark:text-white mb-2">
              Cross-Device Sync
            </h3>
            <p className="text-gray-700 dark:text-gray-400 font-medium">
              Access your assignments from any device. Your data syncs in real-time across phone, tablet, and computer.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-black text-center text-black dark:text-white mb-4">
          How It Works
        </h2>
        <p className="text-gray-700 dark:text-gray-400 font-medium text-center mb-12 max-w-xl mx-auto">
          Get started in three simple steps
        </p>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-violet-300 dark:bg-violet-600 border-3 border-black dark:border-gray-600 rounded-xl shadow-[4px_4px_0_0_#000] flex items-center justify-center">
              <span className="text-2xl font-black text-black dark:text-white">1</span>
            </div>
            <h3 className="text-lg font-black text-black dark:text-white mb-2">Add Assignments</h3>
            <p className="text-gray-700 dark:text-gray-400 font-medium">Type, speak, or snap a photo of your assignments and course materials.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-cyan-300 dark:bg-cyan-600 border-3 border-black dark:border-gray-600 rounded-xl shadow-[4px_4px_0_0_#000] flex items-center justify-center">
              <span className="text-2xl font-black text-black dark:text-white">2</span>
            </div>
            <h3 className="text-lg font-black text-black dark:text-white mb-2">AI Generates Materials</h3>
            <p className="text-gray-700 dark:text-gray-400 font-medium">Get study notes, flashcards, practice tests, and a personalized schedule.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-300 dark:bg-emerald-600 border-3 border-black dark:border-gray-600 rounded-xl shadow-[4px_4px_0_0_#000] flex items-center justify-center">
              <span className="text-2xl font-black text-black dark:text-white">3</span>
            </div>
            <h3 className="text-lg font-black text-black dark:text-white mb-2">Ace Your Exams</h3>
            <p className="text-gray-700 dark:text-gray-400 font-medium">Study smarter with AI-optimized materials and stay on track with your schedule.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-violet-300 dark:bg-violet-700 border-3 border-black dark:border-gray-600 rounded-xl shadow-[8px_8px_0_0_#000] p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-black dark:text-white mb-4">
            Ready to Transform Your Study Habits?
          </h2>
          <p className="text-gray-800 dark:text-gray-300 font-medium text-lg mb-8 max-w-xl mx-auto">
            Join thousands of students who are studying smarter, not harder.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-yellow-300 dark:bg-yellow-500 text-black font-black border-3 border-black dark:border-gray-600 rounded-xl shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all"
          >
            Start Free Today
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-3 border-black dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-300 dark:bg-yellow-500 border-2 border-black dark:border-gray-600 rounded-lg">
                <BookOpen className="h-4 w-4" />
              </div>
              <span className="font-bold text-black dark:text-gray-200">StudyTracker © 2025</span>
            </div>
            <div className="flex gap-6">
              <Link href="/privacy" className="font-bold text-black dark:text-gray-300 hover:underline underline-offset-4">Privacy</Link>
              <Link href="/terms" className="font-bold text-black dark:text-gray-300 hover:underline underline-offset-4">Terms</Link>
              <Link href="/contact" className="font-bold text-black dark:text-gray-300 hover:underline underline-offset-4">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
