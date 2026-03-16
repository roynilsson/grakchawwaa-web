'use client';

import { useAuth } from '../../../../../lib/auth-context';
import { warningsApi, WarningSummary } from '../../../../../lib/api';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_PERIODS = [30, 90, 180];

export default function WarningSummaryPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<WarningSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState(0);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  // Check officer permission
  useEffect(() => {
    if (selectedPlayer && selectedPlayer.memberLevel < 3 && !selectedPlayer.isAdmin) {
      router.push('/player');
    }
  }, [selectedPlayer, router]);

  const fetchSummary = useCallback(async () => {
    if (!selectedPlayer) return;

    setLoading(true);
    setError(null);
    try {
      const data = await warningsApi.getSummary(
        selectedPlayer.guildId,
        DEFAULT_PERIODS
      );
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, [selectedPlayer]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnIndex);
      setSortDirection('desc');
    }
  };

  if (!selectedPlayer || (selectedPlayer.memberLevel < 3 && !selectedPlayer.isAdmin)) {
    return <div className="text-center py-8">Access denied</div>;
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  if (!summary) {
    return <div className="text-center py-8">No data available</div>;
  }

  // Filter and sort players
  const filteredPlayers = summary.players
    .filter((p) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        p.name?.toLowerCase().includes(searchLower) ||
        p.allyCode.includes(search)
      );
    })
    .sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortColumn === -1) {
        // Sort by name
        aVal = a.name || a.allyCode;
        bVal = b.name || b.allyCode;
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        // Sort by value column
        aVal = a.values[sortColumn] || 0;
        bVal = b.values[sortColumn] || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });

  const getValueColor = (value: number, columnIndex: number) => {
    if (columnIndex === 0) {
      // First column - raw value coloring
      if (value >= 50) return 'text-red-400';
      if (value >= 20) return 'text-yellow-400';
      return 'text-gray-300';
    }
    // Subsequent columns - compare to show trend
    return 'text-gray-300';
  };

  const getTrendIndicator = (current: number, avg: number) => {
    if (current < avg) return <span className="text-green-400 ml-1">↓</span>;
    if (current > avg) return <span className="text-red-400 ml-1">↑</span>;
    return null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Warning Summary</h1>
      </div>

      <p className="text-gray-400 mb-4">
        Shows warning points (sum of severities) for each period. First column is the raw total,
        subsequent columns show averages per {summary.basePeriod} days for comparison.
      </p>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by player name or ally code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-64 px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Summary Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th
                  className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort(-1)}
                >
                  Player {sortColumn === -1 && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                {summary.periods.map((period, index) => (
                  <th
                    key={period}
                    className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort(index)}
                  >
                    {index === 0 ? `${period}d` : `${period}d avg`}
                    {sortColumn === index && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td
                    colSpan={summary.periods.length + 1}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No warnings found in the selected period
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => (
                  <tr key={player.allyCode} className="hover:bg-gray-750">
                    <td className="px-4 py-3 text-sm">
                      {player.name || player.allyCode}
                    </td>
                    {player.values.map((value, index) => (
                      <td
                        key={index}
                        className={`px-4 py-3 text-sm text-right ${getValueColor(value, index)}`}
                      >
                        {value}
                        {index > 0 && getTrendIndicator(player.values[0], value)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-sm text-gray-500 mt-4">
        ↓ = improving (current period lower than average), ↑ = declining (current period higher than average)
      </p>
    </div>
  );
}
