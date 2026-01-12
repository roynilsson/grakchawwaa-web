// grakchawwaa-web/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

class ApiError extends Error {
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
    credentials: 'include', // Important: send cookies
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

// Types
export type MemberRole = 'Leader' | 'Officer' | 'Member';

export interface SessionPlayer {
  allyCode: string;
  playerName: string;
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

export { ApiError };
