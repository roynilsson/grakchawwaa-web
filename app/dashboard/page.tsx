// grakchawwaa-web/app/dashboard/page.tsx
'use client';

import { useAuth } from '../../lib/auth-context';
import { getMemberRole } from '../../lib/api';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function Dashboard() {
  const { session, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!session) {
        router.push('/');
      } else if (session.players.length > 1 && !session.selectedAllyCode) {
        router.push('/select-player');
      }
    }
  }, [session, loading, router]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      toast.error('Failed to logout');
      console.error('Error logging out:', error);
    }
  };

  const handleChangePlayer = () => {
    router.push('/select-player');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || !session.selectedAllyCode) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Redirecting...</div>
      </div>
    );
  }

  const selectedPlayer = session.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  if (!selectedPlayer) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-red-500">Error: Selected player not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Grakchawwaa</h1>
              <p className="text-sm text-gray-400 mt-1">
                Guild Management Dashboard
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">Logged in as</p>
                <p className="font-semibold">{session.discordUsername}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Player Info Card */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Current Player</h2>
            {session.players.length > 1 && (
              <button
                onClick={handleChangePlayer}
                className="text-sm text-indigo-400 hover:text-indigo-300 underline"
              >
                Switch Player
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-400">Player Name</p>
              <p className="text-lg font-semibold flex items-center gap-2">
                {selectedPlayer.playerName}
                {selectedPlayer.isMain && (
                  <span className="px-2 py-1 bg-indigo-600 text-xs font-semibold rounded">
                    MAIN
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Ally Code</p>
              <p className="text-lg font-semibold">{selectedPlayer.allyCode}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Role</p>
              <p className="text-lg font-semibold">{getMemberRole(selectedPlayer.memberLevel)}</p>
            </div>
            {selectedPlayer.guildName && (
              <div className="md:col-span-3">
                <p className="text-sm text-gray-400">Guild</p>
                <p className="text-lg font-semibold">{selectedPlayer.guildName}</p>
              </div>
            )}
          </div>
        </div>

        {/* Placeholder Content */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
          <h3 className="text-2xl font-semibold mb-4">Welcome to Grakchawwaa!</h3>
          <p className="text-gray-400 mb-4">
            Guild management features coming soon...
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="p-6 bg-gray-700 rounded-lg">
              <h4 className="font-semibold mb-2">Roster Management</h4>
              <p className="text-sm text-gray-400">
                View and manage your character roster
              </p>
            </div>
            <div className="p-6 bg-gray-700 rounded-lg">
              <h4 className="font-semibold mb-2">Violations</h4>
              <p className="text-sm text-gray-400">
                Track ticket and raid violations
              </p>
            </div>
            <div className="p-6 bg-gray-700 rounded-lg">
              <h4 className="font-semibold mb-2">Warnings</h4>
              <p className="text-sm text-gray-400">
                View your warning history
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
