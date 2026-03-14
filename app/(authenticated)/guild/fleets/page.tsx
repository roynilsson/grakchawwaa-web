'use client';

import { useAuth } from '../../../../lib/auth-context';
import {
  squadsApi,
  squadTagsApi,
  squadTemplatesApi,
  getUnitThumbnail,
  Squad,
  SquadTag,
  SquadSlot,
} from '../../../../lib/api';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';

export default function FleetsPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [fleets, setFleets] = useState<Squad[]>([]);
  const [tags, setTags] = useState<SquadTag[]>([]);
  const [templates, setTemplates] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copyingTemplateId, setCopyingTemplateId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  // Check officer permission
  useEffect(() => {
    if (selectedPlayer && selectedPlayer.memberLevel < 3 && !selectedPlayer.isAdmin) {
      router.push('/player');
    }
  }, [selectedPlayer, router]);

  const fetchFleets = useCallback(async () => {
    if (!selectedPlayer) return;

    setLoading(true);
    setError(null);
    try {
      const res = await squadsApi.list(
        selectedPlayer.guildId,
        'fleet',
        selectedTagId || undefined
      );
      setFleets(res.squads);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fleets');
    } finally {
      setLoading(false);
    }
  }, [selectedPlayer, selectedTagId]);

  const fetchTags = useCallback(async () => {
    if (!selectedPlayer) return;

    try {
      const res = await squadTagsApi.list(selectedPlayer.guildId);
      setTags(res.tags);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  }, [selectedPlayer]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await squadTemplatesApi.list('fleet');
      setTemplates(res.templates);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  }, []);

  useEffect(() => {
    fetchFleets();
  }, [fetchFleets]);

  useEffect(() => {
    fetchTags();
    fetchTemplates();
  }, [fetchTags, fetchTemplates]);

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId || !selectedPlayer) return;

    setSubmitting(true);
    try {
      await squadsApi.delete(selectedPlayer.guildId, deleteConfirmId);
      toast.success('Fleet deleted successfully');
      setDeleteConfirmId(null);
      fetchFleets();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete fleet';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  const handleCopyTemplate = async (templateId: string) => {
    if (!selectedPlayer) return;

    setCopyingTemplateId(templateId);
    try {
      await squadTemplatesApi.copyToGuild(selectedPlayer.guildId, templateId);
      toast.success('Template copied to guild fleets');
      setShowTemplates(false);
      fetchFleets();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to copy template';
      toast.error(message);
    } finally {
      setCopyingTemplateId(null);
    }
  };

  // Filter fleets by search query
  const filteredFleets = fleets.filter((fleet) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    // Search by fleet name
    if (fleet.name.toLowerCase().includes(query)) return true;

    // Search by ship names in slots
    for (const slot of fleet.slots) {
      for (const ship of slot.ships) {
        if (ship.ship.name.toLowerCase().includes(query)) return true;
      }
    }

    // Search by tag names
    for (const tag of fleet.tags) {
      if (tag.name.toLowerCase().includes(query)) return true;
    }

    return false;
  });

  // Pagination
  const totalPages = Math.ceil(filteredFleets.length / itemsPerPage);
  const paginatedFleets = filteredFleets.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedTagId, searchQuery]);

  // Helper to render requirement badges on ship portrait
  const renderShipRequirementBadges = (slot: SquadSlot) => {
    const badges: React.ReactNode[] = [];

    // Crew relic level (bottom-right)
    if (slot.minCrewRelicLevel && slot.minCrewRelicLevel > 0) {
      badges.push(
        <div key="crew" className="absolute -bottom-1 -right-1 px-1 bg-orange-600 rounded text-[8px] font-bold">
          R{slot.minCrewRelicLevel}
        </div>
      );
    }

    // Rarity (bottom-left)
    if (slot.minRarity && slot.minRarity > 1) {
      badges.push(
        <div key="rarity" className="absolute -bottom-1 -left-1 px-1 bg-yellow-600 rounded text-[8px] font-bold text-black">
          {slot.minRarity}★
        </div>
      );
    }

    return badges;
  };

  // Helper to render ship slot
  const renderShipSlot = (slot: SquadSlot | null, label?: string) => {
    if (!slot || slot.ships.length === 0) {
      return (
        <div className="flex flex-col items-center w-12">
          <div className="w-10 h-10 bg-gray-800 rounded-lg border border-gray-700" />
          {label && <span className="text-[8px] text-gray-600 mt-0.5">{label}</span>}
        </div>
      );
    }

    const ship = slot.ships[0];
    return (
      <div className="flex flex-col items-center w-12" title={ship.ship.name}>
        <div className="relative">
          <Image
            src={getUnitThumbnail(ship.ship.thumbnailName)}
            alt={ship.ship.name}
            width={40}
            height={40}
            className="rounded-lg"
          />
          {renderShipRequirementBadges(slot)}
        </div>
        {label && <span className="text-[8px] text-gray-500 mt-0.5">{label}</span>}
      </div>
    );
  };

  // Render fleet composition: Capital | Starting (3) | Reinforcements (4)
  const renderFleetSlots = (fleet: Squad) => {
    // Position 0 = Capital
    // Positions 1-3 = Starting
    // Positions 4-7 = Reinforcements
    const slotsByPosition: Record<number, SquadSlot> = {};
    for (const slot of fleet.slots) {
      slotsByPosition[slot.position] = slot;
    }

    return (
      <div className="flex items-start gap-2">
        {/* Capital Ship */}
        <div className="flex flex-col items-center">
          {renderShipSlot(slotsByPosition[0], 'Cap')}
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-gray-600 self-center" />

        {/* Starting Ships */}
        <div className="flex gap-0.5">
          {[1, 2, 3].map((pos) => (
            <div key={pos}>
              {renderShipSlot(slotsByPosition[pos])}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-gray-600 self-center" />

        {/* Reinforcements */}
        <div className="flex gap-0.5">
          {[4, 5, 6, 7].map((pos) => (
            <div key={pos}>
              {renderShipSlot(slotsByPosition[pos])}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!selectedPlayer || (selectedPlayer.memberLevel < 3 && !selectedPlayer.isAdmin)) {
    return <div className="text-center py-8">Access denied</div>;
  }

  if (loading && fleets.length === 0) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Fleets</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors font-semibold"
          >
            Browse Templates
          </button>
          <button
            onClick={() => router.push('/guild/fleets/new')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors font-semibold"
          >
            Add Fleet
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            <label htmlFor="search" className="text-sm font-medium text-gray-400 whitespace-nowrap">
              Search:
            </label>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ship, or tag..."
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="tagFilter" className="text-sm font-medium text-gray-400 whitespace-nowrap">
              Tag:
            </label>
            <select
              id="tagFilter"
              value={selectedTagId}
              onChange={(e) => setSelectedTagId(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Tags</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Fleets Table */}
      {filteredFleets.length === 0 ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center text-gray-400">
          {fleets.length === 0
            ? 'No fleets found. Click "Add Fleet" or "Browse Templates" to create one.'
            : 'No fleets match your search criteria.'}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Fleet Composition</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Tags</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {paginatedFleets.map((fleet) => (
                  <tr key={fleet.id} className="hover:bg-gray-750">
                    <td className="px-4 py-4">
                      <div className="font-medium">{fleet.name}</div>
                      {fleet.description && (
                        <div className="text-sm text-gray-400 mt-1">{fleet.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {renderFleetSlots(fleet)}
                    </td>
                    <td className="px-4 py-4">
                      {fleet.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {fleet.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-300"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        {deleteConfirmId === fleet.id ? (
                          <>
                            <span className="text-sm text-gray-400 mr-2 self-center">Delete?</span>
                            <button
                              onClick={handleDeleteConfirm}
                              disabled={submitting}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded transition-colors text-sm font-semibold"
                            >
                              {submitting ? '...' : 'Yes'}
                            </button>
                            <button
                              onClick={handleDeleteCancel}
                              disabled={submitting}
                              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 rounded transition-colors text-sm"
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => router.push(`/guild/fleets/${fleet.id}/edit`)}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(fleet.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded transition-colors text-sm"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="text-sm text-gray-400">
                Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredFleets.length)} of {filteredFleets.length} fleets
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold">Fleet Templates</h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {templates.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  No fleet templates available.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Fleet Composition</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Tags</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {templates.map((template) => (
                        <tr key={template.id} className="hover:bg-gray-750">
                          <td className="px-4 py-4">
                            <div className="font-medium">{template.name}</div>
                            {template.description && (
                              <div className="text-sm text-gray-400 mt-1">{template.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {renderFleetSlots(template)}
                          </td>
                          <td className="px-4 py-4">
                            {template.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {template.tags.map((tag) => (
                                  <span
                                    key={tag.id}
                                    className="px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-300"
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end">
                              <button
                                onClick={() => handleCopyTemplate(template.id)}
                                disabled={copyingTemplateId === template.id}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded transition-colors text-sm font-semibold"
                              >
                                {copyingTemplateId === template.id ? 'Copying...' : 'Copy to Guild'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
