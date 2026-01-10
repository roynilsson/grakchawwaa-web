// grakchawwaa-web/app/select-player/page.tsx
'use client';

import { useAuth } from '../../lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function SelectPlayer() {
  const { session, loading, selectPlayer } = useAuth();
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!session) {
        router.push('/');
      } else if (session.selectedAllyCode) {
        router.push('/dashboard');
      }
    }
  }, [session, loading, router]);

  const handleSelectPlayer = async (allyCode: string) => {
    try {
      setSelecting(true);
      await selectPlayer(allyCode);
      toast.success('Player selected successfully');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Failed to select player');
      console.error('Error selecting player:', error);
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || session.selectedAllyCode) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-center mb-2">Select Player</h1>
        <p className="text-gray-400 text-center mb-8">
          Choose which player profile to use
        </p>

        <div className="space-y-4">
          {session.players.map((player) => (
            <button
              key={player.allyCode}
              onClick={() => handleSelectPlayer(player.allyCode)}
              disabled={selecting}
              className="w-full p-6 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 rounded-lg border border-gray-700 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">{player.playerName}</h2>
                    {player.isMain && (
                      <span className="px-2 py-1 bg-indigo-600 text-xs font-semibold rounded">
                        MAIN
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 mt-1">
                    Ally Code: {player.allyCode}
                  </p>
                  {player.guildName && (
                    <p className="text-gray-400 mt-1">
                      Guild: {player.guildName}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Member Level</p>
                  <p className="text-2xl font-bold">{player.memberLevel}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/auth/logout`}
            className="text-gray-400 hover:text-white underline"
          >
            Logout
          </a>
        </div>
      </div>
    </div>
  );
}
