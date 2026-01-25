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
  list: (params: {
    guildId: string;
    playerId?: string;
    warningTypeId?: number;
    page?: number;
    limit?: number;
    currentMembersOnly?: boolean;
    daysAgo?: number;
  }) => {
    const searchParams = new URLSearchParams();
    searchParams.set('guildId', params.guildId);
    if (params.playerId) searchParams.set('playerId', params.playerId);
    if (params.warningTypeId) searchParams.set('warningTypeId', String(params.warningTypeId));
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.currentMembersOnly !== undefined) searchParams.set('currentMembersOnly', String(params.currentMembersOnly));
    if (params.daysAgo) searchParams.set('daysAgo', String(params.daysAgo));
    return fetchApi<WarningsResponse>(`/api/warnings?${searchParams}`);
  },
  getMyStats: (guildId: string, playerId: string) =>
    fetchApi<WarningStats>(`/api/warnings/stats/my?guildId=${guildId}&playerId=${playerId}`),
  getTypes: (guildId: string) =>
    fetchApi<{ warningTypes: WarningType[] }>(`/api/warnings/types?guildId=${guildId}`),

  // Warning Types CRUD
  createType: (guildId: string, name: string, severity: number) =>
    fetchApi<{ warningType: WarningType }>('/api/warnings/types', {
      method: 'POST',
      body: JSON.stringify({ guildId, name, severity }),
    }),

  updateType: (id: number, name: string, severity: number) =>
    fetchApi<{ warningType: WarningType }>(`/api/warnings/types/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, severity }),
    }),

  deleteType: (id: number) =>
    fetchApi<void>(`/api/warnings/types/${id}`, { method: 'DELETE' }),

  // Issue Warning
  issue: (guildId: string, playerId: string, warningTypeId: number, note?: string, issuedBy?: string) =>
    fetchApi<{ warning: Warning }>('/api/warnings', {
      method: 'POST',
      body: JSON.stringify({ guildId, playerId, warningTypeId, note, issuedBy }),
    }),
};

// Violations API
export const violationsApi = {
  list: (params: {
    guildId: string;
    playerId?: string;
    page?: number;
    limit?: number;
    currentMembersOnly?: boolean;
    daysAgo?: number;
  }) => {
    const searchParams = new URLSearchParams();
    searchParams.set('guildId', params.guildId);
    if (params.playerId) searchParams.set('playerId', params.playerId);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.currentMembersOnly !== undefined) searchParams.set('currentMembersOnly', String(params.currentMembersOnly));
    if (params.daysAgo) searchParams.set('daysAgo', String(params.daysAgo));
    return fetchApi<ViolationsResponse>(`/api/violations?${searchParams}`);
  },
  getMyStats: (guildId: string, playerId: string) =>
    fetchApi<ViolationStats>(`/api/violations/stats/my?guildId=${guildId}&playerId=${playerId}`),
};

// Guild API
export const guildApi = {
  getMembers: (guildId: string) =>
    fetchApi<{ members: GuildMember[] }>(`/api/guilds/${guildId}/members?format=dropdown`),
};

// Types
export type MemberRole = 'Leader' | 'Officer' | 'Member';

export interface GuildMember {
  allyCode: string;
  playerName: string;
}

export interface SessionPlayer {
  allyCode: string;
  playerName: string;
  playerId: string;
  guildId: string;
  guildName: string;
  memberLevel: number;
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

export interface WarningType {
  id: number;
  name: string;
  severity: number;
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
