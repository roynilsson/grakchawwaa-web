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
  const [configs, setConfigs] = useState<Record<string, ConfigData>>({
    order66: { guildMinScore: '', playerScores: {} },
    naboo: { guildMinScore: '', playerScores: {} },
    krayt: { guildMinScore: '', playerScores: {} },
  });
  const [members, setMembers] = useState<GuildMemberDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  // Check officer permission
  useEffect(() => {
    if (selectedPlayer && selectedPlayer.memberLevel < 3 && !selectedPlayer.isAdmin) {
      router.push('/dashboard');
    }
  }, [selectedPlayer, router]);

  const fetchConfigs = useCallback(async () => {
    if (!selectedPlayer) return;

    setLoading(true);
    try {
      const [membersData, ...raidDataArray] = await Promise.all([
        guildApi.getMembersDetailed(selectedPlayer.guildId, false),
        ...RAID_TYPES.map(type => raidsApi.getActive(selectedPlayer.guildId)),
      ]);

      setMembers(membersData.members);

      const newConfigs: Record<string, ConfigData> = {};

      RAID_TYPES.forEach((type, index) => {
        const raidData = raidDataArray[index];

        newConfigs[type.value] = {
          guildMinScore: raidData.guildConfig?.guildMinScore?.toString() || '',
          playerScores: {},
        };

        // Set player scores from existing configs
        raidData.playerConfigs.forEach(config => {
          if (config.playerMinScore) {
            newConfigs[type.value].playerScores[config.player.allyCode] = config.playerMinScore.toString();
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
