# URL Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure web app URLs from `/dashboard/*` to `/player`, `/guild`, `/officer`, `/game-data` to match Discord bot command hierarchy.

**Architecture:** Move page files to new directory structure, create shared layout with collapsible sidebar, add 403 page for officer access control. Big bang migration - all changes at once.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS 4

---

## Task 1: Create New Directory Structure

**Files:**
- Create: `app/auth/select-player/page.tsx`
- Create: `app/player/page.tsx`
- Create: `app/player/warnings/page.tsx`
- Create: `app/player/violations/page.tsx`
- Create: `app/player/settings/page.tsx`
- Create: `app/guild/page.tsx`
- Create: `app/guild/members/page.tsx`
- Create: `app/guild/squads/page.tsx`
- Create: `app/guild/squads/new/page.tsx`
- Create: `app/guild/squads/[squadId]/edit/page.tsx`
- Create: `app/guild/fleets/page.tsx`
- Create: `app/guild/fleets/new/page.tsx`
- Create: `app/guild/fleets/[fleetId]/edit/page.tsx`
- Create: `app/guild/raids/page.tsx`
- Create: `app/guild/raids/history/page.tsx`
- Create: `app/officer/page.tsx`
- Create: `app/officer/warnings/page.tsx`
- Create: `app/officer/violations/page.tsx`
- Create: `app/officer/automations/page.tsx`
- Create: `app/officer/raid-config/page.tsx`
- Create: `app/officer/warning-types/page.tsx`
- Create: `app/game-data/characters/page.tsx`
- Create: `app/game-data/characters/[baseId]/page.tsx`
- Create: `app/game-data/ships/page.tsx`
- Create: `app/game-data/ships/[baseId]/page.tsx`
- Create: `app/game-data/journey-guides/page.tsx`
- Create: `app/game-data/journey-guides/[id]/page.tsx`

**Step 1: Create directory structure**

```bash
mkdir -p app/auth/select-player
mkdir -p app/player/warnings app/player/violations app/player/settings
mkdir -p app/guild/members app/guild/squads/new "app/guild/squads/[squadId]/edit"
mkdir -p app/guild/fleets/new "app/guild/fleets/[fleetId]/edit"
mkdir -p app/guild/raids/history
mkdir -p app/officer/warnings app/officer/violations app/officer/automations
mkdir -p app/officer/raid-config app/officer/warning-types
mkdir -p "app/game-data/characters/[baseId]"
mkdir -p "app/game-data/ships/[baseId]"
mkdir -p "app/game-data/journey-guides/[id]"
```

**Step 2: Move auth pages**

```bash
mv app/select-player/page.tsx app/auth/select-player/page.tsx
rmdir app/select-player
```

**Step 3: Move player pages**

```bash
mv app/dashboard/page.tsx app/player/page.tsx
mv app/dashboard/warnings/page.tsx app/player/warnings/page.tsx
mv app/dashboard/violations/page.tsx app/player/violations/page.tsx
mv app/dashboard/settings/page.tsx app/player/settings/page.tsx
```

**Step 4: Move guild pages**

```bash
mv app/dashboard/guild/members/page.tsx app/guild/members/page.tsx
mv app/dashboard/guild/squads/page.tsx app/guild/squads/page.tsx
mv app/dashboard/guild/squads/new/page.tsx app/guild/squads/new/page.tsx
mv "app/dashboard/guild/squads/[squadId]/edit/page.tsx" "app/guild/squads/[squadId]/edit/page.tsx"
mv app/dashboard/guild/fleets/page.tsx app/guild/fleets/page.tsx
mv app/dashboard/guild/fleets/new/page.tsx app/guild/fleets/new/page.tsx
mv "app/dashboard/guild/fleets/[fleetId]/edit/page.tsx" "app/guild/fleets/[fleetId]/edit/page.tsx"
mv app/dashboard/raids/page.tsx app/guild/raids/page.tsx
mv app/dashboard/raids/history/page.tsx app/guild/raids/history/page.tsx
```

**Step 5: Move officer pages**

```bash
mv app/dashboard/guild/warnings/page.tsx app/officer/warnings/page.tsx
mv app/dashboard/guild/violations/page.tsx app/officer/violations/page.tsx
mv app/dashboard/guild/automations/page.tsx app/officer/automations/page.tsx
mv app/dashboard/guild/raid-config/page.tsx app/officer/raid-config/page.tsx
mv app/dashboard/guild/warning-types/page.tsx app/officer/warning-types/page.tsx
```

**Step 6: Move game-data pages**

```bash
mv app/dashboard/game-data/characters/page.tsx app/game-data/characters/page.tsx
mv "app/dashboard/game-data/characters/[baseId]/page.tsx" "app/game-data/characters/[baseId]/page.tsx"
mv app/dashboard/game-data/ships/page.tsx app/game-data/ships/page.tsx
mv "app/dashboard/game-data/ships/[baseId]/page.tsx" "app/game-data/ships/[baseId]/page.tsx"
mv app/dashboard/game-data/journey-guides/page.tsx app/game-data/journey-guides/page.tsx
mv "app/dashboard/game-data/journey-guides/[id]/page.tsx" "app/game-data/journey-guides/[id]/page.tsx"
```

**Step 7: Remove old dashboard directory**

```bash
rm -rf app/dashboard
```

**Step 8: Create guild index page (redirect to members)**

Create `app/guild/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function GuildPage() {
  redirect('/guild/members');
}
```

**Step 9: Create officer index page (redirect to warnings)**

Create `app/officer/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function OfficerPage() {
  redirect('/officer/warnings');
}
```

---

## Task 2: Create Shared Layout with Collapsible Sidebar

**Files:**
- Create: `app/(authenticated)/layout.tsx`
- Modify: `components/Sidebar.tsx`

**Step 1: Create collapsible sidebar component**

Replace `components/Sidebar.tsx` with:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface SidebarProps {
  isOfficer: boolean;
  isOpen: boolean;
  onClose: () => void;
}

interface NavSection {
  title: string;
  basePath: string;
  items: { label: string; href: string }[];
  officerOnly?: boolean;
}

const navSections: NavSection[] = [
  {
    title: 'Player',
    basePath: '/player',
    items: [
      { label: 'Dashboard', href: '/player' },
      { label: 'My Warnings', href: '/player/warnings' },
      { label: 'My Violations', href: '/player/violations' },
      { label: 'Settings', href: '/player/settings' },
    ],
  },
  {
    title: 'Guild',
    basePath: '/guild',
    items: [
      { label: 'Members', href: '/guild/members' },
      { label: 'Squads', href: '/guild/squads' },
      { label: 'Fleets', href: '/guild/fleets' },
      { label: 'Raids', href: '/guild/raids' },
    ],
  },
  {
    title: 'Officer',
    basePath: '/officer',
    officerOnly: true,
    items: [
      { label: 'Warnings', href: '/officer/warnings' },
      { label: 'Violations', href: '/officer/violations' },
      { label: 'Automations', href: '/officer/automations' },
      { label: 'Raid Config', href: '/officer/raid-config' },
      { label: 'Warning Types', href: '/officer/warning-types' },
    ],
  },
  {
    title: 'Game Data',
    basePath: '/game-data',
    items: [
      { label: 'Characters', href: '/game-data/characters' },
      { label: 'Ships', href: '/game-data/ships' },
      { label: 'Journey Guides', href: '/game-data/journey-guides' },
    ],
  },
];

export function Sidebar({ isOfficer, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Determine which sections should be expanded based on current path
  const getInitialExpandedSections = () => {
    const expanded: Record<string, boolean> = {};
    navSections.forEach((section) => {
      expanded[section.basePath] = pathname.startsWith(section.basePath);
    });
    return expanded;
  };

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(getInitialExpandedSections);

  // Update expanded sections when pathname changes
  useEffect(() => {
    setExpandedSections(getInitialExpandedSections());
  }, [pathname]);

  const toggleSection = (basePath: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [basePath]: !prev[basePath],
    }));
  };

  const isActive = (path: string) => pathname === path;

  const linkClasses = (path: string) =>
    `block px-4 py-2 rounded transition-colors ${
      isActive(path)
        ? 'bg-indigo-600 text-white'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`;

  const visibleSections = navSections.filter(
    (section) => !section.officerOnly || isOfficer
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-gray-800 border-r border-gray-700
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto
        `}
      >
        <div className="p-4">
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-white"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <nav className="space-y-2 mt-8 lg:mt-0">
            {visibleSections.map((section) => (
              <div key={section.basePath}>
                <button
                  onClick={() => toggleSection(section.basePath)}
                  className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors"
                >
                  <span>{section.title}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      expandedSections[section.basePath] ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedSections[section.basePath] && (
                  <div className="space-y-1 mt-1">
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={linkClasses(item.href)}
                        onClick={onClose}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
```

**Step 2: Move dashboard layout to be shared**

Move `app/dashboard/layout.tsx` to `app/(authenticated)/layout.tsx`:

The layout file needs to be updated with new redirect paths. Create `app/(authenticated)/layout.tsx`:

```tsx
'use client';

import { useAuth } from '../../lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Sidebar } from '../../components/Sidebar';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading, logout, selectPlayer } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) {
      if (!session) {
        router.push('/');
      } else if (session.players.length > 1 && !session.selectedAllyCode) {
        router.push('/auth/select-player');
      }
    }
  }, [session, loading, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      toast.error('Failed to logout');
      console.error('Error logging out:', error);
    }
  };

  const handleSwitchPlayer = async (allyCode: string) => {
    if (allyCode === session?.selectedAllyCode) {
      setDropdownOpen(false);
      return;
    }
    try {
      setSwitching(true);
      await selectPlayer(allyCode);
      toast.success('Player switched successfully');
      setDropdownOpen(false);
    } catch (error) {
      toast.error('Failed to switch player');
      console.error('Error switching player:', error);
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || !session.selectedAllyCode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-lg">Redirecting...</div>
      </div>
    );
  }

  const selectedPlayer = session.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  if (!selectedPlayer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-lg text-red-500">Error: Selected player not found</div>
      </div>
    );
  }

  const isOfficer = selectedPlayer.memberLevel >= 3 || selectedPlayer.isAdmin === true;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Left side: Hamburger + Title */}
            <div className="flex items-center gap-4 min-w-0">
              {/* Hamburger menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-400 hover:text-white"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold truncate">Grakchawwaa</h1>
                <p className="text-xs sm:text-sm text-gray-400 mt-1 hidden sm:block">
                  Guild Management Dashboard
                </p>
              </div>
            </div>

            {/* Right side: User controls */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Player Switcher Dropdown */}
              {session.players.length > 1 ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    disabled={switching}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded transition-colors text-sm"
                  >
                    <span className="text-xs sm:text-sm text-gray-400 hidden md:inline">Player:</span>
                    <span className="font-semibold text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">
                      {selectedPlayer.playerName}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-gray-700 rounded-lg shadow-lg border border-gray-600 z-50">
                      <div className="py-2">
                        {session.players.map((player) => (
                          <button
                            key={player.allyCode}
                            onClick={() => handleSwitchPlayer(player.allyCode)}
                            disabled={switching}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-600 disabled:opacity-50 transition-colors ${
                              player.allyCode === session.selectedAllyCode ? 'bg-gray-600' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold truncate">{player.playerName}</span>
                                  {player.isMain && (
                                    <span className="px-1.5 py-0.5 bg-indigo-600 text-xs font-semibold rounded flex-shrink-0">
                                      MAIN
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-400">{player.allyCode}</p>
                              </div>
                              {player.allyCode === session.selectedAllyCode && (
                                <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-right hidden sm:block">
                  <p className="text-xs sm:text-sm text-gray-400">Player</p>
                  <p className="font-semibold text-sm sm:text-base">{selectedPlayer.playerName}</p>
                </div>
              )}

              {/* Username - hidden on mobile */}
              <div className="text-right hidden md:block">
                <p className="text-xs sm:text-sm text-gray-400">Logged in as</p>
                <p className="font-semibold text-sm sm:text-base truncate max-w-[150px]">{session.discordUsername}</p>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Exit</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex">
        <Sidebar isOfficer={isOfficer} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Step 3: Move page directories under (authenticated) route group**

```bash
mv app/player app/(authenticated)/player
mv app/guild app/(authenticated)/guild
mv app/officer app/(authenticated)/officer
mv app/game-data app/(authenticated)/game-data
```

---

## Task 3: Create 403 Forbidden Page

**Files:**
- Create: `app/forbidden/page.tsx`

**Step 1: Create the 403 page**

Create `app/forbidden/page.tsx`:

```tsx
import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="text-6xl font-bold text-red-500">403</div>
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-gray-400">
          You need officer permissions to view this page.
        </p>
        <Link
          href="/player"
          className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
```

---

## Task 4: Add Officer Route Protection

**Files:**
- Create: `app/(authenticated)/officer/layout.tsx`

**Step 1: Create officer layout with permission check**

Create `app/(authenticated)/officer/layout.tsx`:

```tsx
'use client';

import { useAuth } from '../../../lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading } = useAuth();
  const router = useRouter();

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  const isOfficer = selectedPlayer?.memberLevel !== undefined &&
    (selectedPlayer.memberLevel >= 3 || selectedPlayer.isAdmin === true);

  useEffect(() => {
    if (!loading && session && selectedPlayer && !isOfficer) {
      router.push('/forbidden');
    }
  }, [loading, session, selectedPlayer, isOfficer, router]);

  if (loading) {
    return null;
  }

  if (!isOfficer) {
    return null;
  }

  return <>{children}</>;
}
```

---

## Task 5: Update All Internal Links

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/auth/select-player/page.tsx`
- Modify: All page files that contain Link or router.push

**Step 1: Update root page redirects**

In `app/page.tsx`, change:
- `router.push('/dashboard')` → `router.push('/player')`
- `router.push('/select-player')` → `router.push('/auth/select-player')`

**Step 2: Update select-player page**

In `app/auth/select-player/page.tsx`, change:
- `router.push('/dashboard')` → `router.push('/player')`
- Update import path: `'../../lib/auth-context'` → `'../../../lib/auth-context'`
- Update import path: `'../../lib/api'` → `'../../../lib/api'`

**Step 3: Search and replace all remaining /dashboard references**

Run this command to find all files with old paths:

```bash
grep -r "/dashboard" app/ --include="*.tsx" --include="*.ts"
```

Update each file found:
- `/dashboard` → `/player`
- `/dashboard/warnings` → `/player/warnings`
- `/dashboard/violations` → `/player/violations`
- `/dashboard/settings` → `/player/settings`
- `/dashboard/guild/members` → `/guild/members`
- `/dashboard/guild/squads` → `/guild/squads`
- `/dashboard/guild/fleets` → `/guild/fleets`
- `/dashboard/raids` → `/guild/raids`
- `/dashboard/guild/warnings` → `/officer/warnings`
- `/dashboard/guild/violations` → `/officer/violations`
- `/dashboard/guild/automations` → `/officer/automations`
- `/dashboard/guild/raid-config` → `/officer/raid-config`
- `/dashboard/guild/warning-types` → `/officer/warning-types`
- `/dashboard/game-data/characters` → `/game-data/characters`
- `/dashboard/game-data/ships` → `/game-data/ships`
- `/dashboard/game-data/journey-guides` → `/game-data/journey-guides`
- `/select-player` → `/auth/select-player`

---

## Task 6: Verify and Test

**Step 1: Start the development server**

```bash
docker compose up -d
docker compose logs -f web
```

**Step 2: Test each route manually**

1. Visit `/` - should show login page
2. Login with Discord
3. If multi-account, should redirect to `/auth/select-player`
4. After selecting, should redirect to `/player`
5. Navigate through sidebar - each link should work
6. As non-officer, try `/officer/warnings` - should redirect to `/forbidden`
7. Test collapsible sidebar sections

**Step 3: Verify no broken links**

```bash
grep -r "dashboard" app/ --include="*.tsx" --include="*.ts"
```

Should return no results.

---

## Task 7: Commit

**Step 1: Stage all changes**

```bash
git add app/ components/Sidebar.tsx
git status --short
```

**Step 2: Commit**

```bash
git commit -m "feat: restructure URLs to match bot command hierarchy

Migrated from /dashboard/* to:
- /player - personal dashboard, warnings, violations, settings
- /guild - members, squads, fleets, raids
- /officer - warnings, violations, automations, raid-config, warning-types
- /game-data - characters, ships, journey-guides
- /auth - select-player

Added:
- Collapsible sidebar navigation grouped by section
- 403 forbidden page for officer access control
- Officer layout with permission check

Closes: URL restructure design"
```
