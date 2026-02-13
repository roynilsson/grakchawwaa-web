'use client';

import { useAuth } from '../../../../lib/auth-context';
import { warningsApi, Warning, WarningType } from '../../../../lib/api';
import { useState, useEffect, useCallback } from 'react';
import { Pagination } from '../../../../components/Pagination';
import { Filters } from '../../../../components/Filters';
import { IssueWarningModal } from '../../../../components/IssueWarningModal';
import { useRouter } from 'next/navigation';

const ITEMS_PER_PAGE = 25;

export default function GuildWarnings() {
  const { session } = useAuth();
  const router = useRouter();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [warningTypes, setWarningTypes] = useState<WarningType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal state
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [daysAgo, setDaysAgo] = useState<number | null>(30);
  const [warningTypeId, setWarningTypeId] = useState<number | null>(null);
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

  const fetchWarnings = useCallback(async () => {
    if (!selectedPlayer) return;

    setLoading(true);
    setError(null);
    try {
      const res = await warningsApi.list({
        guildId: selectedPlayer.guildId,
        page,
        limit: ITEMS_PER_PAGE,
        currentMembersOnly,
        daysAgo: daysAgo ?? undefined,
        warningTypeId: warningTypeId ?? undefined,
      });

      // Client-side search filter
      let filtered = res.warnings;
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          (w) =>
            w.player.name?.toLowerCase().includes(searchLower) ||
            w.player.allyCode.includes(search)
        );
      }

      setWarnings(filtered);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warnings');
    } finally {
      setLoading(false);
    }
  }, [selectedPlayer, page, currentMembersOnly, daysAgo, warningTypeId, search]);

  useEffect(() => {
    if (!selectedPlayer) return;

    warningsApi.getTypes(selectedPlayer.guildId).then((res) => {
      setWarningTypes(res.warningTypes);
    });
  }, [selectedPlayer]);

  useEffect(() => {
    fetchWarnings();
  }, [fetchWarnings]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, daysAgo, warningTypeId, currentMembersOnly]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 7) return 'bg-red-600';
    if (severity >= 4) return 'bg-yellow-600';
    return 'bg-blue-600';
  };

  if (!selectedPlayer || selectedPlayer.memberLevel < 3) {
    return <div className="text-center py-8">Access denied</div>;
  }

  if (loading && warnings.length === 0) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Guild Warnings</h1>
        <button
          onClick={() => setShowIssueModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
        >
          Issue Warning
        </button>
      </div>

      <Filters
        onSearchChange={setSearch}
        onDateRangeChange={setDaysAgo}
        onCurrentMembersOnlyChange={setCurrentMembersOnly}
        currentMembersOnly={currentMembersOnly}
        warningTypes={warningTypes}
        onWarningTypeChange={setWarningTypeId}
      />

      {/* Warnings Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Player</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Issued By</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {warnings.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No warnings found
                </td>
              </tr>
            ) : (
              warnings.map((warning) => (
                <tr key={warning.id} className="hover:bg-gray-750">
                  <td className="px-4 py-3 text-sm">
                    {formatDate(warning.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {warning.player.name || warning.player.allyCode}
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
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {warning.issuedByPlayer?.name || warning.issuedByPlayer?.allyCode || '-'}
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

      <IssueWarningModal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        guildId={selectedPlayer.guildId}
        issuedByAllyCode={selectedPlayer.allyCode}
        onSuccess={() => {
          fetchWarnings();
        }}
      />
    </div>
  );
}
