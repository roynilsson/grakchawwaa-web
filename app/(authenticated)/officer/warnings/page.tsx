'use client';

import { useAuth } from '../../../../lib/auth-context';
import { warningsApi, Warning, WarningType } from '../../../../lib/api';
import { useState, useEffect, useCallback } from 'react';
import { Pagination } from '../../../../components/Pagination';
import { Filters } from '../../../../components/Filters';
import { IssueWarningModal } from '../../../../components/IssueWarningModal';
import { EditWarningModal } from '../../../../components/EditWarningModal';
import { ImportCsvModal } from '../../../../components/ImportCsvModal';
import { useRouter } from 'next/navigation';
import { formatDate } from '../../../../lib/dateUtils';
import { toast } from 'sonner';

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWarning, setEditingWarning] = useState<Warning | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [daysAgo, setDaysAgo] = useState<number | null>(30);
  const [warningTypeId, setWarningTypeId] = useState<number | null>(null);
  const [currentMembersOnly, setCurrentMembersOnly] = useState(true);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  // Check officer permission
  useEffect(() => {
    if (selectedPlayer && selectedPlayer.memberLevel < 3 && !selectedPlayer.isAdmin) {
      router.push('/player');
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
        search: search || undefined,
        includeDeleted,
      });

      setWarnings(res.warnings);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warnings');
    } finally {
      setLoading(false);
    }
  }, [selectedPlayer, page, currentMembersOnly, daysAgo, warningTypeId, search, includeDeleted]);

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
  }, [search, daysAgo, warningTypeId, currentMembersOnly, includeDeleted]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const getSeverityColor = (severity: number) => {
    if (severity >= 7) return 'bg-red-600';
    if (severity >= 4) return 'bg-yellow-600';
    return 'bg-blue-600';
  };

  const handleEdit = (warning: Warning) => {
    setEditingWarning(warning);
    setShowEditModal(true);
  };

  const handleDelete = async (warning: Warning) => {
    if (!selectedPlayer) return;
    if (!confirm(`Are you sure you want to delete this warning for ${warning.player.name || warning.player.allyCode}?`)) {
      return;
    }

    try {
      await warningsApi.delete(selectedPlayer.guildId, warning.id, selectedPlayer.allyCode);
      toast.success('Warning deleted');
      fetchWarnings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete warning');
    }
  };

  const handleRestore = async (warning: Warning) => {
    if (!selectedPlayer) return;

    try {
      await warningsApi.restore(selectedPlayer.guildId, warning.id, selectedPlayer.allyCode);
      toast.success('Warning restored');
      fetchWarnings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to restore warning');
    }
  };

  if (!selectedPlayer || selectedPlayer.memberLevel < 3 && !selectedPlayer.isAdmin) {
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
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
          >
            Import CSV
          </button>
          <button
            onClick={() => setShowIssueModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
          >
            Issue Warning
          </button>
        </div>
      </div>

      <Filters
        onSearchChange={setSearch}
        onDateRangeChange={setDaysAgo}
        onCurrentMembersOnlyChange={setCurrentMembersOnly}
        currentMembersOnly={currentMembersOnly}
        warningTypes={warningTypes}
        onWarningTypeChange={setWarningTypeId}
      />

      {/* Show Deleted Toggle */}
      <div className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          id="includeDeleted"
          checked={includeDeleted}
          onChange={(e) => setIncludeDeleted(e.target.checked)}
          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="includeDeleted" className="text-sm text-gray-400">
          Show deleted warnings
        </label>
      </div>

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
              <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {warnings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No warnings found
                </td>
              </tr>
            ) : (
              warnings.map((warning) => (
                <tr
                  key={warning.id}
                  className={`hover:bg-gray-750 ${warning.deletedAt ? 'opacity-50 bg-red-900/20' : ''}`}
                >
                  <td className="px-4 py-3 text-sm">
                    <div>{formatDate(warning.createdAt)}</div>
                    {warning.editedAt && (
                      <div className="text-xs text-gray-500">
                        Edited {formatDate(warning.editedAt)}
                      </div>
                    )}
                    {warning.deletedAt && (
                      <div className="text-xs text-red-400">
                        Deleted {formatDate(warning.deletedAt)}
                      </div>
                    )}
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
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      {warning.deletedAt ? (
                        <button
                          onClick={() => handleRestore(warning)}
                          className="px-2 py-1 text-xs bg-green-600 hover:bg-green-500 rounded transition-colors"
                        >
                          Restore
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(warning)}
                            className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(warning)}
                            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
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

      <ImportCsvModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        type="warnings"
        guildId={selectedPlayer.guildId}
        issuedByAllyCode={selectedPlayer.allyCode}
        onSuccess={() => {
          fetchWarnings();
        }}
      />

      <EditWarningModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingWarning(null);
        }}
        warning={editingWarning}
        guildId={selectedPlayer.guildId}
        editedByAllyCode={selectedPlayer.allyCode}
        onSuccess={() => {
          fetchWarnings();
        }}
      />
    </div>
  );
}
