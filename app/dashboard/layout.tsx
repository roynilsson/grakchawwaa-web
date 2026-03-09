'use client';

import { useAuth } from '../../lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Sidebar } from '../../components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading, logout, selectPlayer } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || !session.selectedAllyCode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-lg">Redirecting...</div>
      </div>
    );
  }

  const selectedPlayer = session.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  if (!selectedPlayer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-lg text-red-500">Error: Selected player not found</div>
      </div>
    );
  }

  const isOfficer = selectedPlayer.memberLevel >= 3 || selectedPlayer.isAdmin === true;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Left side: Hamburger + Title */}
            <div className="flex items-center gap-4 min-w-0">
              {/* Hamburger menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-400 hover:text-white"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold truncate">Grakchawwaa</h1>
                <p className="text-xs sm:text-sm text-gray-400 mt-1 hidden sm:block">
                  Guild Management Dashboard
                </p>
              </div>
            </div>

            {/* Right side: User controls */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Player Switcher Dropdown */}
              {session.players.length > 1 ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    disabled={switching}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded transition-colors text-sm"
                  >
                    <span className="text-xs sm:text-sm text-gray-400 hidden md:inline">Player:</span>
                    <span className="font-semibold text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">
                      {selectedPlayer.playerName}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`}
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
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold truncate">{player.playerName}</span>
                                  {player.isMain && (
                                    <span className="px-1.5 py-0.5 bg-indigo-600 text-xs font-semibold rounded flex-shrink-0">
                                      MAIN
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-400">{player.allyCode}</p>
                              </div>
                              {player.allyCode === session.selectedAllyCode && (
                                <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
                <div className="text-right hidden sm:block">
                  <p className="text-xs sm:text-sm text-gray-400">Player</p>
                  <p className="font-semibold text-sm sm:text-base">{selectedPlayer.playerName}</p>
                </div>
              )}

              {/* Username - hidden on mobile */}
              <div className="text-right hidden md:block">
                <p className="text-xs sm:text-sm text-gray-400">Logged in as</p>
                <p className="font-semibold text-sm sm:text-base truncate max-w-[150px]">{session.discordUsername}</p>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Exit</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex">
        <Sidebar isOfficer={isOfficer} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
