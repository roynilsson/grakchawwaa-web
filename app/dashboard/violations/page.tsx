'use client';

import { useAuth } from '../../../lib/auth-context';
import { violationsApi, Violation, ViolationStats } from '../../../lib/api';
import { useState, useEffect } from 'react';
import { StatCard } from '../../../components/StatCard';
import { Pagination } from '../../../components/Pagination';

const ITEMS_PER_PAGE = 25;

export default function MyViolations() {
  const { session } = useAuth();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [stats, setStats] = useState<ViolationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  useEffect(() => {
    if (!selectedPlayer) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [violationsRes, statsRes] = await Promise.all([
          violationsApi.list({
            guildId: selectedPlayer.guildId,
            playerId: selectedPlayer.playerId,
            page,
            limit: ITEMS_PER_PAGE,
            daysAgo: 90,
          }),
          violationsApi.getMyStats(selectedPlayer.guildId, selectedPlayer.playerId),
        ]);
        setViolations(violationsRes.violations);
        setTotal(violationsRes.total);
        setStats(statsRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load violations');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPlayer, page]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading && violations.length === 0) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Ticket Violations</h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard label="Violations (30 days)" value={stats.last30Days} />
          <StatCard label="Avg Tickets" value={stats.avgTickets} />
        </div>
      )}

      {/* Violations Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Tickets</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Missing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {violations.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  No violations found
                </td>
              </tr>
            ) : (
              violations.map((violation, idx) => (
                <tr key={`${violation.playerId}-${violation.date}-${idx}`} className="hover:bg-gray-750">
                  <td className="px-4 py-3 text-sm">
                    {formatDate(violation.date)}
                  </td>
                  <td className="px-4 py-3 text-sm">{violation.ticketCount}</td>
                  <td className="px-4 py-3 text-sm text-red-400">
                    {600 - violation.ticketCount}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
