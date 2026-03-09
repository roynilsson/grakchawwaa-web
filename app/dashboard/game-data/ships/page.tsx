'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  shipsApi,
  categoriesApi,
  ShipSummary,
  GameCategory,
  PaginationInfo,
  getUnitThumbnail,
} from '../../../../lib/api';
import { Pagination } from '../../../../components/Pagination';

export default function ShipsPage() {
  const [ships, setShips] = useState<ShipSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [factions, setFactions] = useState<GameCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [alignment, setAlignment] = useState('');
  const [role, setRole] = useState('');
  const [faction, setFaction] = useState('');
  const [capitalOnly, setCapitalOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, alignment, role, faction, capitalOnly]);

  // Fetch factions for dropdown
  useEffect(() => {
    categoriesApi.list('faction').then(res => setFactions(res.categories));
  }, []);

  const fetchShips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await shipsApi.list({
        page,
        limit: 25,
        search: debouncedSearch || undefined,
        alignment: alignment || undefined,
        role: role || undefined,
        faction: faction || undefined,
        isCapital: capitalOnly || undefined,
      });
      setShips(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ships');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, alignment, role, faction, capitalOnly]);

  useEffect(() => {
    fetchShips();
  }, [fetchShips]);

  const clearFilters = () => {
    setSearch('');
    setAlignment('');
    setRole('');
    setFaction('');
    setCapitalOnly(false);
  };

  const hasActiveFilters = search || alignment || role || faction || capitalOnly;

  const getAlignmentBadge = (categories: GameCategory[]) => {
    const align = categories.find(c => c.type === 'alignment');
    if (!align) return null;
    const colors: Record<string, string> = {
      alignment_light: 'bg-blue-600 text-blue-100',
      alignment_dark: 'bg-red-600 text-red-100',
      alignment_neutral: 'bg-gray-600 text-gray-100',
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded ${colors[align.id] || 'bg-gray-600'}`}>
        {align.name}
      </span>
    );
  };

  const getRoleBadge = (categories: GameCategory[]) => {
    const r = categories.find(c => c.type === 'role');
    if (!r) return null;
    return (
      <span className="px-2 py-0.5 text-xs rounded bg-purple-600 text-purple-100">
        {r.name}
      </span>
    );
  };

  const getFactions = (categories: GameCategory[]) => {
    return categories.filter(c => c.type === 'faction');
  };

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Ships</h1>
        {pagination && (
          <p className="text-gray-400 text-sm mt-1">
            {pagination.total} ship{pagination.total !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Alignment */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Alignment</label>
            <select
              value={alignment}
              onChange={e => setAlignment(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">All</option>
              <option value="light">Light Side</option>
              <option value="dark">Dark Side</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">All</option>
              <option value="attacker">Attacker</option>
              <option value="tank">Tank</option>
              <option value="support">Support</option>
            </select>
          </div>

          {/* Faction */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Faction</label>
            <select
              value={faction}
              onChange={e => setFaction(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">All</option>
              {factions.map(f => (
                <option key={f.id} value={f.id.replace('affiliation_', '')}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle filters */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={capitalOnly}
              onChange={e => setCapitalOnly(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-gray-300">Capital Ships only</span>
          </label>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-indigo-400 hover:text-indigo-300"
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
                <th className="px-4 py-3 text-left text-sm font-semibold">Ship</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Alignment</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Factions</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Capital</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Crew</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading && ships.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : ships.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No ships found
                  </td>
                </tr>
              ) : (
                ships.map(ship => (
                  <tr key={ship.baseId} className="hover:bg-gray-750">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/game-data/ships/${ship.baseId}`}
                        className="flex items-center gap-3 hover:text-indigo-400"
                      >
                        <img
                          src={getUnitThumbnail(ship.thumbnailName)}
                          alt={ship.name}
                          className="w-10 h-10 rounded"
                          loading="lazy"
                        />
                        <span className="font-medium">{ship.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">{getAlignmentBadge(ship.categories)}</td>
                    <td className="px-4 py-3">{getRoleBadge(ship.categories)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {getFactions(ship.categories).slice(0, 3).map(f => (
                          <span
                            key={f.id}
                            className="px-2 py-0.5 text-xs rounded bg-gray-600 text-gray-200"
                          >
                            {f.name}
                          </span>
                        ))}
                        {getFactions(ship.categories).length > 3 && (
                          <span className="px-2 py-0.5 text-xs rounded bg-gray-600 text-gray-400">
                            +{getFactions(ship.categories).length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ship.isCapital && (
                        <span className="px-2 py-0.5 text-xs rounded bg-yellow-600 text-yellow-100">
                          Capital
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-400">
                      {ship.crew.length || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
