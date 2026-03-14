'use client';

import { useAuth } from '../../../../lib/auth-context';
import { warningsApi, Warning, WarningStats } from '../../../../lib/api';
import { useState, useEffect } from 'react';
import { StatCard } from '../../../../components/StatCard';
import { Pagination } from '../../../../components/Pagination';
import { formatDate } from '../../../../lib/dateUtils';

const ITEMS_PER_PAGE = 25;

export default function MyWarnings() {
  const { session } = useAuth();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [stats, setStats] = useState<WarningStats | null>(null);
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
        const [warningsRes, statsRes] = await Promise.all([
          warningsApi.listMy({
            guildId: selectedPlayer.guildId,
            playerId: selectedPlayer.allyCode,
            page,
            limit: ITEMS_PER_PAGE,
          }),
          warningsApi.getMyStats(selectedPlayer.guildId, selectedPlayer.allyCode),
        ]);
        setWarnings(warningsRes.warnings);
        setTotal(warningsRes.total);
        setStats(statsRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load warnings');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPlayer, page]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const getSeverityColor = (severity: number) => {
    if (severity >= 7) return 'bg-red-600';
    if (severity >= 4) return 'bg-yellow-600';
    return 'bg-blue-600';
  };

  if (loading && warnings.length === 0) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Warnings</h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard label="Total Warnings" value={stats.total} />
          <StatCard label="Last 30 Days" value={stats.last30Days} />
        </div>
      )}

      {/* Warnings Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {warnings.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  No warnings found
                </td>
              </tr>
            ) : (
              warnings.map((warning) => (
                <tr key={warning.id} className="hover:bg-gray-750">
                  <td className="px-4 py-3 text-sm">
                    {formatDate(warning.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded ${getSeverityColor(
                          warning.warningType.severity
                        )}`}
                      >
                        {warning.warningType.severity}
                      </span>
                      {warning.warningType.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">
                    {warning.note || '-'}
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
