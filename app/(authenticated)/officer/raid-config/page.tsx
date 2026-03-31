'use client';

import { useAuth } from '../../../../lib/auth-context';
import { raidsApi, guildApi, GuildMemberDetailed } from '../../../../lib/api';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const RAID_TYPES = [
  { value: 'order66', label: 'Order 66' },
  { value: 'naboo', label: 'Naboo' },
  { value: 'krayt', label: 'Krayt Dragon' },
];

interface ConfigData {
  guildMinScore: string;
  playerScores: Record<string, string>;
}

export default function RaidConfigPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [selectedRaidType, setSelectedRaidType] = useState('krayt');
  const [defaultRaidType, setDefaultRaidType] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Record<string, ConfigData>>({
    order66: { guildMinScore: '', playerScores: {} },
    naboo: { guildMinScore: '', playerScores: {} },
    krayt: { guildMinScore: '', playerScores: {} },
  });
  const [members, setMembers] = useState<GuildMemberDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  // Check officer permission
  useEffect(() => {
    if (selectedPlayer && selectedPlayer.memberLevel < 3 && !selectedPlayer.isAdmin) {
      router.push('/player');
    }
  }, [selectedPlayer, router]);

  const fetchConfigs = useCallback(async () => {
    if (!selectedPlayer) return;

    setLoading(true);
    try {
      const [membersData, configsData] = await Promise.all([
        guildApi.getMembersDetailed(selectedPlayer.guildId, false),
        raidsApi.getConfigs(selectedPlayer.guildId),
      ]);

      setMembers(membersData.members);

      // Get default raid type from response
      const serverDefaultRaidType = configsData.defaultRaidType ?? null;
      setDefaultRaidType(serverDefaultRaidType);

      // Pre-select the default raid type if available
      if (serverDefaultRaidType) {
        setSelectedRaidType(serverDefaultRaidType);
      }

      const newConfigs: Record<string, ConfigData> = {};

      RAID_TYPES.forEach((type) => {
        const guildConfig = configsData.guildConfigs[type.value];
        const playerConfigsForType = configsData.playerConfigs[type.value] || [];

        newConfigs[type.value] = {
          guildMinScore: guildConfig?.guildMinScore?.toString() || '',
          playerScores: {},
        };

        // Set player scores from existing configs
        playerConfigsForType.forEach(config => {
          if (config.playerMinScore !== undefined) {
            newConfigs[type.value].playerScores[config.allyCode] = config.playerMinScore.toString();
          }
        });
      });

      setConfigs(newConfigs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load configurations');
    } finally {
      setLoading(false);
    }
  }, [selectedPlayer]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleSaveGuildTarget = async () => {
    if (!selectedPlayer || !configs[selectedRaidType].guildMinScore) return;

    setSaving(true);
    try {
      await raidsApi.updateGuildConfig(
        selectedPlayer.guildId,
        selectedRaidType,
        parseInt(configs[selectedRaidType].guildMinScore)
      );
      toast.success('Guild target saved successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save guild target');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePlayerTarget = async (allyCode: string) => {
    if (!selectedPlayer || !configs[selectedRaidType].playerScores[allyCode]) return;

    setSaving(true);
    try {
      await raidsApi.updatePlayerConfig(
        selectedPlayer.guildId,
        selectedRaidType,
        allyCode,
        parseInt(configs[selectedRaidType].playerScores[allyCode])
      );
      toast.success('Player target saved successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save player target');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAllPlayerTargets = async () => {
    if (!selectedPlayer) return;

    setSaving(true);
    const updates = Object.entries(configs[selectedRaidType].playerScores).filter(([_, score]) => score);

    try {
      await Promise.all(
        updates.map(([allyCode, score]) =>
          raidsApi.updatePlayerConfig(
            selectedPlayer.guildId,
            selectedRaidType,
            allyCode,
            parseInt(score)
          )
        )
      );
      toast.success(`Saved ${updates.length} player targets for ${selectedRaidType}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save player targets');
    } finally {
      setSaving(false);
    }
  };

  const updateGuildMinScore = (value: string) => {
    setConfigs({
      ...configs,
      [selectedRaidType]: {
        ...configs[selectedRaidType],
        guildMinScore: value,
      },
    });
  };

  const updatePlayerScore = (allyCode: string, value: string) => {
    setConfigs({
      ...configs,
      [selectedRaidType]: {
        ...configs[selectedRaidType],
        playerScores: {
          ...configs[selectedRaidType].playerScores,
          [allyCode]: value,
        },
      },
    });
  };

  const handleSetDefaultRaidType = async () => {
    if (!selectedPlayer) return;

    setSettingDefault(true);
    try {
      await raidsApi.setDefaultRaidType(selectedPlayer.guildId, selectedRaidType);
      setDefaultRaidType(selectedRaidType);
      toast.success(`Set ${RAID_TYPES.find(t => t.value === selectedRaidType)?.label} as guild default`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set default raid type');
    } finally {
      setSettingDefault(false);
    }
  };

  if (!selectedPlayer || selectedPlayer.memberLevel < 3 && !selectedPlayer.isAdmin) {
    return <div className="text-center py-8">Access denied</div>;
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const currentConfig = configs[selectedRaidType];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Raid Configuration</h1>

      {/* Raid Type Selector */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <label className="block text-sm font-medium mb-2">Raid Type</label>
        <select
          value={selectedRaidType}
          onChange={(e) => setSelectedRaidType(e.target.value)}
          className="w-full md:w-64 px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
        >
          {RAID_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        {/* Default Raid Indicator/Button */}
        <div className="mt-3">
          {selectedRaidType === defaultRaidType ? (
            <span className="inline-flex items-center text-sm text-green-400">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Guild Default
            </span>
          ) : (
            <button
              onClick={handleSetDefaultRaidType}
              disabled={settingDefault}
              className="text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {settingDefault ? 'Setting...' : 'Make Guild Default'}
            </button>
          )}
        </div>

        <p className="mt-2 text-xs text-gray-400">
          Configure minimum score targets for this raid type. These targets will be used for warnings and tracking.
        </p>
      </div>

      {/* Guild Target */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Guild Target</h2>
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium mb-2">Minimum Guild Score</label>
            <input
              type="number"
              value={currentConfig.guildMinScore}
              onChange={(e) => updateGuildMinScore(e.target.value)}
              min={0}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
              placeholder="Enter guild minimum score"
            />
          </div>
          <button
            onClick={handleSaveGuildTarget}
            disabled={saving || !currentConfig.guildMinScore}
            className="w-full sm:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors font-semibold"
          >
            {saving ? 'Saving...' : 'Save Guild Target'}
          </button>
        </div>
      </div>

      {/* Player Targets */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold">Player Targets</h2>
          <button
            onClick={handleSaveAllPlayerTargets}
            disabled={saving || Object.keys(currentConfig.playerScores).length === 0}
            className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors font-semibold"
          >
            {saving ? 'Saving...' : 'Save All Player Targets'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Player</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Ally Code</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Minimum Score</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {members.map((member) => (
                <tr key={member.player.allyCode} className="hover:bg-gray-750">
                  <td className="px-4 py-3 text-sm">
                    {member.player.name || 'Unknown Player'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {member.player.allyCode}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={currentConfig.playerScores[member.player.allyCode] || ''}
                      onChange={(e) => updatePlayerScore(member.player.allyCode, e.target.value)}
                      min={0}
                      className="w-32 px-3 py-1 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500 text-sm"
                      placeholder="Score"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleSavePlayerTarget(member.player.allyCode)}
                      disabled={saving || !currentConfig.playerScores[member.player.allyCode]}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-sm"
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
