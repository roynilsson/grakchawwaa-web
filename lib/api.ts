// grakchawwaa-web/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, error.error || error.message || 'Request failed');
  }

  return response.json();
}

// Auth API
export const authApi = {
  getSession: () => fetchApi<SessionData>('/auth/me'),
  selectPlayer: (allyCode: string) =>
    fetchApi<{ success: boolean }>('/auth/select-player', {
      method: 'POST',
      body: JSON.stringify({ allyCode }),
    }),
  logout: () =>
    fetchApi<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    }),
};

// Warnings API
export const warningsApi = {
  // Guild-scoped routes
  list: (params: {
    guildId: string;
    playerId?: string;
    warningTypeId?: number;
    page?: number;
    limit?: number;
    currentMembersOnly?: boolean;
    daysAgo?: number;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.playerId) searchParams.set('playerId', params.playerId);
    if (params.warningTypeId) searchParams.set('warningTypeId', String(params.warningTypeId));
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.currentMembersOnly !== undefined) searchParams.set('currentMembersOnly', String(params.currentMembersOnly));
    if (params.daysAgo) searchParams.set('daysAgo', String(params.daysAgo));
    if (params.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return fetchApi<WarningsResponse>(`/api/guilds/${params.guildId}/warnings${query ? `?${query}` : ''}`);
  },

  // Player-scoped routes (for viewing own warnings)
  listMy: (params: {
    allyCode: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return fetchApi<WarningsResponse>(`/api/players/${params.allyCode}/warnings${query ? `?${query}` : ''}`);
  },
  getMyStats: (allyCode: string) =>
    fetchApi<WarningStats>(`/api/players/${allyCode}/warnings/stats`),

  // Warning Types - guild-scoped
  getTypes: (guildId: string, search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return fetchApi<{ warningTypes: WarningType[] }>(`/api/guilds/${guildId}/warning-types${query}`);
  },
  createType: (guildId: string, name: string, severity: number, categoryId?: number, description?: string) =>
    fetchApi<{ warningType: WarningType }>(`/api/guilds/${guildId}/warning-types`, {
      method: 'POST',
      body: JSON.stringify({ name, severity, categoryId, description }),
    }),

  // Warning Types - ID-based routes (top-level)
  updateType: (id: number, name: string, severity: number, categoryId?: number | null, description?: string | null) =>
    fetchApi<{ warningType: WarningType }>(`/api/warning-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, severity, categoryId, description }),
    }),
  deleteType: (id: number) =>
    fetchApi<void>(`/api/warning-types/${id}`, { method: 'DELETE' }),

  // Issue Warning - guild-scoped
  issue: (guildId: string, playerId: string, warningTypeId: number, note?: string) =>
    fetchApi<{ warning: Warning }>(`/api/guilds/${guildId}/warnings`, {
      method: 'POST',
      body: JSON.stringify({ playerId, warningTypeId, note }),
    }),
  bulkCreate: (
    guildId: string,
    warnings: Array<{ allyCode: string; warningTypeId: number; date?: string; note?: string }>,
    issuedBy: string
  ) =>
    fetchApi<{ created: number }>(`/api/guilds/${guildId}/warnings/bulk`, {
      method: 'POST',
      body: JSON.stringify({ warnings, issuedBy }),
    }),
};

// Warning Categories API
export const warningCategoriesApi = {
  list: async (guildId: string): Promise<{ categories: WarningCategory[] }> => {
    return fetchApi(`/api/guilds/${guildId}/warning-categories`);
  },
  create: async (guildId: string, name: string): Promise<{ category: WarningCategory }> => {
    return fetchApi(`/api/guilds/${guildId}/warning-categories`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },
  delete: async (guildId: string, id: number): Promise<void> => {
    await fetchApi(`/api/guilds/${guildId}/warning-categories/${id}`, {
      method: 'DELETE',
    });
  },
};

// Violations API
export const violationsApi = {
  // Guild-scoped routes
  list: (params: {
    guildId: string;
    playerId?: string;
    page?: number;
    limit?: number;
    currentMembersOnly?: boolean;
    daysAgo?: number;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.playerId) searchParams.set('playerId', params.playerId);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.currentMembersOnly !== undefined) searchParams.set('currentMembersOnly', String(params.currentMembersOnly));
    if (params.daysAgo) searchParams.set('daysAgo', String(params.daysAgo));
    if (params.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return fetchApi<ViolationsResponse>(`/api/guilds/${params.guildId}/violations${query ? `?${query}` : ''}`);
  },

  // Player-scoped routes (for viewing own violations)
  listMy: (params: {
    allyCode: string;
    page?: number;
    limit?: number;
    daysAgo?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.daysAgo) searchParams.set('daysAgo', String(params.daysAgo));
    const query = searchParams.toString();
    return fetchApi<ViolationsResponse>(`/api/players/${params.allyCode}/violations${query ? `?${query}` : ''}`);
  },
  getMyStats: (allyCode: string) =>
    fetchApi<ViolationStats>(`/api/players/${allyCode}/violations/stats`),

  // Guild-scoped bulk create
  bulkCreate: (guildId: string, violations: Array<{ playerId: string; date: string; ticketCount: number }>) =>
    fetchApi<{ created: number; updated: number }>(`/api/guilds/${guildId}/violations/bulk`, {
      method: 'POST',
      body: JSON.stringify({ violations }),
    }),
};

// Guild API
export const guildApi = {
  getMembers: (guildId: string) =>
    fetchApi<{ members: GuildMember[] }>(`/api/guilds/${guildId}/members?format=dropdown`),
  getMembersDetailed: (guildId: string, includeInactive: boolean = false, withApiKey: boolean = false) => {
    const params = new URLSearchParams();
    if (includeInactive) params.set('includeInactive', 'true');
    if (withApiKey) params.set('withApiKey', 'true');
    const query = params.toString();
    return fetchApi<{ members: GuildMemberDetailed[] }>(`/api/guilds/${guildId}/members${query ? `?${query}` : ''}`);
  },
  getChannels: (guildId: string) =>
    fetchApi<{ channels: GuildChannel[] }>(`/api/guilds/${guildId}/channels`),
  toggleAdmin: (guildId: string, allyCode: string, isAdmin: boolean, callerAllyCode: string) =>
    fetchApi<{ member: GuildMemberDetailed }>(`/api/guilds/${guildId}/members/${allyCode}/admin`, {
      method: 'POST',
      body: JSON.stringify({ isAdmin, callerAllyCode }),
    }),
};

// Automations API
export const automationsApi = {
  // Top-level routes
  getTypes: () => fetchApi<{ automationTypes: AutomationTypesRegistry }>('/api/automations/types'),

  // Guild-scoped routes
  list: (guildId: string) =>
    fetchApi<{ automations: Automation[] }>(`/api/guilds/${guildId}/automations`),
  create: (
    guildId: string,
    data: {
      automationType: string;
      interval?: string;
      config?: Record<string, unknown>;
      enabled?: boolean;
    }
  ) =>
    fetchApi<{ automation: Automation }>(`/api/guilds/${guildId}/automations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ID-based routes (top-level)
  get: (id: number) => fetchApi<{ automation: Automation }>(`/api/automations/${id}`),
  update: (
    id: number,
    data: {
      interval?: string;
      config?: Record<string, unknown>;
      enabled?: boolean;
    }
  ) =>
    fetchApi<{ automation: Automation }>(`/api/automations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<void>(`/api/automations/${id}`, { method: 'DELETE' }),
};

// Players API
export const playersApi = {
  update: (allyCode: string, data: {
    name?: string;
    playerId?: string;
    discordId?: string;
    isMain?: boolean;
    mhannApiKey?: string;
  }) =>
    fetchApi<{ player: Player }>(`/api/players/${allyCode}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Raids API
export const raidsApi = {
  getActive: (guildId: string) =>
    fetchApi<ActiveRaidResponse>(`/api/guilds/${guildId}/raids/active`),
  getHistory: (guildId: string, params?: { raidType?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.raidType) searchParams.set('raidType', params.raidType);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const query = searchParams.toString();
    return fetchApi<RaidHistoryResponse>(`/api/guilds/${guildId}/raids/history${query ? `?${query}` : ''}`);
  },
  updateGuildConfig: (guildId: string, raidType: string, guildMinScore: number) =>
    fetchApi<{ config: { guildId: string; raidType: string; guildMinScore: number } }>(
      `/api/guilds/${guildId}/raids/${raidType}/config`,
      {
        method: 'PUT',
        body: JSON.stringify({ guildMinScore }),
      }
    ),
  updatePlayerConfig: (guildId: string, raidType: string, allyCode: string, playerMinScore: number) =>
    fetchApi<{ config: { allyCode: string; raidType: string; playerMinScore: number; allTimeHigh: number } }>(
      `/api/guilds/${guildId}/raids/${raidType}/players/${allyCode}/config`,
      {
        method: 'PUT',
        body: JSON.stringify({ playerMinScore }),
      }
    ),
};

// Types
export type MemberRole = 'Leader' | 'Officer' | 'Member';

export interface GuildChannel {
  id: number;
  discordChannelId: string;
  name: string;
}

export interface GuildMember {
  allyCode: string;
  playerName: string;
}

export interface GuildMemberDetailed {
  joinedAt: string;
  leftAt?: string;
  isActive: boolean;
  memberLevel?: number;
  isAdmin?: boolean;
  player: {
    allyCode: string;
    discordId?: string;
    discordUsername?: string;
    name?: string;
    playerId?: string;
    playerLevel?: number;
    galacticPower?: number | string; // BigInt from DB can be serialized as string
    lastActivityTime?: string;
  };
}

export interface SessionPlayer {
  allyCode: string;
  playerName: string;
  playerId: string;
  guildId: string;
  guildName: string;
  memberLevel: number;
  isAdmin?: boolean;
  isMain: boolean;
}

export function getMemberRole(level: number): MemberRole {
  if (level === 4) return 'Leader';
  if (level === 3) return 'Officer';
  return 'Member';
}

export interface SessionData {
  discordId: string;
  discordUsername: string;
  discordAvatar: string;
  players: SessionPlayer[];
  selectedAllyCode?: string;
}

export interface Warning {
  id: number;
  createdAt: string;
  note?: string;
  player: { allyCode: string; name?: string };
  warningType: { id: number; name: string; severity: number };
  issuedByPlayer?: { allyCode: string; name?: string };
}

export interface WarningsResponse {
  warnings: Warning[];
  count: number;
  total: number;
  page: number;
}

export interface WarningStats {
  total: number;
  last30Days: number;
}

export interface WarningCategory {
  id: number;
  name: string;
}

export interface WarningType {
  id: number;
  name: string;
  severity: number;
  category?: WarningCategory | null;
  description?: string | null;
}

export interface Violation {
  guildId: string;
  playerId: string;
  playerName?: string;
  allyCode?: string;
  date: string;
  ticketCount: number;
}

export interface ViolationsResponse {
  violations: Violation[];
  count: number;
  total: number;
  page: number;
}

export interface ViolationStats {
  last30Days: number;
  avgTickets: number;
}

// Automation types
export interface AutomationTypeConfig {
  name: string;
  category: string;
  scope: 'system' | 'guild';
  processedBy: 'backend' | 'bot';
  triggerType: 'calendar' | 'interval' | 'event';
  intervals: readonly string[];
  defaultConfig?: Record<string, unknown>;
  config: {
    hasThresholds: boolean;
    thresholdLabel?: string;
    hasChannelId?: boolean;
    hasPlayerSelector?: boolean;
    hasReminderHours?: boolean;
    hasOffsetMinutes?: boolean;
    hasDualOffsets?: boolean;
  };
}

export type AutomationTypesRegistry = Record<string, AutomationTypeConfig>;

export interface ResolvedChannel {
  id: number;
  discordChannelId: string;
  name: string;
}

export interface Automation {
  id: number;
  automationType: string;
  scope: 'system' | 'guild';
  processedBy: 'backend' | 'bot';
  interval?: string;
  nextRunAt?: string;
  lastRunAt?: string;
  config: Record<string, unknown>;
  resolvedChannel?: ResolvedChannel;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Player {
  allyCode: string;
  discordId?: string;
  playerId?: string;
  name?: string;
  isMain: boolean;
  playerLevel?: number;
  galacticPower?: number | string;
  lastActivityTime?: string;
  mhannApiKey?: string;
  registeredAt: string;
}

export interface RaidResult {
  player: { allyCode: string; name?: string };
  score: number;
  rank: number;
}

export interface PlayerRaidConfig {
  player: { allyCode: string; name?: string };
  playerMinScore?: number;
  allTimeHigh: number;
}

export interface ActiveRaidResponse {
  raid: {
    id: number;
    raidType: string;
    expireTime: string;
    startTime: string;
    guildRewardScore: number;
    isFinalized: boolean;
  } | null;
  results: RaidResult[];
  guildConfig?: {
    guildMinScore: number;
  };
  playerConfigs: PlayerRaidConfig[];
}

export interface RaidHistoryResult {
  playerId: string;
  playerName: string;
  score: number;
  rank: number;
}

export interface RaidHistoryResponse {
  raids: Array<{
    raid: {
      id: number;
      raidType: string;
      expireTime: string;
      startTime: string;
      guildRewardScore: number;
    };
    results: RaidHistoryResult[];
    participationRate: number;
    avgScore: number;
  }>;
  total: number;
}

// Game Data Types
export interface GameCategory {
  id: string;
  type: 'alignment' | 'role' | 'faction';
  name: string;
}

export interface CharacterAbility {
  name: string;
  type: 'basic' | 'special' | 'leader' | 'unique';
  hasZeta: boolean;
  hasOmicron: boolean;
  omicronMode?: string;
}

export interface CharacterSummary {
  baseId: string;
  name: string;
  thumbnailName: string;
  isLeader: boolean;
  isGalacticLegend: boolean;
  categories: GameCategory[];
  abilities: CharacterAbility[];
}

export interface ShipAbility {
  name: string;
  type: 'basic' | 'special' | 'unique' | 'hardware';
}

export interface CrewMember {
  baseId: string;
  name: string;
}

export interface ShipSummary {
  baseId: string;
  name: string;
  thumbnailName: string;
  isCapital: boolean;
  categories: GameCategory[];
  crew: CrewMember[];
  abilities: ShipAbility[];
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CharactersResponse {
  data: CharacterSummary[];
  pagination: PaginationInfo;
}

export interface ShipsResponse {
  data: ShipSummary[];
  pagination: PaginationInfo;
}

export interface CharacterFilters {
  page?: number;
  limit?: number;
  search?: string;
  alignment?: string;
  role?: string;
  faction?: string;
  isGalacticLegend?: boolean;
  hasZeta?: boolean;
  hasOmicron?: boolean;
}

export interface ShipFilters {
  page?: number;
  limit?: number;
  search?: string;
  alignment?: string;
  role?: string;
  faction?: string;
  isCapital?: boolean;
}

// Characters API
export const charactersApi = {
  list: (filters: CharacterFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.search) params.set('search', filters.search);
    if (filters.alignment) params.set('alignment', filters.alignment);
    if (filters.role) params.set('role', filters.role);
    if (filters.faction) params.set('faction', filters.faction);
    if (filters.isGalacticLegend) params.set('isGalacticLegend', 'true');
    if (filters.hasZeta) params.set('hasZeta', 'true');
    if (filters.hasOmicron) params.set('hasOmicron', 'true');
    const query = params.toString();
    return fetchApi<CharactersResponse>(`/api/characters${query ? `?${query}` : ''}`);
  },
  get: (baseId: string) =>
    fetchApi<{ character: CharacterSummary }>(`/api/characters/${baseId}`),
};

// Ships API
export const shipsApi = {
  list: (filters: ShipFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.search) params.set('search', filters.search);
    if (filters.alignment) params.set('alignment', filters.alignment);
    if (filters.role) params.set('role', filters.role);
    if (filters.faction) params.set('faction', filters.faction);
    if (filters.isCapital) params.set('isCapital', 'true');
    const query = params.toString();
    return fetchApi<ShipsResponse>(`/api/ships${query ? `?${query}` : ''}`);
  },
  get: (baseId: string) =>
    fetchApi<{ ship: ShipSummary }>(`/api/ships/${baseId}`),
};

// Categories API
export const categoriesApi = {
  list: (type?: 'alignment' | 'role' | 'faction') => {
    const query = type ? `?type=${type}` : '';
    return fetchApi<{ count: number; categories: GameCategory[] }>(`/api/categories${query}`);
  },
};

// Helper for unit thumbnails
export const getUnitThumbnail = (thumbnailName: string) =>
  `https://game-assets.swgoh.gg/textures/${thumbnailName}.png`;

// Journey Guide Types
export interface JourneyGuideCharacter {
  baseId: string;
  name: string;
  thumbnailName: string;
  isGalacticLegend: boolean;
}

export interface JourneyGuideShip {
  baseId: string;
  name: string;
  thumbnailName: string;
}

export interface JourneyRequirement {
  id: number;
  requiredCharacter: {
    baseId: string;
    name: string;
    thumbnailName: string;
  } | null;
  requiredShip: {
    baseId: string;
    name: string;
    thumbnailName: string;
  } | null;
  requiredCategory: {
    id: string;
    type: string;
    name: string;
  } | null;
  minimumCount: number | null;
  minimumStars: number | null;
  minimumGearLevel: number | null;
  minimumRelicLevel: number | null;
  isShipRequirement: boolean;
}

export interface NestedRequirementData extends JourneyRequirement {
  isDuplicate: boolean;
}

export interface NestedRequirementTier {
  tier: number;
  sourceGuide: {
    id: number;
    title: string;
    character: { baseId: string; name: string; thumbnailName: string } | null;
    ship: { baseId: string; name: string; thumbnailName: string } | null;
  };
  requirements: NestedRequirementData[];
}

export type JourneyGuideType =
  | 'galactic_legend'
  | 'fleet_mastery'
  | 'epic'
  | 'journey'
  | 'legendary'
  | 'progression'
  | 'raid'
  | 'territory_battle'
  | 'other';

export interface JourneyGuide {
  id: number;
  title: string;
  type: JourneyGuideType;
  character: JourneyGuideCharacter | null;
  ship: JourneyGuideShip | null;
  requirementsCount: number;
  requirements: JourneyRequirement[];
  nestedRequirements?: NestedRequirementTier[];
}

export interface JourneyGuidesResponse {
  data: JourneyGuide[];
  total: number;
}

// Journey Guides API
export const journeyGuidesApi = {
  list: () => fetchApi<JourneyGuidesResponse>('/api/journey-guides'),
  get: (id: number) => fetchApi<{ journeyGuide: JourneyGuide }>(`/api/journey-guides/${id}`),
};

// Squad Types
export interface SquadTag {
  id: string;
  name: string;
  guild?: { id: string };
}

export interface SquadSlotCharacter {
  character: {
    baseId: string;
    name: string;
    thumbnailName: string;
  };
  requiredZetas?: string[];
  requiredOmicrons?: string[];
}

export interface SquadSlotShip {
  ship: {
    baseId: string;
    name: string;
    thumbnailName: string;
  };
}

export interface SquadSlot {
  id: string;
  position: number;
  slotType: 'specific' | 'category' | 'pool';
  categoryMatchMode?: 'all' | 'any';
  minRarity?: number;
  minGearLevel?: number;
  minRelicLevel?: number;
  minCrewRelicLevel?: number;
  categories: GameCategory[];
  characters: SquadSlotCharacter[];
  ships: SquadSlotShip[];
}

export interface Squad {
  id: string;
  name: string;
  description?: string;
  type: 'squad' | 'fleet';
  isTemplate: boolean;
  tags: SquadTag[];
  slots: SquadSlot[];
  createdAt: string;
  updatedAt: string;
}

export interface SlotInput {
  position: number;
  slotType: 'specific' | 'category' | 'pool';
  categoryMatchMode?: 'all' | 'any';
  minRarity?: number;
  minGearLevel?: number;
  minRelicLevel?: number;
  minCrewRelicLevel?: number;
  categoryIds?: string[];
  characters?: Array<{
    characterId: string;
    requiredZetas?: string[];
    requiredOmicrons?: string[];
  }>;
  ships?: Array<{
    shipId: string;
  }>;
}

export interface SquadInput {
  name: string;
  description?: string;
  type: 'squad' | 'fleet';
  tagIds?: string[];
  slots: SlotInput[];
}

// Squad Tags API
export const squadTagsApi = {
  listSystem: () => fetchApi<{ tags: SquadTag[] }>('/api/squad-tags'),
  list: (guildId: string) => fetchApi<{ tags: SquadTag[] }>(`/api/guilds/${guildId}/squad-tags`),
  create: (guildId: string, name: string) =>
    fetchApi<{ tag: SquadTag }>(`/api/guilds/${guildId}/squad-tags`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  delete: (guildId: string, tagId: string) =>
    fetchApi<void>(`/api/guilds/${guildId}/squad-tags/${tagId}`, { method: 'DELETE' }),
};

// Squad Templates API
export const squadTemplatesApi = {
  list: (type?: 'squad' | 'fleet', tagId?: string) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (tagId) params.set('tagId', tagId);
    const query = params.toString();
    return fetchApi<{ templates: Squad[] }>(`/api/squad-templates${query ? `?${query}` : ''}`);
  },
  get: (templateId: string) =>
    fetchApi<{ template: Squad }>(`/api/squad-templates/${templateId}`),
  copyToGuild: (guildId: string, templateId: string) =>
    fetchApi<{ squad: Squad }>(`/api/guilds/${guildId}/squads/from-template/${templateId}`, {
      method: 'POST',
    }),
};

// Squads API
export const squadsApi = {
  list: (guildId: string, type?: 'squad' | 'fleet', tagId?: string) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (tagId) params.set('tagId', tagId);
    const query = params.toString();
    return fetchApi<{ squads: Squad[] }>(`/api/guilds/${guildId}/squads${query ? `?${query}` : ''}`);
  },
  get: (guildId: string, squadId: string) =>
    fetchApi<{ squad: Squad }>(`/api/guilds/${guildId}/squads/${squadId}`),
  create: (guildId: string, data: SquadInput) =>
    fetchApi<{ squad: Squad }>(`/api/guilds/${guildId}/squads`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (guildId: string, squadId: string, data: SquadInput) =>
    fetchApi<{ squad: Squad }>(`/api/guilds/${guildId}/squads/${squadId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (guildId: string, squadId: string) =>
    fetchApi<void>(`/api/guilds/${guildId}/squads/${squadId}`, { method: 'DELETE' }),
};
