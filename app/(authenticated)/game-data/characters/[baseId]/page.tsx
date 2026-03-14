'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { charactersApi, CharacterSummary, getUnitThumbnail } from '../../../../../lib/api';

export default function CharacterDetailPage() {
  const params = useParams();
  const baseId = params.baseId as string;

  const [character, setCharacter] = useState<CharacterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCharacter = async () => {
      if (!baseId) return;

      setLoading(true);
      setError(null);

      try {
        const res = await charactersApi.get(baseId);
        setCharacter(res.character);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load character');
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [baseId]);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error || !character) {
    return <div className="text-center py-8 text-red-500">{error || 'Character not found'}</div>;
  }

  const alignment = character.categories.find(c => c.type === 'alignment');
  const role = character.categories.find(c => c.type === 'role');
  const factions = character.categories.filter(c => c.type === 'faction');

  const alignmentColors: Record<string, string> = {
    alignment_light: 'bg-blue-600 text-blue-100',
    alignment_dark: 'bg-red-600 text-red-100',
    alignment_neutral: 'bg-gray-600 text-gray-100',
  };

  const abilityTypeOrder = ['basic', 'special', 'leader', 'unique'];
  const sortedAbilities = [...character.abilities].sort(
    (a, b) => abilityTypeOrder.indexOf(a.type) - abilityTypeOrder.indexOf(b.type)
  );

  return (
    <div>
      {/* Back link */}
      <Link
        href="/game-data/characters"
        className="inline-flex items-center text-sm text-indigo-400 hover:text-indigo-300 mb-6"
      >
        &larr; Back to Characters
      </Link>

      {/* Header */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <div className="flex items-start gap-6">
          <img
            src={getUnitThumbnail(character.thumbnailName)}
            alt={character.name}
            className="w-32 h-32 rounded-lg"
          />
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{character.name}</h1>
              {character.isGalacticLegend && (
                <span className="px-2 py-1 text-sm rounded bg-yellow-600 text-yellow-100 font-semibold">
                  Galactic Legend
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mb-4">{character.baseId}</p>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {alignment && (
                <span className={`px-3 py-1 text-sm rounded ${alignmentColors[alignment.id] || 'bg-gray-600'}`}>
                  {alignment.name}
                </span>
              )}
              {role && (
                <span className="px-3 py-1 text-sm rounded bg-purple-600 text-purple-100">
                  {role.name}
                </span>
              )}
              {character.isLeader && (
                <span className="px-3 py-1 text-sm rounded bg-green-600 text-green-100">
                  Leader
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Factions */}
      {factions.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Factions</h2>
          <div className="flex flex-wrap gap-2">
            {factions.map(f => (
              <span key={f.id} className="px-3 py-1 text-sm rounded bg-gray-700 text-gray-200">
                {f.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Abilities */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Abilities</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Ability</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Zeta</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Omicron</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sortedAbilities.map((ability, idx) => (
                <tr key={idx} className="hover:bg-gray-750">
                  <td className="px-4 py-3 font-medium">{ability.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs rounded bg-gray-600 capitalize">
                      {ability.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {ability.hasZeta && (
                      <span className="text-yellow-400">&#10003;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {ability.hasOmicron && (
                      <span className="px-2 py-0.5 text-xs rounded bg-indigo-600 text-indigo-100 uppercase">
                        {ability.omicronMode || 'Yes'}
                      </span>
                    )}
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
