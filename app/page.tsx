// grakchawwaa-web/app/page.tsx
'use client';

import { useAuth } from '../lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { session, loading } = useAuth();
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

  useEffect(() => {
    if (!loading && session) {
      // Redirect authenticated users
      if (session.players.length > 1 && !session.selectedAllyCode) {
        router.push('/select-player');
      } else if (session.selectedAllyCode) {
        router.push('/dashboard');
      }
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-md text-center space-y-8 p-8">
        <h1 className="text-5xl font-bold">Grakchawwaa</h1>
        <p className="text-xl text-gray-300">
          Guild Management for Star Wars: Galaxy of Heroes
        </p>

        <div className="space-y-4">
          <p className="text-gray-400">
            Track violations, manage warnings, and monitor your guild&apos;s performance.
          </p>

          <a
            href={`${API_URL}/auth/discord`}
            className="inline-block px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold text-lg transition-colors"
          >
            Login with Discord
          </a>
        </div>

        <p className="text-sm text-gray-500 mt-8">
          By logging in, you agree to our{' '}
          <a href="/privacy-policy" className="underline hover:text-gray-400">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
