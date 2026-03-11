'use client';

import { useAuth } from '../../../../../lib/auth-context';
import {
  squadsApi,
  squadTagsApi,
  shipsApi,
  getUnitThumbnail,
  SquadTag,
  ShipSummary,
  SlotInput,
} from '../../../../../lib/api';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';

interface SlotFormData {
  position: number;
  minRarity: number;
  minCrewRelicLevel: number;
  ship: ShipSummary | null;
}

const SLOT_LABELS = [
  'Capital Ship',
  'Starting Ship 1',
  'Starting Ship 2',
  'Starting Ship 3',
  'Reinforcement 1',
  'Reinforcement 2',
  'Reinforcement 3',
  'Reinforcement 4',
];

export default function NewFleetPage() {
  const { session } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [slots, setSlots] = useState<SlotFormData[]>(
    Array.from({ length: 8 }, (_, i) => ({
      position: i,
      minRarity: 1,
      minCrewRelicLevel: 0,
      ship: null,
    }))
  );

  const [tags, setTags] = useState<SquadTag[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Ship search state
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ShipSummary[]>([]);
  const [searching, setSearching] = useState(false);

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  // Check officer permission
  useEffect(() => {
    if (selectedPlayer && selectedPlayer.memberLevel < 3 && !selectedPlayer.isAdmin) {
      router.push('/dashboard');
    }
  }, [selectedPlayer, router]);

  // Fetch tags
  useEffect(() => {
    const fetchTags = async () => {
      if (!selectedPlayer) return;

      try {
        const res = await squadTagsApi.list(selectedPlayer.guildId);
        setTags(res.tags);
      } catch (err) {
        console.error('Failed to load tags:', err);
      }
    };

    fetchTags();
  }, [selectedPlayer]);

  // Search ships
  const searchShips = useCallback(async (query: string, isCapital: boolean) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await shipsApi.list({
        search: query,
        limit: 20,
        isCapital: isCapital || undefined,
      });
      // For capital slot, only show capital ships; for others, exclude capital ships
      const filtered = isCapital
        ? res.data.filter(s => s.isCapital)
        : res.data.filter(s => !s.isCapital);
      setSearchResults(filtered);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeSlotIndex !== null) {
        searchShips(searchQuery, activeSlotIndex === 0);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeSlotIndex, searchShips]);

  const handleAddShip = (index: number, ship: ShipSummary) => {
    const newSlots = [...slots];
    newSlots[index].ship = ship;
    setSlots(newSlots);
    setSearchQuery('');
    setSearchResults([]);
    setActiveSlotIndex(null);
  };

  const handleRemoveShip = (index: number) => {
    const newSlots = [...slots];
    newSlots[index].ship = null;
    setSlots(newSlots);
  };

  const handleRequirementChange = (
    index: number,
    field: 'minRarity' | 'minCrewRelicLevel',
    value: number
  ) => {
    const newSlots = [...slots];
    newSlots[index][field] = value;
    setSlots(newSlots);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlayer) return;

    if (!name.trim()) {
      toast.error('Please enter a fleet name');
      return;
    }

    // Capital ship (position 0) is required
    if (!slots[0].ship) {
      toast.error('Please select a capital ship');
      return;
    }

    setSubmitting(true);

    try {
      // Build slots array - only include slots with ships
      const slotsInput: SlotInput[] = slots
        .filter(slot => slot.ship !== null)
        .map(slot => ({
          position: slot.position,
          slotType: 'specific' as const,
          minRarity: slot.minRarity > 1 ? slot.minRarity : undefined,
          minCrewRelicLevel: slot.minCrewRelicLevel > 0 ? slot.minCrewRelicLevel : undefined,
          ships: [{ shipId: slot.ship!.baseId }],
        }));

      await squadsApi.create(selectedPlayer.guildId, {
        name: name.trim(),
        description: description.trim() || undefined,
        type: 'fleet',
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        slots: slotsInput,
      });

      toast.success('Fleet created successfully');
      router.push('/dashboard/guild/fleets');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create fleet';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!selectedPlayer || (selectedPlayer.memberLevel < 3 && !selectedPlayer.isAdmin)) {
    return <div className="text-center py-8">Access denied</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Create New Fleet</h1>
        <button
          onClick={() => router.push('/dashboard/guild/fleets')}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">
                Fleet Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Executor Fleet"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-400 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      if (selectedTagIds.includes(tag.id)) {
                        setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id));
                      } else {
                        setSelectedTagIds([...selectedTagIds, tag.id]);
                      }
                    }}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      selectedTagIds.includes(tag.id)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
                {tags.length === 0 && (
                  <span className="text-gray-500 text-sm">No tags available</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fleet Slots */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Fleet Composition</h2>
          <p className="text-sm text-gray-400 mb-4">
            Select ships for each position. Capital ship is required.
          </p>

          {/* Capital Ship */}
          <div className="mb-6">
            <h3 className="text-md font-medium mb-3 text-yellow-400">Capital Ship</h3>
            {renderSlotInput(0)}
          </div>

          {/* Starting Ships */}
          <div className="mb-6">
            <h3 className="text-md font-medium mb-3 text-green-400">Starting Ships</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((pos) => renderSlotInput(pos))}
            </div>
          </div>

          {/* Reinforcements */}
          <div>
            <h3 className="text-md font-medium mb-3 text-blue-400">Reinforcements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[4, 5, 6, 7].map((pos) => renderSlotInput(pos))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard/guild/fleets')}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded transition-colors font-semibold"
          >
            {submitting ? 'Creating...' : 'Create Fleet'}
          </button>
        </div>
      </form>

      {/* Click outside to close search */}
      {activeSlotIndex !== null && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setActiveSlotIndex(null);
            setSearchQuery('');
            setSearchResults([]);
          }}
        />
      )}
    </div>
  );

  function renderSlotInput(index: number) {
    const slot = slots[index];
    const isCapital = index === 0;

    return (
      <div
        key={index}
        className="bg-gray-750 rounded-lg border border-gray-600 p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-300">{SLOT_LABELS[index]}</span>
        </div>

        {slot.ship ? (
          <div className="flex items-start gap-3">
            <Image
              src={getUnitThumbnail(slot.ship.thumbnailName)}
              alt={slot.ship.name}
              width={56}
              height={56}
              className="rounded-lg"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{slot.ship.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveShip(index)}
                  className="text-red-500 hover:text-red-400 text-xs"
                >
                  Remove
                </button>
              </div>

              {/* Crew info */}
              {slot.ship.crew.length > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  Crew: {slot.ship.crew.map(c => c.name).join(', ')}
                </div>
              )}

              {/* Requirements */}
              <div className="mt-2 flex gap-3">
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-400">Rarity:</label>
                  <select
                    value={slot.minRarity}
                    onChange={(e) => handleRequirementChange(index, 'minRarity', parseInt(e.target.value))}
                    className="px-1 py-0.5 bg-gray-700 border border-gray-600 rounded text-xs"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((r) => (
                      <option key={r} value={r}>{r}*</option>
                    ))}
                  </select>
                </div>
                {slot.ship.crew.length > 0 && (
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-400">Crew Relic:</label>
                    <select
                      value={slot.minCrewRelicLevel}
                      onChange={(e) => handleRequirementChange(index, 'minCrewRelicLevel', parseInt(e.target.value))}
                      className="px-1 py-0.5 bg-gray-700 border border-gray-600 rounded text-xs"
                    >
                      <option value={0}>None</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                        <option key={r} value={r}>R{r}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              placeholder={isCapital ? 'Search for capital ship...' : 'Search for ship...'}
              value={activeSlotIndex === index ? searchQuery : ''}
              onFocus={() => setActiveSlotIndex(index)}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500 text-sm"
            />
            {activeSlotIndex === index && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((ship) => (
                  <button
                    key={ship.baseId}
                    type="button"
                    onClick={() => handleAddShip(index, ship)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-600 text-left"
                  >
                    <Image
                      src={getUnitThumbnail(ship.thumbnailName)}
                      alt={ship.name}
                      width={28}
                      height={28}
                      className="rounded"
                    />
                    <span className="text-sm">{ship.name}</span>
                  </button>
                ))}
              </div>
            )}
            {activeSlotIndex === index && searching && (
              <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg p-3 text-center text-gray-400 text-sm">
                Searching...
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}
