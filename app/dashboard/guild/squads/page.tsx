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

export default function SquadsPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [squads, setSquads] = useState<Squad[]>([]);
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
      router.push('/dashboard');
    }
  }, [selectedPlayer, router]);

  const fetchSquads = useCallback(async () => {
    if (!selectedPlayer) return;

    setLoading(true);
    setError(null);
    try {
      const res = await squadsApi.list(
        selectedPlayer.guildId,
        'squad',
        selectedTagId || undefined
      );
      setSquads(res.squads);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load squads');
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
      const res = await squadTemplatesApi.list('squad');
      setTemplates(res.templates);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  }, []);

  useEffect(() => {
    fetchSquads();
  }, [fetchSquads]);

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
      toast.success('Squad deleted successfully');
      setDeleteConfirmId(null);
      fetchSquads();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete squad';
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
      toast.success('Template copied to guild squads');
      setShowTemplates(false);
      fetchSquads();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to copy template';
      toast.error(message);
    } finally {
      setCopyingTemplateId(null);
    }
  };

  // Filter squads by search query
  const filteredSquads = squads.filter((squad) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    // Search by squad name
    if (squad.name.toLowerCase().includes(query)) return true;

    // Search by character names in slots
    for (const slot of squad.slots) {
      for (const char of slot.characters) {
        if (char.character.name.toLowerCase().includes(query)) return true;
      }
    }

    // Search by tag names
    for (const tag of squad.tags) {
      if (tag.name.toLowerCase().includes(query)) return true;
    }

    return false;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSquads.length / itemsPerPage);
  const paginatedSquads = filteredSquads.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedTagId, searchQuery]);

  // Helper to render requirement badges on portrait
  const renderRequirementBadges = (slot: SquadSlot) => {
    const badges: React.ReactNode[] = [];

    // Relic level (bottom-right, most important)
    if (slot.minRelicLevel && slot.minRelicLevel > 0) {
      badges.push(
        <div key="relic" className="absolute -bottom-1 -right-1 px-1 bg-orange-600 rounded text-[9px] font-bold">
          R{slot.minRelicLevel}
        </div>
      );
    } else if (slot.minGearLevel && slot.minGearLevel > 1) {
      // Gear level only if no relic
      badges.push(
        <div key="gear" className="absolute -bottom-1 -right-1 px-1 bg-blue-600 rounded text-[9px] font-bold">
          G{slot.minGearLevel}
        </div>
      );
    }

    // Rarity (bottom-left, as stars)
    if (slot.minRarity && slot.minRarity > 1) {
      badges.push(
        <div key="rarity" className="absolute -bottom-1 -left-1 px-1 bg-yellow-600 rounded text-[9px] font-bold text-black">
          {slot.minRarity}★
        </div>
      );
    }

    return badges;
  };

  // Helper to render slot content
  const renderSlot = (slot: SquadSlot, position: number) => {
    if (slot.slotType === 'specific' && slot.characters.length > 0) {
      const char = slot.characters[0];
      return (
        <div key={position} className="flex flex-col items-center w-14" title={char.character.name}>
          <div className="relative">
            <Image
              src={getUnitThumbnail(char.character.thumbnailName)}
              alt={char.character.name}
              width={48}
              height={48}
              className="rounded-lg"
            />
            {/* Leader badge */}
            {position === 0 && (
              <div className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-[10px] font-bold text-black">L</span>
              </div>
            )}
            {/* Zeta badge */}
            {char.requiredZetas?.length ? (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-[9px] font-bold">Z</span>
              </div>
            ) : null}
            {/* Omicron badge (next to zeta or in its place) */}
            {char.requiredOmicrons?.length ? (
              <div className={`absolute -top-1 ${char.requiredZetas?.length ? 'right-3' : '-right-1'} w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center`}>
                <span className="text-[9px] font-bold text-black">O</span>
              </div>
            ) : null}
            {/* Requirement badges */}
            {renderRequirementBadges(slot)}
          </div>
        </div>
      );
    } else if (slot.slotType === 'category') {
      const categoryCount = slot.categories.length;
      const singleCategoryName = categoryCount === 1 ? slot.categories[0].name : null;

      return (
        <div key={position} className="flex flex-col items-center w-14" title={singleCategoryName || `${slot.categoryMatchMode === 'all' ? 'ALL' : 'ANY'} of ${categoryCount} categories`}>
          <div className="relative w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center border border-dashed border-gray-500">
            {singleCategoryName ? (
              <span className="text-[8px] text-gray-300 text-center px-0.5 leading-tight line-clamp-3">
                {singleCategoryName}
              </span>
            ) : (
              <div className="text-center">
                <span className="text-[9px] text-gray-400 block">
                  {slot.categoryMatchMode === 'all' ? 'ALL' : 'ANY'}
                </span>
                <span className="text-[10px] text-gray-500">{categoryCount}</span>
              </div>
            )}
            {renderRequirementBadges(slot)}
          </div>
        </div>
      );
    } else if (slot.slotType === 'pool') {
      return (
        <div key={position} className="flex flex-col items-center w-14">
          <div className="relative w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center border border-dashed border-gray-500">
            <span className="text-sm text-gray-400">{slot.characters.length}</span>
            {renderRequirementBadges(slot)}
          </div>
        </div>
      );
    }

    // Empty slot
    return (
      <div key={position} className="flex flex-col items-center w-14">
        <div className="w-12 h-12 bg-gray-800 rounded-lg border border-gray-700" />
      </div>
    );
  };

  // Render all 5 slots for a squad
  const renderSquadSlots = (squad: Squad) => {
    const slots: (SquadSlot | null)[] = [null, null, null, null, null];

    // Place slots in their positions
    for (const slot of squad.slots) {
      if (slot.position >= 0 && slot.position < 5) {
        slots[slot.position] = slot;
      }
    }

    return (
      <div className="flex gap-1">
        {slots.map((slot, idx) =>
          slot ? renderSlot(slot, idx) : (
            <div key={idx} className="flex flex-col items-center w-14">
              <div className="w-12 h-12 bg-gray-800 rounded-lg border border-gray-700" />
            </div>
          )
        )}
      </div>
    );
  };

  if (!selectedPlayer || (selectedPlayer.memberLevel < 3 && !selectedPlayer.isAdmin)) {
    return <div className="text-center py-8">Access denied</div>;
  }

  if (loading && squads.length === 0) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Squads</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors font-semibold"
          >
            Browse Templates
          </button>
          <button
            onClick={() => router.push('/dashboard/guild/squads/new')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors font-semibold"
          >
            Add Squad
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
              placeholder="Search by name, character, or tag..."
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

      {/* Squads Table */}
      {filteredSquads.length === 0 ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center text-gray-400">
          {squads.length === 0
            ? 'No squads found. Click "Add Squad" or "Browse Templates" to create one.'
            : 'No squads match your search criteria.'}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Squad Members</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Tags</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {paginatedSquads.map((squad) => (
                  <tr key={squad.id} className="hover:bg-gray-750">
                    <td className="px-4 py-4">
                      <div className="font-medium">{squad.name}</div>
                      {squad.description && (
                        <div className="text-sm text-gray-400 mt-1">{squad.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {renderSquadSlots(squad)}
                    </td>
                    <td className="px-4 py-4">
                      {squad.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {squad.tags.map((tag) => (
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
                        {deleteConfirmId === squad.id ? (
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
                              onClick={() => router.push(`/dashboard/guild/squads/${squad.id}/edit`)}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded transition-colors text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(squad.id)}
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
                Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredSquads.length)} of {filteredSquads.length} squads
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
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold">Squad Templates</h2>
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
                  No squad templates available.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Squad Members</th>
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
                            {renderSquadSlots(template)}
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
