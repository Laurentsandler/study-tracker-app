'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Mail, Lock, User, AlertCircle, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-violet-100 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md text-center">
          <div className="bg-white border-3 border-black shadow-[8px_8px_0_0_#000] p-8">
            <div className="w-20 h-20 bg-emerald-300 border-3 border-black flex items-center justify-center mx-auto mb-6">
              <Check className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-black text-black mb-2">Check your email</h1>
            <p className="text-gray-600 font-medium mb-6">
              We&apos;ve sent a confirmation link to <strong className="text-black">{email}</strong>. Click the link to activate your account.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-yellow-300 font-black border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-violet-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 bg-yellow-300 border-3 border-black shadow-[4px_4px_0_0_#000]">
            <BookOpen className="h-8 w-8" />
          </div>
          <span className="text-3xl font-black text-black">StudyTracker</span>
        </Link>

        {/* Signup Card */}
        <div className="bg-white border-3 border-black shadow-[8px_8px_0_0_#000] p-8">
          <h1 className="text-2xl font-black text-black text-center mb-2">
            Create your account
          </h1>
          <p className="text-gray-600 font-medium text-center mb-8">
            Start your journey to better studying
          </p>

          {error && (
            <div className="mb-6 p-4 bg-rose-200 border-3 border-black flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-bold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-sm font-bold text-black mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full pl-10 pr-4 py-3 border-3 border-black font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-black mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 border-3 border-black font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-black mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 border-3 border-black font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-bold text-black mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 border-3 border-black font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-yellow-300 font-black border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-700 font-medium">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-black hover:underline underline-offset-4">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
