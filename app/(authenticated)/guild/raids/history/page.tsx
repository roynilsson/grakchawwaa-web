'use client';

import { useAuth } from '../../../../../lib/auth-context';
import { raidsApi, RaidHistoryResponse } from '../../../../../lib/api';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDate, formatTime } from '../../../../../lib/dateUtils';

export default function RaidHistoryPage() {
  const { session } = useAuth();
  const [historyData, setHistoryData] = useState<RaidHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedPlayer) return;

      setLoading(true);
      setError(null);
      try {
        const data = await raidsApi.getHistory(selectedPlayer.guildId, {
          limit,
          offset,
        });
        setHistoryData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load raid history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [selectedPlayer, limit, offset]);

  if (!selectedPlayer) {
    return null;
  }

  const totalPages = historyData ? Math.ceil(historyData.total / limit) : 0;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Raid History</h1>
        <Link
          href="/guild/raids"
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          Current Raid
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : !historyData || historyData.raids.length === 0 ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
          <p className="text-gray-400">No raid history found</p>
        </div>
      ) : (
        <>
          {/* Raids List */}
          <div className="space-y-4">
            {historyData.raids.map((raidEntry) => {
              const expireTime = new Date(raidEntry.raid.expireTime);
              const myResult = raidEntry.results.find(
                r => r.playerId === selectedPlayer.playerId
              );

              return (
                <div
                  key={raidEntry.raid.id}
                  className="bg-gray-800 rounded-lg border border-gray-700 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{raidEntry.raid.raidType}</h3>
                      <p className="text-sm text-gray-400">
                        Completed {formatDate(expireTime)} at{' '}
                        {formatTime(expireTime)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Guild Score</p>
                      <p className="text-lg font-semibold">
                        {raidEntry.raid.guildRewardScore.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-400">Participation</p>
                      <p className="font-semibold">
                        {(raidEntry.participationRate * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Average Score</p>
                      <p className="font-semibold">
                        {Math.round(raidEntry.avgScore).toLocaleString()}
                      </p>
                    </div>
                    {myResult && (
                      <>
                        <div>
                          <p className="text-sm text-gray-400">My Score</p>
                          <p className="font-semibold">
                            {myResult.score.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">My Rank</p>
                          <p className="font-semibold">#{myResult.rank}</p>
                        </div>
                      </>
                    )}
                  </div>

                  <details className="cursor-pointer">
                    <summary className="text-sm text-indigo-400 hover:text-indigo-300">
                      View All Results ({raidEntry.results.length} players)
                    </summary>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-700">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold">Rank</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold">Player</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {raidEntry.results.map((result) => (
                            <tr
                              key={result.playerId}
                              className={
                                result.playerId === selectedPlayer.playerId
                                  ? 'bg-indigo-900/20'
                                  : ''
                              }
                            >
                              <td className="px-3 py-2 text-xs">#{result.rank}</td>
                              <td className="px-3 py-2 text-xs">
                                {result.playerName}
                                {result.playerId === selectedPlayer.playerId && (
                                  <span className="ml-2 text-indigo-400">(You)</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-xs text-right">
                                {result.score.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
