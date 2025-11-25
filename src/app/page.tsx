import Link from 'next/link';
import { BookOpen, Camera, Calendar, Brain, Clock, Mic } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary-600" />
            <span className="text-2xl font-bold text-gray-900">StudyTracker</span>
          </div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Your AI-Powered
          <span className="text-primary-600"> Study Companion</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          Track assignments, capture materials, generate study guides, and let AI plan your perfect study schedule. All in one place.
        </p>
        <Link
          href="/signup"
          className="inline-block px-8 py-4 bg-primary-600 text-white text-lg font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl"
        >
          Get Started Free
        </Link>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Everything You Need to Succeed
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Camera className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Capture Assignments
            </h3>
            <p className="text-gray-600">
              Take photos of syllabi, handouts, and whiteboard notes. We&apos;ll extract the text and organize it for you.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              AI Study Materials
            </h3>
            <p className="text-gray-600">
              Generate notes, study guides, practice tests, and flashcards automatically from your assignment content.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Smart Scheduling
            </h3>
            <p className="text-gray-600">
              Tell us your availability and due dates. We&apos;ll create an optimized study plan that fits your life.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
              <Mic className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Voice Input
            </h3>
            <p className="text-gray-600">
              Speak your assignments and notes. Our AI transcribes and organizes everything hands-free.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-pink-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Due Date Tracking
            </h3>
            <p className="text-gray-600">
              Never miss a deadline. Get smart reminders based on assignment priority and your workload.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-cyan-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Cross-Device Sync
            </h3>
            <p className="text-gray-600">
              Access your assignments from any device. Your data syncs in real-time across phone, tablet, and computer.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-primary-600 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Study Habits?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
            Join thousands of students who are studying smarter, not harder.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-white text-primary-600 text-lg font-semibold rounded-xl hover:bg-gray-100 transition-colors"
          >
            Start Free Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-200">
        <div className="flex items-center justify-between text-gray-500 text-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <span>StudyTracker © 2025</span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900">Terms</Link>
            <Link href="/contact" className="hover:text-gray-900">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
