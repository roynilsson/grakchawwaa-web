'use client';

import { useAuth } from '../../../../lib/auth-context';
import { guildApi, GuildMemberDetailed, getMemberRole } from '../../../../lib/api';
import { useState, useEffect, useCallback, useMemo } from 'react';

type SortField = 'name' | 'allyCode' | 'discordUsername' | 'role' | 'level' | 'gp' | 'joined' | 'activity';
type SortDirection = 'asc' | 'desc';

export default function MembersPage() {
  const { session } = useAuth();
  const [members, setMembers] = useState<GuildMemberDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMembersOnly, setCurrentMembersOnly] = useState(true);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  const fetchMembers = useCallback(async () => {
    if (!selectedPlayer) return;

    setLoading(true);
    setError(null);
    try {
      const response = await guildApi.getMembersDetailed(
        selectedPlayer.guildId,
        !currentMembersOnly
      );
      setMembers(response.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [selectedPlayer, currentMembersOnly]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedMembers = useMemo(() => {
    const sorted = [...members].sort((a, b) => {
      let aVal: string | number | undefined;
      let bVal: string | number | undefined;

      switch (sortField) {
        case 'name':
          aVal = a.player.name?.toLowerCase() || '';
          bVal = b.player.name?.toLowerCase() || '';
          break;
        case 'allyCode':
          aVal = a.player.allyCode;
          bVal = b.player.allyCode;
          break;
        case 'discordUsername':
          aVal = a.player.discordUsername?.toLowerCase() || '';
          bVal = b.player.discordUsername?.toLowerCase() || '';
          break;
        case 'role':
          aVal = a.memberLevel || 0;
          bVal = b.memberLevel || 0;
          break;
        case 'level':
          aVal = a.player.playerLevel || 0;
          bVal = b.player.playerLevel || 0;
          break;
        case 'gp':
          aVal = Number(a.player.galacticPower) || 0;
          bVal = Number(b.player.galacticPower) || 0;
          break;
        case 'joined':
          aVal = new Date(a.joinedAt).getTime();
          bVal = new Date(b.joinedAt).getTime();
          break;
        case 'activity':
          aVal = a.player.lastActivityTime ? new Date(a.player.lastActivityTime).getTime() : 0;
          bVal = b.player.lastActivityTime ? new Date(b.player.lastActivityTime).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [members, sortField, sortDirection]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatNumber = (num?: number | string) => {
    if (!num) return '-';
    return Number(num).toLocaleString();
  };

  const getRoleBadgeColor = (level?: number) => {
    if (level === 4) return 'bg-yellow-600 text-yellow-100';
    if (level === 3) return 'bg-blue-600 text-blue-100';
    return 'bg-gray-600 text-gray-100';
  };

  const SortableHeader = ({
    field,
    children,
    align = 'left',
  }: {
    field: SortField;
    children: React.ReactNode;
    align?: 'left' | 'right' | 'center';
  }) => {
    const isActive = sortField === field;
    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

    return (
      <th
        className={`px-4 py-3 text-sm font-semibold cursor-pointer hover:bg-gray-600 select-none ${alignClass}`}
        onClick={() => handleSort(field)}
      >
        <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
          {children}
          <span className="text-gray-400">
            {isActive ? (
              sortDirection === 'asc' ? '↑' : '↓'
            ) : (
              '⇅'
            )}
          </span>
        </div>
      </th>
    );
  };

  if (!selectedPlayer) {
    return <div className="text-center py-8">Please select a player</div>;
  }

  if (loading && members.length === 0) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  const activeMembers = members.filter((m) => m.isActive);
  const formerMembers = members.filter((m) => !m.isActive);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Guild Members</h1>
          <p className="text-gray-400 text-sm mt-1">
            {activeMembers.length} current member{activeMembers.length !== 1 ? 's' : ''}
            {formerMembers.length > 0 &&
              ` • ${formerMembers.length} former`}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={currentMembersOnly}
            onChange={(e) => setCurrentMembersOnly(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-gray-300">Current members only</span>
        </label>
      </div>

      {/* Members Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <SortableHeader field="name">Player Name</SortableHeader>
                <SortableHeader field="allyCode">Ally Code</SortableHeader>
                <SortableHeader field="discordUsername">Discord</SortableHeader>
                <SortableHeader field="role">Role</SortableHeader>
                <SortableHeader field="level" align="right">Level</SortableHeader>
                <SortableHeader field="gp" align="right">Galactic Power</SortableHeader>
                <SortableHeader field="joined">Joined</SortableHeader>
                <SortableHeader field="activity">Last Activity</SortableHeader>
                <th className="px-4 py-3 text-center text-sm font-semibold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sortedMembers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    No members found
                  </td>
                </tr>
              ) : (
                sortedMembers.map((member) => (
                  <tr
                    key={member.player.allyCode}
                    className={`hover:bg-gray-750 ${
                      !member.isActive ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-medium">
                      {member.player.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                      {member.player.allyCode}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {member.player.discordUsername || (member.player.discordId ? '(registered)' : '-')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-0.5 text-xs rounded font-semibold ${getRoleBadgeColor(
                          member.memberLevel
                        )}`}
                      >
                        {member.memberLevel
                          ? getMemberRole(member.memberLevel)
                          : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-400">
                      {formatNumber(member.player.playerLevel)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-400">
                      {formatNumber(member.player.galacticPower)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(member.joinedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(member.player.lastActivityTime)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {member.isActive ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                      ) : (
                        <span className="inline-block w-2 h-2 rounded-full bg-gray-500"></span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
          <span>Current</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-gray-500"></span>
          <span>Former</span>
        </div>
      </div>
    </div>
  );
}
