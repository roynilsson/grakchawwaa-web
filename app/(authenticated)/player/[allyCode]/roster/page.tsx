'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  rosterApi,
  categoriesApi,
  CharacterRosterItem,
  ShipRosterItem,
  GameCategory,
  PaginationInfo,
  getUnitThumbnail,
} from '../../../../../lib/api';
import { Pagination } from '../../../../../components/Pagination';

type TabType = 'characters' | 'ships';

export default function PlayerRosterPage() {
  const params = useParams();
  const allyCode = params.allyCode as string;

  // Player info
  const [playerInfo, setPlayerInfo] = useState<{
    allyCode: string;
    name?: string;
    playerLevel?: number;
    galacticPower?: number;
  } | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('characters');

  // Characters state
  const [characters, setCharacters] = useState<CharacterRosterItem[]>([]);
  const [charPagination, setCharPagination] = useState<PaginationInfo | null>(null);
  const [charLoading, setCharLoading] = useState(false);

  // Ships state
  const [ships, setShips] = useState<ShipRosterItem[]>([]);
  const [shipPagination, setShipPagination] = useState<PaginationInfo | null>(null);
  const [shipLoading, setShipLoading] = useState(false);

  // Shared state
  const [factions, setFactions] = useState<GameCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Character filters
  const [charSearch, setCharSearch] = useState('');
  const [charDebouncedSearch, setCharDebouncedSearch] = useState('');
  const [charAlignment, setCharAlignment] = useState('');
  const [charRole, setCharRole] = useState('');
  const [charFaction, setCharFaction] = useState('');
  const [charHasZeta, setCharHasZeta] = useState(false);
  const [charHasOmicron, setCharHasOmicron] = useState(false);
  const [charSort, setCharSort] = useState('name');
  const [charOrder, setCharOrder] = useState<'asc' | 'desc'>('asc');
  const [charPage, setCharPage] = useState(1);

  // Ship filters
  const [shipSearch, setShipSearch] = useState('');
  const [shipDebouncedSearch, setShipDebouncedSearch] = useState('');
  const [shipAlignment, setShipAlignment] = useState('');
  const [shipRole, setShipRole] = useState('');
  const [shipFaction, setShipFaction] = useState('');
  const [shipSort, setShipSort] = useState('name');
  const [shipOrder, setShipOrder] = useState<'asc' | 'desc'>('asc');
  const [shipPage, setShipPage] = useState(1);

  // Debounce character search
  useEffect(() => {
    const timer = setTimeout(() => setCharDebouncedSearch(charSearch), 300);
    return () => clearTimeout(timer);
  }, [charSearch]);

  // Debounce ship search
  useEffect(() => {
    const timer = setTimeout(() => setShipDebouncedSearch(shipSearch), 300);
    return () => clearTimeout(timer);
  }, [shipSearch]);

  // Reset page when character filters change
  useEffect(() => {
    setCharPage(1);
  }, [charDebouncedSearch, charAlignment, charRole, charFaction, charHasZeta, charHasOmicron, charSort, charOrder]);

  // Reset page when ship filters change
  useEffect(() => {
    setShipPage(1);
  }, [shipDebouncedSearch, shipAlignment, shipRole, shipFaction, shipSort, shipOrder]);

  // Fetch factions for dropdown
  useEffect(() => {
    categoriesApi.list('faction').then(res => setFactions(res.categories));
  }, []);

  // Fetch player info on mount
  useEffect(() => {
    const fetchPlayerInfo = async () => {
      try {
        const response = await rosterApi.getFullRoster(allyCode);
        setPlayerInfo(response.player);
        setInitialLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load player');
        setInitialLoading(false);
      }
    };
    fetchPlayerInfo();
  }, [allyCode]);

  // Fetch characters
  const fetchCharacters = useCallback(async () => {
    setCharLoading(true);
    try {
      // Build category filter
      let categoryFilter: string | undefined;
      if (charAlignment) categoryFilter = `alignment_${charAlignment}`;
      else if (charRole) categoryFilter = `role_${charRole}`;
      else if (charFaction) categoryFilter = `affiliation_${charFaction}`;

      const response = await rosterApi.getCharacters(allyCode, {
        page: charPage,
        limit: 25,
        search: charDebouncedSearch || undefined,
        category: categoryFilter,
        hasZeta: charHasZeta || undefined,
        hasOmicron: charHasOmicron || undefined,
        sort: charSort,
        order: charOrder,
      });
      setCharacters(response.data);
      setCharPagination(response.pagination);
    } catch (err) {
      console.error('Failed to load characters:', err);
    } finally {
      setCharLoading(false);
    }
  }, [allyCode, charPage, charDebouncedSearch, charAlignment, charRole, charFaction, charHasZeta, charHasOmicron, charSort, charOrder]);

  // Fetch ships
  const fetchShips = useCallback(async () => {
    setShipLoading(true);
    try {
      // Build category filter
      let categoryFilter: string | undefined;
      if (shipAlignment) categoryFilter = `alignment_${shipAlignment}`;
      else if (shipRole) categoryFilter = `role_${shipRole}`;
      else if (shipFaction) categoryFilter = `affiliation_${shipFaction}`;

      const response = await rosterApi.getShips(allyCode, {
        page: shipPage,
        limit: 25,
        search: shipDebouncedSearch || undefined,
        category: categoryFilter,
        sort: shipSort,
        order: shipOrder,
      });
      setShips(response.data);
      setShipPagination(response.pagination);
    } catch (err) {
      console.error('Failed to load ships:', err);
    } finally {
      setShipLoading(false);
    }
  }, [allyCode, shipPage, shipDebouncedSearch, shipAlignment, shipRole, shipFaction, shipSort, shipOrder]);

  // Fetch data when tab changes or filters change
  useEffect(() => {
    if (activeTab === 'characters') {
      fetchCharacters();
    } else {
      fetchShips();
    }
  }, [activeTab, fetchCharacters, fetchShips]);

  const clearCharFilters = () => {
    setCharSearch('');
    setCharAlignment('');
    setCharRole('');
    setCharFaction('');
    setCharHasZeta(false);
    setCharHasOmicron(false);
    setCharSort('name');
    setCharOrder('asc');
  };

  const clearShipFilters = () => {
    setShipSearch('');
    setShipAlignment('');
    setShipRole('');
    setShipFaction('');
    setShipSort('name');
    setShipOrder('asc');
  };

  const hasCharFilters = charSearch || charAlignment || charRole || charFaction || charHasZeta || charHasOmicron || charSort !== 'name' || charOrder !== 'asc';
  const hasShipFilters = shipSearch || shipAlignment || shipRole || shipFaction || shipSort !== 'name' || shipOrder !== 'asc';

  const formatGalacticPower = (gp?: number) => {
    if (!gp) return '-';
    if (gp >= 1000000) return `${(gp / 1000000).toFixed(2)}M`;
    if (gp >= 1000) return `${(gp / 1000).toFixed(1)}K`;
    return gp.toString();
  };

  const getStars = (rarity: number) => {
    return '★'.repeat(rarity) + '☆'.repeat(7 - rarity);
  };

  const countZetas = (abilities: CharacterRosterItem['abilities']) =>
    abilities.filter(a => a.hasZeta).length;

  const countOmicrons = (abilities: CharacterRosterItem['abilities']) =>
    abilities.filter(a => a.hasOmicron).length;

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-400">Loading roster...</div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div>
      {/* Player Header */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{playerInfo?.name || 'Unknown Player'}</h1>
            <p className="text-gray-400 text-sm mt-1">Ally Code: {allyCode}</p>
          </div>
          <div className="flex gap-6">
            {playerInfo?.playerLevel && (
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-400">{playerInfo.playerLevel}</p>
                <p className="text-xs text-gray-400">Level</p>
              </div>
            )}
            {playerInfo?.galacticPower && (
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{formatGalacticPower(playerInfo.galacticPower)}</p>
                <p className="text-xs text-gray-400">GP</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('characters')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'characters'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Characters
          {charPagination && (
            <span className="ml-2 text-xs text-gray-500">({charPagination.total})</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ships')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'ships'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Ships
          {shipPagination && (
            <span className="ml-2 text-xs text-gray-500">({shipPagination.total})</span>
          )}
        </button>
      </div>

      {/* Characters Tab */}
      {activeTab === 'characters' && (
        <>
          {/* Filters */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Search</label>
                <input
                  type="text"
                  value={charSearch}
                  onChange={e => setCharSearch(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Alignment */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Alignment</label>
                <select
                  value={charAlignment}
                  onChange={e => { setCharAlignment(e.target.value); setCharRole(''); setCharFaction(''); }}
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
                  value={charRole}
                  onChange={e => { setCharRole(e.target.value); setCharAlignment(''); setCharFaction(''); }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All</option>
                  <option value="attacker">Attacker</option>
                  <option value="tank">Tank</option>
                  <option value="support">Support</option>
                  <option value="healer">Healer</option>
                </select>
              </div>

              {/* Faction */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Faction</label>
                <select
                  value={charFaction}
                  onChange={e => { setCharFaction(e.target.value); setCharAlignment(''); setCharRole(''); }}
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

              {/* Sort */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Sort By</label>
                <div className="flex gap-2">
                  <select
                    value={charSort}
                    onChange={e => setCharSort(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="name">Name</option>
                    <option value="rarity">Rarity</option>
                    <option value="gearLevel">Gear</option>
                    <option value="relicLevel">Relic</option>
                  </select>
                  <button
                    onClick={() => setCharOrder(charOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm hover:bg-gray-600"
                    title={charOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {charOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>

            {/* Toggle filters */}
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={charHasZeta}
                  onChange={e => setCharHasZeta(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-300">Has Zeta</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={charHasOmicron}
                  onChange={e => setCharHasOmicron(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-300">Has Omicron</span>
              </label>

              {hasCharFilters && (
                <button
                  onClick={clearCharFilters}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Characters Table */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Character</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Stars</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Gear</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Relic</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Zetas</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Omicrons</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {charLoading && characters.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        Loading...
                      </td>
                    </tr>
                  ) : characters.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        No characters found
                      </td>
                    </tr>
                  ) : (
                    characters.map(char => (
                      <tr key={char.baseId} className="hover:bg-gray-750">
                        <td className="px-4 py-3">
                          <Link
                            href={`/game-data/characters/${char.baseId}`}
                            className="flex items-center gap-3 hover:text-indigo-400"
                          >
                            <div className="relative">
                              <img
                                src={getUnitThumbnail(char.thumbnailName)}
                                alt={char.name}
                                className="w-10 h-10 rounded"
                                loading="lazy"
                              />
                              {char.isGalacticLegend && (
                                <span className="absolute -top-1 -right-1 px-1 text-xs bg-yellow-600 text-yellow-100 rounded">
                                  GL
                                </span>
                              )}
                            </div>
                            <span className="font-medium">{char.name}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-center text-yellow-400 text-sm">
                          {getStars(char.rarity)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            char.gearLevel >= 13 ? 'bg-yellow-600 text-yellow-100' :
                            char.gearLevel >= 12 ? 'bg-purple-600 text-purple-100' :
                            'bg-gray-600 text-gray-200'
                          }`}>
                            G{char.gearLevel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {char.relicLevel > 0 ? (
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              char.relicLevel >= 9 ? 'bg-red-600 text-red-100' :
                              char.relicLevel >= 7 ? 'bg-orange-600 text-orange-100' :
                              'bg-blue-600 text-blue-100'
                            }`}>
                              R{char.relicLevel}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          {countZetas(char.abilities) > 0 ? (
                            <span className="text-purple-400">{countZetas(char.abilities)}</span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          {countOmicrons(char.abilities) > 0 ? (
                            <span className="text-cyan-400">{countOmicrons(char.abilities)}</span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Characters Pagination */}
          {charPagination && charPagination.totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={charPagination.page}
                totalPages={charPagination.totalPages}
                onPageChange={setCharPage}
              />
            </div>
          )}
        </>
      )}

      {/* Ships Tab */}
      {activeTab === 'ships' && (
        <>
          {/* Filters */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Search</label>
                <input
                  type="text"
                  value={shipSearch}
                  onChange={e => setShipSearch(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Alignment */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Alignment</label>
                <select
                  value={shipAlignment}
                  onChange={e => { setShipAlignment(e.target.value); setShipRole(''); setShipFaction(''); }}
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
                  value={shipRole}
                  onChange={e => { setShipRole(e.target.value); setShipAlignment(''); setShipFaction(''); }}
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
                  value={shipFaction}
                  onChange={e => { setShipFaction(e.target.value); setShipAlignment(''); setShipRole(''); }}
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

              {/* Sort */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Sort By</label>
                <div className="flex gap-2">
                  <select
                    value={shipSort}
                    onChange={e => setShipSort(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="name">Name</option>
                    <option value="rarity">Rarity</option>
                  </select>
                  <button
                    onClick={() => setShipOrder(shipOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm hover:bg-gray-600"
                    title={shipOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {shipOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>

            {/* Clear filters */}
            {hasShipFilters && (
              <div className="mt-4">
                <button
                  onClick={clearShipFilters}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {/* Ships Table */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Ship</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Stars</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Capital</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Crew</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {shipLoading && ships.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                        Loading...
                      </td>
                    </tr>
                  ) : ships.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                        No ships found
                      </td>
                    </tr>
                  ) : (
                    ships.map(ship => (
                      <tr key={ship.baseId} className="hover:bg-gray-750">
                        <td className="px-4 py-3">
                          <Link
                            href={`/game-data/ships/${ship.baseId}`}
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
                        <td className="px-4 py-3 text-center text-yellow-400 text-sm">
                          {getStars(ship.rarity)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {ship.isCapital && (
                            <span className="px-2 py-0.5 text-xs rounded bg-yellow-600 text-yellow-100">
                              Capital
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {ship.crew.slice(0, 4).map(crewMember => (
                              <Link
                                key={crewMember.baseId}
                                href={`/game-data/characters/${crewMember.baseId}`}
                                title={crewMember.name}
                              >
                                <img
                                  src={getUnitThumbnail(crewMember.thumbnailName)}
                                  alt={crewMember.name}
                                  className="w-6 h-6 rounded hover:ring-2 hover:ring-indigo-500"
                                  loading="lazy"
                                />
                              </Link>
                            ))}
                            {ship.crew.length > 4 && (
                              <span className="text-xs text-gray-400">+{ship.crew.length - 4}</span>
                            )}
                            {ship.crew.length === 0 && (
                              <span className="text-xs text-gray-500">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ships Pagination */}
          {shipPagination && shipPagination.totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={shipPagination.page}
                totalPages={shipPagination.totalPages}
                onPageChange={setShipPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
