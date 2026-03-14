'use client';

import { useState, useEffect, useMemo } from 'react';
import { guildApi, warningsApi, GuildMember, WarningType } from '../lib/api';
import { toast } from 'sonner';

interface IssueWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  guildId: string;
  issuedByAllyCode: string;
  onSuccess: () => void;
}

export function IssueWarningModal({
  isOpen,
  onClose,
  guildId,
  issuedByAllyCode,
  onSuccess,
}: IssueWarningModalProps) {
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [warningTypes, setWarningTypes] = useState<WarningType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedAllyCode, setSelectedAllyCode] = useState('');
  const [selectedWarningTypeId, setSelectedWarningTypeId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');

  // Load members and warning types when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    Promise.all([
      guildApi.getMembers(guildId),
      warningsApi.getTypes(guildId),
    ])
      .then(([membersRes, typesRes]) => {
        setMembers(membersRes.members);
        setWarningTypes(typesRes.warningTypes);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to load data');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, guildId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedAllyCode('');
      setSelectedWarningTypeId(null);
      setNote('');
      setPlayerSearch('');
    }
  }, [isOpen]);

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!playerSearch.trim()) return members;
    const searchLower = playerSearch.toLowerCase();
    return members.filter(
      (m) =>
        m.playerName.toLowerCase().includes(searchLower) ||
        m.allyCode.includes(playerSearch)
    );
  }, [members, playerSearch]);

  const selectedMember = members.find((m) => m.allyCode === selectedAllyCode);

  const getSeverityColor = (severity: number) => {
    if (severity >= 7) return 'bg-red-600';
    if (severity >= 4) return 'bg-yellow-600';
    return 'bg-blue-600';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllyCode || !selectedWarningTypeId) return;

    setSubmitting(true);
    try {
      await warningsApi.issue(
        guildId,
        selectedAllyCode,
        selectedWarningTypeId,
        note.trim() || undefined
      );
      const playerName = selectedMember?.playerName || selectedAllyCode;
      toast.success(`Warning issued to ${playerName}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to issue warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-gray-800 rounded-lg max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold mb-4">Issue Warning</h2>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Player Selection */}
            <div>
              <label htmlFor="player-search" className="block text-sm font-medium text-gray-400 mb-1">
                Player
              </label>
              <input
                type="text"
                id="player-search"
                value={playerSearch}
                onChange={(e) => {
                  setPlayerSearch(e.target.value);
                  setSelectedAllyCode('');
                }}
                placeholder="Search by name or ally code..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500 mb-2"
              />
              <select
                id="player-select"
                value={selectedAllyCode}
                onChange={(e) => setSelectedAllyCode(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
                size={5}
              >
                <option value="" disabled>
                  Select a player...
                </option>
                {filteredMembers.map((member) => (
                  <option key={member.allyCode} value={member.allyCode}>
                    {member.playerName} ({member.allyCode})
                  </option>
                ))}
              </select>
              {selectedMember && (
                <div className="mt-2 text-sm text-indigo-400">
                  Selected: {selectedMember.playerName}
                </div>
              )}
            </div>

            {/* Warning Type Selection */}
            <div>
              <label htmlFor="warning-type" className="block text-sm font-medium text-gray-400 mb-1">
                Warning Type
              </label>
              <select
                id="warning-type"
                value={selectedWarningTypeId ?? ''}
                onChange={(e) => setSelectedWarningTypeId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
                required
              >
                <option value="">Select a warning type...</option>
                {warningTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    [{type.severity}] {type.name}
                  </option>
                ))}
              </select>
              {selectedWarningTypeId && (
                <div className="mt-2 flex items-center gap-2">
                  {warningTypes
                    .filter((t) => t.id === selectedWarningTypeId)
                    .map((type) => (
                      <span key={type.id} className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded ${getSeverityColor(
                            type.severity
                          )}`}
                        >
                          {type.severity}
                        </span>
                        <span className="text-sm text-gray-300">{type.name}</span>
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Note */}
            <div>
              <label htmlFor="note" className="block text-sm font-medium text-gray-400 mb-1">
                Note (optional)
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                placeholder="Additional details about this warning..."
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500 resize-none"
              />
              <div className="text-xs text-gray-500 text-right mt-1">
                {note.length}/500
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedAllyCode || !selectedWarningTypeId}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors font-semibold"
              >
                {submitting ? 'Issuing...' : 'Issue Warning'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
