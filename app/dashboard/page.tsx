// grakchawwaa-web/app/dashboard/page.tsx
'use client';

import { useAuth } from '../../lib/auth-context';
import { getMemberRole } from '../../lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';

export default function Dashboard() {
  const { session, loading, logout, selectPlayer } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) {
      if (!session) {
        router.push('/');
      } else if (session.players.length > 1 && !session.selectedAllyCode) {
        router.push('/select-player');
      }
    }
  }, [session, loading, router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleSwitchPlayer = async (allyCode: string) => {
    if (allyCode === session?.selectedAllyCode) {
      setDropdownOpen(false);
      return;
    }
    try {
      setSwitching(true);
      await selectPlayer(allyCode);
      toast.success('Player switched successfully');
      setDropdownOpen(false);
    } catch (error) {
      toast.error('Failed to switch player');
      console.error('Error switching player:', error);
    } finally {
      setSwitching(false);
    }
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
              {/* Player Switcher Dropdown */}
              {session.players.length > 1 ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    disabled={switching}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded transition-colors"
                  >
                    <span className="text-sm text-gray-400">Player:</span>
                    <span className="font-semibold">{selectedPlayer.playerName}</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-gray-700 rounded-lg shadow-lg border border-gray-600 z-50">
                      <div className="py-2">
                        {session.players.map((player) => (
                          <button
                            key={player.allyCode}
                            onClick={() => handleSwitchPlayer(player.allyCode)}
                            disabled={switching}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-600 disabled:opacity-50 transition-colors ${
                              player.allyCode === session.selectedAllyCode ? 'bg-gray-600' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{player.playerName}</span>
                                  {player.isMain && (
                                    <span className="px-1.5 py-0.5 bg-indigo-600 text-xs font-semibold rounded">
                                      MAIN
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-400">{player.allyCode}</p>
                              </div>
                              {player.allyCode === session.selectedAllyCode && (
                                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-right">
                  <p className="text-sm text-gray-400">Player</p>
                  <p className="font-semibold">{selectedPlayer.playerName}</p>
                </div>
              )}
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
          <h2 className="text-xl font-semibold mb-4">Current Player</h2>
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
