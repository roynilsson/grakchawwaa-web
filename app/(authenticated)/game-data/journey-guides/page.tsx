'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { journeyGuidesApi, JourneyGuide, JourneyGuideType, getUnitThumbnail } from '../../../../lib/api';

// Type display configuration
const TYPE_CONFIG: Record<JourneyGuideType, { label: string; color: string }> = {
  galactic_legend: { label: 'GL', color: 'bg-yellow-600 text-yellow-100' },
  fleet_mastery: { label: 'Fleet', color: 'bg-cyan-600 text-cyan-100' },
  epic: { label: 'Epic', color: 'bg-purple-600 text-purple-100' },
  journey: { label: 'Journey', color: 'bg-green-600 text-green-100' },
  legendary: { label: 'Legendary', color: 'bg-orange-600 text-orange-100' },
  progression: { label: 'Progression', color: 'bg-gray-600 text-gray-100' },
  raid: { label: 'Raid', color: 'bg-red-600 text-red-100' },
  territory_battle: { label: 'TB', color: 'bg-teal-600 text-teal-100' },
  other: { label: 'Other', color: 'bg-gray-600 text-gray-200' },
};

export default function JourneyGuidesPage() {
  const [journeyGuides, setJourneyGuides] = useState<JourneyGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<JourneyGuideType | ''>('');

  useEffect(() => {
    const fetchJourneyGuides = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await journeyGuidesApi.list();
        setJourneyGuides(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load journey guides');
      } finally {
        setLoading(false);
      }
    };

    fetchJourneyGuides();
  }, []);

  const filteredGuides = useMemo(() => {
    return journeyGuides.filter(guide => {
      // Type filter
      if (typeFilter && guide.type !== typeFilter) {
        return false;
      }

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const titleMatch = guide.title.toLowerCase().includes(searchLower);
        const characterMatch = guide.character?.name.toLowerCase().includes(searchLower);
        const shipMatch = guide.ship?.name.toLowerCase().includes(searchLower);
        if (!titleMatch && !characterMatch && !shipMatch) {
          return false;
        }
      }

      return true;
    });
  }, [journeyGuides, search, typeFilter]);

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('');
  };

  const hasActiveFilters = search || typeFilter;

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Journey Guides</h1>
        <p className="text-gray-400 text-sm mt-1">
          {filteredGuides.length} event{filteredGuides.length !== 1 ? 's' : ''}
          {hasActiveFilters && ` (filtered from ${journeyGuides.length})`}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          {/* Search */}
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as JourneyGuideType | '')}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Types</option>
              <option value="galactic_legend">Galactic Legend</option>
              <option value="fleet_mastery">Fleet Mastery</option>
              <option value="epic">Epic</option>
              <option value="journey">Journey</option>
              <option value="legendary">Legendary</option>
              <option value="progression">Progression</option>
              <option value="raid">Raid</option>
              <option value="territory_battle">Territory Battle</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-indigo-400 hover:text-indigo-300 self-end pb-2"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Event</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Unlocks</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Type</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Requirements</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredGuides.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No journey guides found
                  </td>
                </tr>
              ) : (
                filteredGuides.map(guide => {
                  const unit = guide.character || guide.ship;
                  const isShip = !!guide.ship;

                  return (
                    <tr key={guide.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <Link
                          href={`/game-data/journey-guides/${guide.id}`}
                          className="font-medium hover:text-indigo-400"
                        >
                          {guide.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {unit && (
                          <div className="flex items-center gap-3">
                            <img
                              src={getUnitThumbnail(unit.thumbnailName)}
                              alt={unit.name}
                              className="w-10 h-10 rounded"
                              loading="lazy"
                            />
                            <span>{unit.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-xs rounded ${TYPE_CONFIG[guide.type].color}`}>
                          {TYPE_CONFIG[guide.type].label}
                        </span>
                        {isShip && (
                          <span className="ml-1 px-2 py-0.5 text-xs rounded bg-blue-600 text-blue-100">
                            Ship
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-400">
                        {guide.requirementsCount}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
