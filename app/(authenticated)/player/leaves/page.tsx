'use client';

import { useAuth } from '../../../../lib/auth-context';
import { leavesApi, Leave, LeaveType } from '../../../../lib/api';
import { useState, useEffect, useCallback } from 'react';
import { formatDate } from '../../../../lib/dateUtils';

export default function MyLeaves() {
  const { session } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  const fetchLeaves = useCallback(async () => {
    if (!selectedPlayer) return;

    setLoading(true);
    setError(null);
    try {
      const data = await leavesApi.listMy({
        allyCode: selectedPlayer.allyCode,
        active: showActiveOnly,
      });
      setLeaves(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaves');
    } finally {
      setLoading(false);
    }
  }, [selectedPlayer, showActiveOnly]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

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

  if (loading && leaves.length === 0) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Leaves of Absence</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
        >
          Create Leave
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showActiveOnly}
            onChange={(e) => setShowActiveOnly(e.target.checked)}
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
                <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Start Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">End Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Note</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No leaves found
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-750">
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getLeaveTypeStyles(leave.leaveType)}`}>
                        {getLeaveTypeLabel(leave.leaveType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDate(leave.startDate)}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(leave.endDate)}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {leave.note ? (
                        leave.note.length > 50 ? `${leave.note.slice(0, 50)}...` : leave.note
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
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

      {/* Create Modal */}
      {showCreateModal && selectedPlayer && selectedPlayer.guildId && (
        <CreateLeaveModal
          allyCode={selectedPlayer.allyCode}
          guildId={selectedPlayer.guildId}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchLeaves();
          }}
        />
      )}
    </div>
  );
}

interface CreateLeaveModalProps {
  allyCode: string;
  guildId: string;
  onClose: () => void;
  onCreated: () => void;
}

function CreateLeaveModal({ allyCode, guildId, onClose, onCreated }: CreateLeaveModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState<LeaveType>('away');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await leavesApi.create({
        allyCode,
        guildId,
        startDate,
        endDate,
        leaveType,
        note: note || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create leave');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-xl font-bold mb-4">Create Leave of Absence</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-indigo-500 focus:outline-none"
            >
              <option value="away">Away - Fully unavailable</option>
              <option value="busy">Busy - May be unreliable</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Reason for leave..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:border-indigo-500 focus:outline-none resize-none"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Leave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
