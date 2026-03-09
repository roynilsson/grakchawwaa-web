'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { shipsApi, ShipSummary, getUnitThumbnail } from '../../../../../lib/api';

export default function ShipDetailPage() {
  const params = useParams();
  const baseId = params.baseId as string;

  const [ship, setShip] = useState<ShipSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShip = async () => {
      if (!baseId) return;

      setLoading(true);
      setError(null);

      try {
        const res = await shipsApi.get(baseId);
        setShip(res.ship);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load ship');
      } finally {
        setLoading(false);
      }
    };

    fetchShip();
  }, [baseId]);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error || !ship) {
    return <div className="text-center py-8 text-red-500">{error || 'Ship not found'}</div>;
  }

  const alignment = ship.categories.find(c => c.type === 'alignment');
  const role = ship.categories.find(c => c.type === 'role');
  const factions = ship.categories.filter(c => c.type === 'faction');

  const alignmentColors: Record<string, string> = {
    alignment_light: 'bg-blue-600 text-blue-100',
    alignment_dark: 'bg-red-600 text-red-100',
    alignment_neutral: 'bg-gray-600 text-gray-100',
  };

  const abilityTypeOrder = ['basic', 'special', 'unique', 'hardware'];
  const sortedAbilities = [...ship.abilities].sort(
    (a, b) => abilityTypeOrder.indexOf(a.type) - abilityTypeOrder.indexOf(b.type)
  );

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/game-data/ships"
        className="inline-flex items-center text-sm text-indigo-400 hover:text-indigo-300 mb-6"
      >
        &larr; Back to Ships
      </Link>

      {/* Header */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <div className="flex items-start gap-6">
          <img
            src={getUnitThumbnail(ship.thumbnailName)}
            alt={ship.name}
            className="w-32 h-32 rounded-lg"
          />
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{ship.name}</h1>
              {ship.isCapital && (
                <span className="px-2 py-1 text-sm rounded bg-yellow-600 text-yellow-100 font-semibold">
                  Capital Ship
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mb-4">{ship.baseId}</p>

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

      {/* Crew */}
      {ship.crew.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Crew ({ship.crew.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {ship.crew.map(member => (
              <Link
                key={member.baseId}
                href={`/dashboard/game-data/characters/${member.baseId}`}
                className="flex flex-col items-center p-3 rounded-lg bg-gray-700 hover:bg-gray-650 transition-colors"
              >
                <img
                  src={getUnitThumbnail(`tex.charui_${member.baseId.toLowerCase()}`)}
                  alt={member.name}
                  className="w-12 h-12 rounded mb-2"
                  onError={(e) => {
                    // Fallback if image doesn't load
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-sm text-center">{member.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Abilities */}
      {sortedAbilities.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Abilities</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Ability</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
