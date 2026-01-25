'use client';

import { useAuth } from '../../../../lib/auth-context';
import {
  automationsApi,
  warningsApi,
  Automation,
  AutomationTypesRegistry,
  WarningType,
} from '../../../../lib/api';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type FormMode = 'none' | 'add' | 'edit';

interface ThresholdConfig {
  threshold: number;
  warningTypeId: number;
}

interface FormData {
  automationType: string;
  interval: string;
  enabled: boolean;
  thresholds: ThresholdConfig[];
  channelId: string;
}

const INTERVAL_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly (Mon-Sun)',
  monthly: 'Monthly',
};

const TRIGGER_DESCRIPTIONS: Record<string, string> = {
  interval: 'Runs periodically',
  event: 'Triggered by system',
  calendar: 'Scheduled',
};

const PROCESSED_BY_LABELS: Record<string, string> = {
  backend: 'Server',
  bot: 'Discord Bot',
};

export default function AutomationsPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [automationTypes, setAutomationTypes] = useState<AutomationTypesRegistry>({});
  const [warningTypes, setWarningTypes] = useState<WarningType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>('none');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>({
    automationType: 'ticket_warning',
    interval: 'weekly',
    enabled: true,
    thresholds: [{ threshold: 600, warningTypeId: 0 }],
    channelId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  // Check officer permission
  useEffect(() => {
    if (selectedPlayer && selectedPlayer.memberLevel < 3) {
      router.push('/dashboard');
    }
  }, [selectedPlayer, router]);

  const fetchData = useCallback(async () => {
    if (!selectedPlayer) return;

    setLoading(true);
    setError(null);
    try {
      const [automationsRes, typesRes, warningTypesRes] = await Promise.all([
        automationsApi.list(selectedPlayer.guildId),
        automationsApi.getTypes(),
        warningsApi.getTypes(selectedPlayer.guildId),
      ]);
      setAutomations(automationsRes.automations);
      setAutomationTypes(typesRes.automationTypes);
      setWarningTypes(warningTypesRes.warningTypes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedPlayer]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getTypeName = (typeKey: string) => {
    return automationTypes[typeKey]?.name || typeKey;
  };

  const formatNextRun = (nextRunAt?: string) => {
    if (!nextRunAt) return 'Not scheduled';
    const date = new Date(nextRunAt);
    return date.toLocaleString();
  };

  const formatLastRun = (lastRunAt?: string) => {
    if (!lastRunAt) return 'Never';
    const date = new Date(lastRunAt);
    return date.toLocaleString();
  };

  const handleAddClick = () => {
    // Find types that aren't already configured
    const existingTypes = new Set(automations.map((a) => a.automationType));
    const availableTypes = Object.keys(automationTypes).filter(
      (t) => !existingTypes.has(t)
    );

    if (availableTypes.length === 0) {
      toast.error('All automation types are already configured');
      return;
    }

    const firstType = availableTypes[0];
    const typeConfig = automationTypes[firstType];

    setFormMode('add');
    setEditingId(null);
    setFormData({
      automationType: firstType,
      interval: typeConfig?.intervals[0] || 'weekly',
      enabled: true,
      thresholds: [{ threshold: 600, warningTypeId: warningTypes[0]?.id || 0 }],
      channelId: '',
    });
  };

  const handleEditClick = (automation: Automation) => {
    const config = automation.config as { thresholds?: ThresholdConfig[]; channelId?: string };
    setFormMode('edit');
    setEditingId(automation.id);
    setFormData({
      automationType: automation.automationType,
      interval: automation.interval || 'weekly',
      enabled: automation.enabled,
      thresholds: config.thresholds || [
        { threshold: 600, warningTypeId: warningTypes[0]?.id || 0 },
      ],
      channelId: config.channelId || '',
    });
  };

  const handleCancelForm = () => {
    setFormMode('none');
    setEditingId(null);
    setFormData({
      automationType: 'ticket_warning',
      interval: 'weekly',
      enabled: true,
      thresholds: [{ threshold: 600, warningTypeId: warningTypes[0]?.id || 0 }],
      channelId: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer) return;

    // Validate thresholds
    if (formData.thresholds.some((t) => t.warningTypeId === 0)) {
      toast.error('Please select a warning type for each threshold');
      return;
    }

    setSubmitting(true);
    try {
      const typeConfig = automationTypes[formData.automationType];
      const config: Record<string, unknown> = {};

      // Add thresholds if the type supports them
      if (typeConfig?.config?.hasThresholds) {
        config.thresholds = formData.thresholds;
      }

      // Add channelId if the type supports it
      if (typeConfig?.config?.hasChannelId) {
        config.channelId = formData.channelId || null;
      }

      if (formMode === 'add') {
        await automationsApi.create({
          guildId: selectedPlayer.guildId,
          automationType: formData.automationType,
          interval: formData.interval,
          config,
          enabled: formData.enabled,
        });
        toast.success('Automation created successfully');
      } else if (formMode === 'edit' && editingId !== null) {
        await automationsApi.update(editingId, {
          interval: formData.interval,
          config,
          enabled: formData.enabled,
        });
        toast.success('Automation updated successfully');
      }
      handleCancelForm();
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Operation failed';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId === null) return;

    setSubmitting(true);
    try {
      await automationsApi.delete(deleteConfirmId);
      toast.success('Automation deleted successfully');
      setDeleteConfirmId(null);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  const handleToggleEnabled = async (automation: Automation) => {
    try {
      await automationsApi.update(automation.id, {
        enabled: !automation.enabled,
      });
      toast.success(
        automation.enabled ? 'Automation disabled' : 'Automation enabled'
      );
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      toast.error(message);
    }
  };

  const addThreshold = () => {
    setFormData({
      ...formData,
      thresholds: [
        ...formData.thresholds,
        { threshold: 500, warningTypeId: warningTypes[0]?.id || 0 },
      ],
    });
  };

  const removeThreshold = (index: number) => {
    if (formData.thresholds.length <= 1) return;
    setFormData({
      ...formData,
      thresholds: formData.thresholds.filter((_, i) => i !== index),
    });
  };

  const updateThreshold = (
    index: number,
    field: 'threshold' | 'warningTypeId',
    value: number
  ) => {
    const newThresholds = [...formData.thresholds];
    newThresholds[index] = { ...newThresholds[index], [field]: value };
    setFormData({ ...formData, thresholds: newThresholds });
  };

  const getWarningTypeName = (id: number) => {
    return warningTypes.find((wt) => wt.id === id)?.name || 'Unknown';
  };

  if (!selectedPlayer || selectedPlayer.memberLevel < 3) {
    return <div className="text-center py-8">Access denied</div>;
  }

  if (loading && automations.length === 0) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  const availableTypesForAdd = Object.keys(automationTypes).filter(
    (t) => !automations.some((a) => a.automationType === t)
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Automations</h1>
        <button
          onClick={handleAddClick}
          disabled={formMode !== 'none' || availableTypesForAdd.length === 0}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors font-semibold"
        >
          Add Automation
        </button>
      </div>

      {/* Add/Edit Form */}
      {formMode !== 'none' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {formMode === 'add' ? 'Add New Automation' : 'Edit Automation'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Automation Type (only for add) */}
            {formMode === 'add' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Type
                </label>
                <select
                  value={formData.automationType}
                  onChange={(e) => {
                    const typeConfig = automationTypes[e.target.value];
                    setFormData({
                      ...formData,
                      automationType: e.target.value,
                      interval: typeConfig?.intervals[0] || 'weekly',
                    });
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
                >
                  {availableTypesForAdd.map((typeKey) => (
                    <option key={typeKey} value={typeKey}>
                      {automationTypes[typeKey]?.name || typeKey}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Interval (only for calendar-triggered automations) */}
            {automationTypes[formData.automationType]?.triggerType === 'calendar' &&
              (automationTypes[formData.automationType]?.intervals?.length ?? 0) > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Schedule
                </label>
                <select
                  value={formData.interval}
                  onChange={(e) =>
                    setFormData({ ...formData, interval: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
                >
                  {automationTypes[formData.automationType]?.intervals.map((interval) => (
                    <option key={interval} value={interval}>
                      {INTERVAL_LABELS[interval] || interval}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Enabled */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) =>
                  setFormData({ ...formData, enabled: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="enabled" className="text-sm text-gray-300">
                Enabled
              </label>
            </div>

            {/* Thresholds (for ticket_warning type) */}
            {automationTypes[formData.automationType]?.config?.hasThresholds && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-400">
                    {automationTypes[formData.automationType]?.config
                      ?.thresholdLabel || 'Thresholds'}
                  </label>
                  <button
                    type="button"
                    onClick={addThreshold}
                    className="text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    + Add Threshold
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.thresholds.map((threshold, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-gray-750 p-2 rounded"
                    >
                      <input
                        type="number"
                        value={threshold.threshold}
                        onChange={(e) =>
                          updateThreshold(
                            index,
                            'threshold',
                            Number(e.target.value)
                          )
                        }
                        min={0}
                        max={600}
                        className="w-24 px-2 py-1 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500 text-sm"
                      />
                      <span className="text-gray-400 text-sm">tickets</span>
                      <span className="text-gray-500">→</span>
                      <select
                        value={threshold.warningTypeId}
                        onChange={(e) =>
                          updateThreshold(
                            index,
                            'warningTypeId',
                            Number(e.target.value)
                          )
                        }
                        className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500 text-sm"
                      >
                        <option value={0}>Select warning type...</option>
                        {warningTypes.map((wt) => (
                          <option key={wt.id} value={wt.id}>
                            {wt.name} (Severity {wt.severity})
                          </option>
                        ))}
                      </select>
                      {formData.thresholds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeThreshold(index)}
                          className="text-red-400 hover:text-red-300 text-sm px-2"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Players with average tickets below each threshold will receive
                  the corresponding warning.
                </p>
              </div>
            )}

            {/* Channel ID (for notification types) */}
            {automationTypes[formData.automationType]?.config?.hasChannelId && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Discord Channel ID
                </label>
                <input
                  type="text"
                  value={formData.channelId}
                  onChange={(e) =>
                    setFormData({ ...formData, channelId: e.target.value })
                  }
                  placeholder="Enter Discord channel ID (e.g., 1234567890123456789)"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The Discord channel where notifications will be sent. You can get
                  this by right-clicking a channel in Discord and selecting &quot;Copy Channel ID&quot;
                  (requires Developer Mode enabled in Discord settings).
                </p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors font-semibold"
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                disabled={submitting}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Automations List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                Schedule
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                Processor
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                Next Run
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                Last Run
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {automations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No automations configured. Click &quot;Add Automation&quot; to
                  create one.
                </td>
              </tr>
            ) : (
              automations.map((automation) => (
                <tr key={automation.id} className="hover:bg-gray-750">
                  <td className="px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium">
                        {getTypeName(automation.automationType)}
                        {automation.scope === 'system' && (
                          <span className="ml-2 text-xs text-gray-500">(System)</span>
                        )}
                      </div>
                      {(
                        automation.config as { thresholds?: ThresholdConfig[] }
                      )?.thresholds && (
                        <div className="text-xs text-gray-500 mt-1">
                          {(
                            automation.config as { thresholds: ThresholdConfig[] }
                          ).thresholds.map((t, i) => (
                            <span key={i}>
                              {i > 0 && ', '}
                              &lt;{t.threshold} → {getWarningTypeName(t.warningTypeId)}
                            </span>
                          ))}
                        </div>
                      )}
                      {automationTypes[automation.automationType]?.config?.hasChannelId && (
                        <div className="text-xs text-gray-500 mt-1">
                          Channel: {(automation.config as { channelId?: string })?.channelId || (
                            <span className="text-yellow-500">Not configured</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {(() => {
                      const typeConfig = automationTypes[automation.automationType];
                      if (typeConfig?.triggerType === 'calendar' && automation.interval) {
                        return INTERVAL_LABELS[automation.interval] || automation.interval;
                      }
                      return TRIGGER_DESCRIPTIONS[typeConfig?.triggerType || ''] || '-';
                    })()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      automation.processedBy === 'bot'
                        ? 'bg-purple-600/30 text-purple-300'
                        : 'bg-blue-600/30 text-blue-300'
                    }`}>
                      {PROCESSED_BY_LABELS[automation.processedBy] || automation.processedBy}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleEnabled(automation)}
                      className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        automation.enabled
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                    >
                      {automation.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {formatNextRun(automation.nextRunAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {formatLastRun(automation.lastRunAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {deleteConfirmId === automation.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-gray-400 mr-2">
                          Delete?
                        </span>
                        <button
                          onClick={handleDeleteConfirm}
                          disabled={submitting}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded transition-colors text-sm font-semibold"
                        >
                          {submitting ? 'Deleting...' : 'Yes'}
                        </button>
                        <button
                          onClick={handleDeleteCancel}
                          disabled={submitting}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 rounded transition-colors text-sm"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(automation)}
                          disabled={formMode !== 'none'}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-sm"
                        >
                          Edit
                        </button>
                        {automation.scope !== 'system' && (
                          <button
                            onClick={() => handleDeleteClick(automation.id)}
                            disabled={formMode !== 'none'}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-sm"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
