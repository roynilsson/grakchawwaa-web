'use client';

import { useAuth } from '../../../../lib/auth-context';
import {
  squadsApi,
  squadTagsApi,
  squadTemplatesApi,
  getUnitThumbnail,
  Squad,
  SquadTag,
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
  const [showTemplates, setShowTemplates] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copyingTemplateId, setCopyingTemplateId] = useState<string | null>(null);

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

  const getLeaderThumbnail = (squad: Squad): string | null => {
    const leaderSlot = squad.slots.find((slot) => slot.position === 0);
    if (leaderSlot && leaderSlot.characters.length > 0) {
      return leaderSlot.characters[0].character.thumbnailName;
    }
    return null;
  };

  const getLeaderName = (squad: Squad): string | null => {
    const leaderSlot = squad.slots.find((slot) => slot.position === 0);
    if (leaderSlot && leaderSlot.characters.length > 0) {
      return leaderSlot.characters[0].character.name;
    }
    return null;
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
        <div className="flex items-center gap-4">
          <label htmlFor="tagFilter" className="text-sm font-medium text-gray-400">
            Filter by Tag:
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

      {/* Squads Grid */}
      {squads.length === 0 ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center text-gray-400">
          No squads found. Click &quot;Add Squad&quot; or &quot;Browse Templates&quot; to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {squads.map((squad) => {
            const leaderThumbnail = getLeaderThumbnail(squad);
            const leaderName = getLeaderName(squad);

            return (
              <div
                key={squad.id}
                className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Leader Thumbnail */}
                  <div className="flex-shrink-0">
                    {leaderThumbnail ? (
                      <Image
                        src={getUnitThumbnail(leaderThumbnail)}
                        alt={leaderName || 'Leader'}
                        width={64}
                        height={64}
                        className="rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center text-gray-500">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Squad Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg truncate">{squad.name}</h3>
                      {squad.isTemplate && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-600 text-white">
                          Template
                        </span>
                      )}
                    </div>
                    {leaderName && (
                      <p className="text-sm text-gray-400 mb-2">Leader: {leaderName}</p>
                    )}
                    {squad.tags.length > 0 && (
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
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!squad.isTemplate && (
                  <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end gap-2">
                    {deleteConfirmId === squad.id ? (
                      <>
                        <span className="text-sm text-gray-400 mr-2 self-center">Delete?</span>
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => {
                    const leaderThumbnail = getLeaderThumbnail(template);
                    const leaderName = getLeaderName(template);

                    return (
                      <div
                        key={template.id}
                        className="bg-gray-700 rounded-lg p-4 flex items-start gap-4"
                      >
                        {/* Leader Thumbnail */}
                        <div className="flex-shrink-0">
                          {leaderThumbnail ? (
                            <Image
                              src={getUnitThumbnail(leaderThumbnail)}
                              alt={leaderName || 'Leader'}
                              width={48}
                              height={48}
                              className="rounded-lg"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center text-gray-500">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Template Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{template.name}</h3>
                          {leaderName && (
                            <p className="text-sm text-gray-400">Leader: {leaderName}</p>
                          )}
                          {template.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {template.tags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className="px-2 py-0.5 text-xs rounded bg-gray-600 text-gray-300"
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Copy Button */}
                        <button
                          onClick={() => handleCopyTemplate(template.id)}
                          disabled={copyingTemplateId === template.id}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded transition-colors text-sm font-semibold flex-shrink-0"
                        >
                          {copyingTemplateId === template.id ? 'Copying...' : 'Copy'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
