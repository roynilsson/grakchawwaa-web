'use client';

import { useAuth } from '../../../../lib/auth-context';
import { leavesApi, Leave, LeaveType, LeaveSummary } from '../../../../lib/api';
import { useState, useEffect, useCallback } from 'react';
import { formatDate } from '../../../../lib/dateUtils';
import { Pagination } from '../../../../components/Pagination';

const ITEMS_PER_PAGE = 25;

export default function OfficerLeaves() {
  const { session } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [summary, setSummary] = useState<LeaveSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [view, setView] = useState<'list' | 'summary'>('list');
  const [page, setPage] = useState(1);

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  const guildId = selectedPlayer?.guildId;

  const fetchLeaves = useCallback(async () => {
    if (!guildId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await leavesApi.listByGuild({
        guildId,
        active: showActiveOnly,
      });
      setLeaves(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaves');
    } finally {
      setLoading(false);
    }
  }, [guildId, showActiveOnly]);

  const fetchSummary = useCallback(async () => {
    if (!guildId) return;

    setLoading(true);
    setError(null);
    try {
      // Get summary for last 90 days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const data = await leavesApi.getSummary({
        guildId,
        startDate,
        endDate,
      });
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    if (view === 'list') {
      fetchLeaves();
    } else {
      fetchSummary();
    }
  }, [view, fetchLeaves, fetchSummary]);

  const handleDelete = async (leaveId: number) => {
    if (!confirm('Are you sure you want to delete this leave?')) return;

    try {
      await leavesApi.delete(leaveId);
      setLeaves((prev) => prev.filter((l) => l.id !== leaveId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete leave');
    }
  };

  const getLeaveTypeLabel = (type: LeaveType) => {
    return type === 'away' ? 'Away' : 'Busy';
  };

  const getLeaveTypeStyles = (type: LeaveType) => {
    return type === 'away'
      ? 'bg-red-500/20 text-red-400'
      : 'bg-yellow-500/20 text-yellow-400';
  };

  const isLeaveStarted = (leave: Leave) => {
    const today = new Date().toISOString().split('T')[0];
    return leave.startDate <= today!;
  };

  // Pagination for list view
  const paginatedLeaves = leaves.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(leaves.length / ITEMS_PER_PAGE);

  if (!guildId) {
    return (
      <div className="text-center py-8 text-gray-400">
        You must be a member of a guild to view leaves.
      </div>
    );
  }

  if (loading && leaves.length === 0 && summary.length === 0) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Guild Leaves of Absence</h1>
      </div>

      {/* View Toggle */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setView('list')}
          className={`px-4 py-2 rounded transition-colors ${
            view === 'list'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Leave List
        </button>
        <button
          onClick={() => setView('summary')}
          className={`px-4 py-2 rounded transition-colors ${
            view === 'summary'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Summary (90 days)
        </button>
      </div>

      {view === 'list' && (
        <>
          {/* Filter */}
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => {
                  setShowActiveOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-gray-600 bg-gray-700"
              />
              Show active/upcoming only
            </label>
          </div>

          {/* Leaves Table */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Player</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Start</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">End</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Note</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Created By</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {paginatedLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        No leaves found
                      </td>
                    </tr>
                  ) : (
                    paginatedLeaves.map((leave) => (
                      <tr key={leave.id} className="hover:bg-gray-750">
                        <td className="px-4 py-3 text-sm font-medium">
                          {leave.playerName || leave.playerAllyCode}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getLeaveTypeStyles(leave.leaveType)}`}>
                            {getLeaveTypeLabel(leave.leaveType)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{formatDate(leave.startDate)}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(leave.endDate)}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {leave.note ? (
                            leave.note.length > 30 ? `${leave.note.slice(0, 30)}...` : leave.note
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {leave.createdByPlayerName || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {!isLeaveStarted(leave) && (
                            <button
                              onClick={() => handleDelete(leave.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {view === 'summary' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Player</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Ally Code</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Total Days</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Leave Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {summary.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      No leave data in the last 90 days
                    </td>
                  </tr>
                ) : (
                  summary.map((item) => (
                    <tr key={item.playerId} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-sm font-medium">
                        {item.playerName || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {item.allyCode || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {item.totalDays}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {item.leaveCount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
