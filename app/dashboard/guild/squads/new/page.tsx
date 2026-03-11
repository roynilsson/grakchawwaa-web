'use client';

import { useAuth } from '../../../../../lib/auth-context';
import {
  squadsApi,
  squadTagsApi,
  charactersApi,
  categoriesApi,
  getUnitThumbnail,
  SquadTag,
  CharacterSummary,
  GameCategory,
  SlotInput,
} from '../../../../../lib/api';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';

interface SlotFormData {
  position: number;
  slotType: 'specific' | 'category' | 'pool';
  categoryMatchMode: 'all' | 'any';
  minRarity: number;
  minGearLevel: number;
  minRelicLevel: number;
  categoryIds: string[];
  characters: Array<{
    character: CharacterSummary;
    requiredZetas: string[];
    requiredOmicrons: string[];
  }>;
}

const EMPTY_SLOT: SlotFormData = {
  position: 0,
  slotType: 'specific',
  categoryMatchMode: 'all',
  minRarity: 1,
  minGearLevel: 1,
  minRelicLevel: 0,
  categoryIds: [],
  characters: [],
};

export default function NewSquadPage() {
  const { session } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [slots, setSlots] = useState<SlotFormData[]>([
    { ...EMPTY_SLOT, position: 0 },
    { ...EMPTY_SLOT, position: 1 },
    { ...EMPTY_SLOT, position: 2 },
    { ...EMPTY_SLOT, position: 3 },
    { ...EMPTY_SLOT, position: 4 },
  ]);

  const [tags, setTags] = useState<SquadTag[]>([]);
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Character search state
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CharacterSummary[]>([]);
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

  // Fetch tags and categories
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedPlayer) return;

      try {
        const [tagsRes, categoriesRes] = await Promise.all([
          squadTagsApi.list(selectedPlayer.guildId),
          categoriesApi.list(),
        ]);
        setTags(tagsRes.tags);
        setCategories(categoriesRes.categories);
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };

    fetchData();
  }, [selectedPlayer]);

  // Search characters
  const searchCharacters = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await charactersApi.list({ search: query, limit: 20 });
      setSearchResults(res.data);
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
        searchCharacters(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeSlotIndex, searchCharacters]);

  const handleSlotTypeChange = (index: number, slotType: 'specific' | 'category' | 'pool') => {
    const newSlots = [...slots];
    newSlots[index] = {
      ...newSlots[index],
      slotType,
      characters: slotType === 'specific' ? [] : newSlots[index].characters,
      categoryIds: slotType === 'category' ? [] : newSlots[index].categoryIds,
    };
    setSlots(newSlots);
  };

  const handleAddCharacter = (index: number, character: CharacterSummary) => {
    const newSlots = [...slots];
    const slot = newSlots[index];

    // For specific slots, only allow one character
    if (slot.slotType === 'specific') {
      slot.characters = [{ character, requiredZetas: [], requiredOmicrons: [] }];
    } else if (slot.slotType === 'pool') {
      // For pool slots, allow up to 15 characters
      if (slot.characters.length < 15 && !slot.characters.some(c => c.character.baseId === character.baseId)) {
        slot.characters.push({ character, requiredZetas: [], requiredOmicrons: [] });
      }
    }

    setSlots(newSlots);
    setSearchQuery('');
    setSearchResults([]);
    setActiveSlotIndex(null);
  };

  const handleRemoveCharacter = (slotIndex: number, characterBaseId: string) => {
    const newSlots = [...slots];
    newSlots[slotIndex].characters = newSlots[slotIndex].characters.filter(
      c => c.character.baseId !== characterBaseId
    );
    setSlots(newSlots);
  };

  const handleToggleZeta = (slotIndex: number, characterBaseId: string, zetaName: string) => {
    const newSlots = [...slots];
    const charEntry = newSlots[slotIndex].characters.find(c => c.character.baseId === characterBaseId);
    if (charEntry) {
      if (charEntry.requiredZetas.includes(zetaName)) {
        charEntry.requiredZetas = charEntry.requiredZetas.filter(z => z !== zetaName);
      } else {
        charEntry.requiredZetas.push(zetaName);
      }
    }
    setSlots(newSlots);
  };

  const handleToggleOmicron = (slotIndex: number, characterBaseId: string, omicronName: string) => {
    const newSlots = [...slots];
    const charEntry = newSlots[slotIndex].characters.find(c => c.character.baseId === characterBaseId);
    if (charEntry) {
      if (charEntry.requiredOmicrons.includes(omicronName)) {
        charEntry.requiredOmicrons = charEntry.requiredOmicrons.filter(o => o !== omicronName);
      } else {
        charEntry.requiredOmicrons.push(omicronName);
      }
    }
    setSlots(newSlots);
  };

  const handleCategoryToggle = (slotIndex: number, categoryId: string) => {
    const newSlots = [...slots];
    const slot = newSlots[slotIndex];
    if (slot.categoryIds.includes(categoryId)) {
      slot.categoryIds = slot.categoryIds.filter(id => id !== categoryId);
    } else {
      slot.categoryIds.push(categoryId);
    }
    setSlots(newSlots);
  };

  const handleRequirementChange = (
    slotIndex: number,
    field: 'minRarity' | 'minGearLevel' | 'minRelicLevel',
    value: number
  ) => {
    const newSlots = [...slots];
    newSlots[slotIndex][field] = value;
    setSlots(newSlots);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlayer) return;

    if (!name.trim()) {
      toast.error('Please enter a squad name');
      return;
    }

    // At least position 0 (leader) must have a character
    const leaderSlot = slots[0];
    if (leaderSlot.slotType === 'specific' && leaderSlot.characters.length === 0) {
      toast.error('Please select a leader for the squad');
      return;
    }

    setSubmitting(true);

    try {
      // Build slots array - only include non-empty slots
      const slotsInput: SlotInput[] = slots
        .filter(slot => {
          if (slot.slotType === 'specific' && slot.characters.length > 0) return true;
          if (slot.slotType === 'category' && slot.categoryIds.length > 0) return true;
          if (slot.slotType === 'pool' && slot.characters.length > 0) return true;
          return false;
        })
        .map(slot => ({
          position: slot.position,
          slotType: slot.slotType,
          categoryMatchMode: slot.slotType === 'category' ? slot.categoryMatchMode : undefined,
          minRarity: slot.minRarity > 1 ? slot.minRarity : undefined,
          minGearLevel: slot.minGearLevel > 1 ? slot.minGearLevel : undefined,
          minRelicLevel: slot.minRelicLevel > 0 ? slot.minRelicLevel : undefined,
          categoryIds: slot.slotType === 'category' ? slot.categoryIds : undefined,
          characters: (slot.slotType === 'specific' || slot.slotType === 'pool')
            ? slot.characters.map(c => ({
                characterId: c.character.baseId,
                requiredZetas: c.requiredZetas.length > 0 ? c.requiredZetas : undefined,
                requiredOmicrons: c.requiredOmicrons.length > 0 ? c.requiredOmicrons : undefined,
              }))
            : undefined,
        }));

      await squadsApi.create(selectedPlayer.guildId, {
        name: name.trim(),
        description: description.trim() || undefined,
        type: 'squad',
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        slots: slotsInput,
      });

      toast.success('Squad created successfully');
      router.push('/dashboard/guild/squads');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create squad';
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
        <h1 className="text-2xl font-bold">Create New Squad</h1>
        <button
          onClick={() => router.push('/dashboard/guild/squads')}
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
                Squad Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., JMK CAT"
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

        {/* Squad Slots */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Squad Members</h2>
          <p className="text-sm text-gray-400 mb-4">
            Position 1 is the leader. Click on a slot to add a character.
          </p>

          <div className="space-y-4">
            {slots.map((slot, index) => (
              <div
                key={index}
                className="bg-gray-750 rounded-lg border border-gray-600 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </span>
                    <span className="font-medium">
                      {index === 0 ? 'Leader' : `Position ${index + 1}`}
                    </span>
                  </div>

                  <select
                    value={slot.slotType}
                    onChange={(e) => handleSlotTypeChange(index, e.target.value as 'specific' | 'category' | 'pool')}
                    className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="specific">Specific Character</option>
                    <option value="category">Category Match</option>
                    <option value="pool">Character Pool</option>
                  </select>
                </div>

                {/* Specific Character Selection */}
                {slot.slotType === 'specific' && (
                  <div>
                    {slot.characters.length > 0 ? (
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <Image
                            src={getUnitThumbnail(slot.characters[0].character.thumbnailName)}
                            alt={slot.characters[0].character.name}
                            width={64}
                            height={64}
                            className="rounded-lg"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{slot.characters[0].character.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCharacter(index, slot.characters[0].character.baseId)}
                              className="text-red-500 hover:text-red-400 text-sm"
                            >
                              Remove
                            </button>
                          </div>

                          {/* Zetas and Omicrons */}
                          {slot.characters[0].character.abilities.some(a => a.hasZeta || a.hasOmicron) && (
                            <div className="mt-2 space-y-1">
                              {slot.characters[0].character.abilities
                                .filter(a => a.hasZeta)
                                .map((ability) => (
                                  <label key={ability.name} className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={slot.characters[0].requiredZetas.includes(ability.name)}
                                      onChange={() => handleToggleZeta(index, slot.characters[0].character.baseId, ability.name)}
                                      className="rounded bg-gray-700 border-gray-600"
                                    />
                                    <span className="text-purple-400">Z</span>
                                    <span className="text-gray-300">{ability.name}</span>
                                  </label>
                                ))}
                              {slot.characters[0].character.abilities
                                .filter(a => a.hasOmicron)
                                .map((ability) => (
                                  <label key={ability.name} className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={slot.characters[0].requiredOmicrons.includes(ability.name)}
                                      onChange={() => handleToggleOmicron(index, slot.characters[0].character.baseId, ability.name)}
                                      className="rounded bg-gray-700 border-gray-600"
                                    />
                                    <span className="text-blue-400">O</span>
                                    <span className="text-gray-300">{ability.name} ({ability.omicronMode})</span>
                                  </label>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search for a character..."
                          value={activeSlotIndex === index ? searchQuery : ''}
                          onFocus={() => setActiveSlotIndex(index)}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
                        />
                        {activeSlotIndex === index && searchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {searchResults.map((char) => (
                              <button
                                key={char.baseId}
                                type="button"
                                onClick={() => handleAddCharacter(index, char)}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-600 text-left"
                              >
                                <Image
                                  src={getUnitThumbnail(char.thumbnailName)}
                                  alt={char.name}
                                  width={32}
                                  height={32}
                                  className="rounded"
                                />
                                <span>{char.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {activeSlotIndex === index && searching && (
                          <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg p-3 text-center text-gray-400">
                            Searching...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Category Match Selection */}
                {slot.slotType === 'category' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <label className="text-sm text-gray-400">Match:</label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={slot.categoryMatchMode === 'all'}
                          onChange={() => {
                            const newSlots = [...slots];
                            newSlots[index].categoryMatchMode = 'all';
                            setSlots(newSlots);
                          }}
                          className="bg-gray-700 border-gray-600"
                        />
                        <span className="text-sm">ALL categories</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={slot.categoryMatchMode === 'any'}
                          onChange={() => {
                            const newSlots = [...slots];
                            newSlots[index].categoryMatchMode = 'any';
                            setSlots(newSlots);
                          }}
                          className="bg-gray-700 border-gray-600"
                        />
                        <span className="text-sm">ANY category</span>
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategoryToggle(index, cat.id)}
                          className={`px-2 py-1 rounded text-xs transition-colors ${
                            slot.categoryIds.includes(cat.id)
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pool Selection */}
                {slot.slotType === 'pool' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {slot.characters.map((charEntry) => (
                        <div
                          key={charEntry.character.baseId}
                          className="flex items-center gap-2 bg-gray-700 rounded-lg px-2 py-1"
                        >
                          <Image
                            src={getUnitThumbnail(charEntry.character.thumbnailName)}
                            alt={charEntry.character.name}
                            width={24}
                            height={24}
                            className="rounded"
                          />
                          <span className="text-sm">{charEntry.character.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCharacter(index, charEntry.character.baseId)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>

                    {slot.characters.length < 15 && (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={`Add character (${slot.characters.length}/15)...`}
                          value={activeSlotIndex === index ? searchQuery : ''}
                          onFocus={() => setActiveSlotIndex(index)}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
                        />
                        {activeSlotIndex === index && searchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {searchResults
                              .filter(char => !slot.characters.some(c => c.character.baseId === char.baseId))
                              .map((char) => (
                                <button
                                  key={char.baseId}
                                  type="button"
                                  onClick={() => handleAddCharacter(index, char)}
                                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-600 text-left"
                                >
                                  <Image
                                    src={getUnitThumbnail(char.thumbnailName)}
                                    alt={char.name}
                                    width={32}
                                    height={32}
                                    className="rounded"
                                  />
                                  <span>{char.name}</span>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Requirements */}
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <div className="text-sm text-gray-400 mb-2">Requirements (optional)</div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-400">Rarity:</label>
                      <select
                        value={slot.minRarity}
                        onChange={(e) => handleRequirementChange(index, 'minRarity', parseInt(e.target.value))}
                        className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      >
                        {[1, 2, 3, 4, 5, 6, 7].map((r) => (
                          <option key={r} value={r}>{r}*</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-400">Gear:</label>
                      <select
                        value={slot.minGearLevel}
                        onChange={(e) => handleRequirementChange(index, 'minGearLevel', parseInt(e.target.value))}
                        className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((g) => (
                          <option key={g} value={g}>G{g}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-400">Relic:</label>
                      <select
                        value={slot.minRelicLevel}
                        onChange={(e) => handleRequirementChange(index, 'minRelicLevel', parseInt(e.target.value))}
                        className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                      >
                        <option value={0}>None</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                          <option key={r} value={r}>R{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard/guild/squads')}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded transition-colors font-semibold"
          >
            {submitting ? 'Creating...' : 'Create Squad'}
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
}
