'use client';

import { useAuth } from '../../../../lib/auth-context';
import { violationsApi, Violation } from '../../../../lib/api';
import { useState, useEffect, useCallback } from 'react';
import { Pagination } from '../../../../components/Pagination';
import { Filters } from '../../../../components/Filters';
import { useRouter } from 'next/navigation';

const ITEMS_PER_PAGE = 25;

export default function GuildViolations() {
  const { session } = useAuth();
  const router = useRouter();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [daysAgo, setDaysAgo] = useState<number | null>(30);
  const [currentMembersOnly, setCurrentMembersOnly] = useState(true);

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  // Check officer permission
  useEffect(() => {
    if (selectedPlayer && selectedPlayer.memberLevel < 3) {
      router.push('/dashboard');
    }
  }, [selectedPlayer, router]);

  const fetchViolations = useCallback(async () => {
    if (!selectedPlayer) return;

    setLoading(true);
    setError(null);
    try {
      const res = await violationsApi.list({
        guildId: selectedPlayer.guildId,
        page,
        limit: ITEMS_PER_PAGE,
        currentMembersOnly,
        daysAgo: daysAgo ?? undefined,
      });

      setViolations(res.violations);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load violations');
    } finally {
      setLoading(false);
    }
  }, [selectedPlayer, page, currentMembersOnly, daysAgo]);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, daysAgo, currentMembersOnly]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!selectedPlayer || selectedPlayer.memberLevel < 3) {
    return <div className="text-center py-8">Access denied</div>;
  }

  if (loading && violations.length === 0) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Guild Ticket Violations</h1>

      <Filters
        onSearchChange={setSearch}
        onDateRangeChange={setDaysAgo}
        onCurrentMembersOnlyChange={setCurrentMembersOnly}
        currentMembersOnly={currentMembersOnly}
      />

      {/* Violations Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Player</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Tickets</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Missing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {violations.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No violations found
                </td>
              </tr>
            ) : (
              violations.map((violation, idx) => (
                <tr key={`${violation.playerId}-${violation.date}-${idx}`} className="hover:bg-gray-750">
                  <td className="px-4 py-3 text-sm">
                    {formatDate(violation.date)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div>{violation.playerName || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{violation.allyCode}</div>
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
