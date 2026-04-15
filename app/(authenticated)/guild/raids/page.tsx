'use client';

import { useAuth } from '../../../../lib/auth-context';
import { raidsApi, ActiveRaidResponse } from '../../../../lib/api';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function RaidsPage() {
  const { session } = useAuth();
  const [raidData, setRaidData] = useState<ActiveRaidResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  useEffect(() => {
    const fetchRaid = async () => {
      if (!selectedPlayer) return;

      setLoading(true);
      setError(null);
      try {
        const data = await raidsApi.getActive(selectedPlayer.guildId);
        setRaidData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load raid data');
      } finally {
        setLoading(false);
      }
    };

    fetchRaid();
  }, [selectedPlayer]);

  if (!selectedPlayer) {
    return null;
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  if (!raidData?.raid) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Current Raid</h1>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
          <p className="text-gray-400 mb-4">No active raid found</p>
          <Link
            href="/guild/raids/history"
            className="text-indigo-400 hover:text-indigo-300"
          >
            View Raid History
          </Link>
        </div>
      </div>
    );
  }

  const { raid, results, guildConfig, playerConfigs } = raidData;
  const expireTime = new Date(raid.expireTime);
  const now = new Date();
  const timeRemaining = expireTime.getTime() - now.getTime();
  const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
  const minutesRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)));

  // Calculate stats
  const totalPlayers = results.length;
  const participatingPlayers = results.filter(r => r.score > 0).length;
  const participationRate = totalPlayers > 0 ? (participatingPlayers / totalPlayers) * 100 : 0;
  const avgScore = totalPlayers > 0 ? results.reduce((sum, r) => sum + r.score, 0) / totalPlayers : 0;

  // Find player's own result
  const myResult = results.find(r => r.player.allyCode === selectedPlayer.allyCode);
  const myConfig = playerConfigs.find(pc => pc.player.allyCode === selectedPlayer.allyCode);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Current Raid</h1>
        <Link
          href="/guild/raids/history"
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          View History
        </Link>
      </div>

      {/* Raid Info Card */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-400">Raid Type</p>
            <p className="text-lg font-semibold">{raid.raidType}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Time Remaining</p>
            <p className="text-lg font-semibold">
              {hoursRemaining}h {minutesRemaining}m
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Guild Score</p>
            <p className="text-lg font-semibold">
              {raid.guildRewardScore.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* My Stats Card */}
      {myResult && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">My Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-400">My Score</p>
              <p className="text-lg font-semibold">{myResult.score.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">My Rank</p>
              <p className="text-lg font-semibold">#{myResult.rank}</p>
            </div>
            {myConfig && (
              <div>
                <p className="text-sm text-gray-400">All-Time High</p>
                <p className="text-lg font-semibold">{myConfig.allTimeHigh.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guild Stats Card */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Guild Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-400">Participation</p>
            <p className="text-lg font-semibold">
              {participatingPlayers}/{totalPlayers} ({participationRate.toFixed(1)}%)
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Average Score</p>
            <p className="text-lg font-semibold">{Math.round(avgScore).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Total Players</p>
            <p className="text-lg font-semibold">{totalPlayers}</p>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Player Results</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Rank</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Player</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Score</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Target</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">All-Time High</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {results.map((result) => {
                const config = playerConfigs.find(pc => pc.player.allyCode === result.player.allyCode);
                const isMyResult = result.player.allyCode === selectedPlayer.allyCode;

                return (
                  <tr
                    key={result.player.allyCode}
                    className={`hover:bg-gray-750 ${isMyResult ? 'bg-indigo-900/20' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm">#{result.rank}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {result.player.name || result.player.allyCode}
                      {isMyResult && (
                        <span className="ml-2 text-xs text-indigo-400">(You)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {result.score.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-400">
                      {(config?.playerMinScore ?? guildConfig?.guildMinScore)?.toLocaleString() ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-400">
                      {config?.allTimeHigh ? config.allTimeHigh.toLocaleString() : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
