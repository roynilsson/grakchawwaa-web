'use client';

import { useState, useEffect } from 'react';
import { warningsApi, Warning, WarningType } from '../lib/api';
import { toast } from 'sonner';

interface EditWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  warning: Warning | null;
  guildId: string;
  editedByAllyCode: string;
  onSuccess: () => void;
}

export function EditWarningModal({
  isOpen,
  onClose,
  warning,
  guildId,
  editedByAllyCode,
  onSuccess,
}: EditWarningModalProps) {
  const [warningTypes, setWarningTypes] = useState<WarningType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedWarningTypeId, setSelectedWarningTypeId] = useState<number | null>(null);
  const [note, setNote] = useState('');

  // Load warning types when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    warningsApi.getTypes(guildId)
      .then((typesRes) => {
        setWarningTypes(typesRes.warningTypes);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to load warning types');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, guildId]);

  // Set initial form values when warning changes
  useEffect(() => {
    if (warning) {
      setSelectedWarningTypeId(warning.warningType.id);
      setNote(warning.note || '');
    }
  }, [warning]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedWarningTypeId(null);
      setNote('');
    }
  }, [isOpen]);

  const getSeverityColor = (severity: number) => {
    if (severity >= 7) return 'bg-red-600';
    if (severity >= 4) return 'bg-yellow-600';
    return 'bg-blue-600';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warning || !selectedWarningTypeId) return;

    setSubmitting(true);
    try {
      await warningsApi.update(
        guildId,
        warning.id,
        {
          note: note.trim() || undefined,
          warningTypeId: selectedWarningTypeId,
        },
        editedByAllyCode
      );
      toast.success('Warning updated');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !warning) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-gray-800 rounded-lg max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold mb-4">Edit Warning</h2>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Player (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Player
              </label>
              <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300">
                {warning.player.name || warning.player.allyCode}
              </div>
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
                disabled={submitting || !selectedWarningTypeId}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors font-semibold"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
