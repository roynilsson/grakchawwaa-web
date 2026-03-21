'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';

/**
 * Redirects to the current player's roster page.
 * /player/roster -> /player/[selectedAllyCode]/roster
 */
export default function MyRosterPage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session?.selectedAllyCode) {
      router.replace(`/player/${session.selectedAllyCode}/roster`);
    }
  }, [loading, session, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!session?.selectedAllyCode) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-400">No player selected</div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center py-12">
      <div className="text-gray-400">Redirecting to your roster...</div>
    </div>
  );
}
