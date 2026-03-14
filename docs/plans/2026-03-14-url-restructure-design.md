# URL Restructure Design

## Overview

Restructure web app URLs to match the Discord bot command hierarchy for consistency. Replace the current `/dashboard/*` structure with `/player`, `/guild`, `/officer`, and `/game-data` top-level routes.

## Route Mapping

### New URL Structure

```
/                           → Redirect to /player (if logged in) or /auth/login

/auth/
  login                     → Discord OAuth entry
  callback                  → OAuth callback
  select-player             → Choose ally code (multi-account users)

/player/
  (index)                   → Player dashboard (current home)
  warnings                  → My warnings
  violations                → My violations
  settings                  → Account settings

/guild/
  (index)                   → Guild overview / members list
  members                   → Full members table
  squads                    → Squad templates
  squads/new
  squads/[squadId]/edit
  fleets                    → Fleet templates
  fleets/new
  fleets/[fleetId]/edit
  raids                     → Current raids
  raids/history             → Raid history

/officer/
  warnings                  → Manage all guild warnings
  violations                → Manage all guild violations
  automations               → Automation config
  raid-config               → Raid notification config
  warning-types             → Configure warning types

/game-data/
  characters                → Character list
  characters/[baseId]       → Character detail
  ships                     → Ship list
  ships/[baseId]            → Ship detail
  journey-guides            → Journey guide list
  journey-guides/[id]       → Journey guide detail
```

### Migration Map (Old → New)

| Old Path | New Path |
|----------|----------|
| `/dashboard` | `/player` |
| `/dashboard/warnings` | `/player/warnings` |
| `/dashboard/violations` | `/player/violations` |
| `/dashboard/settings` | `/player/settings` |
| `/dashboard/guild/members` | `/guild/members` |
| `/dashboard/guild/squads` | `/guild/squads` |
| `/dashboard/guild/squads/new` | `/guild/squads/new` |
| `/dashboard/guild/squads/[squadId]/edit` | `/guild/squads/[squadId]/edit` |
| `/dashboard/guild/fleets` | `/guild/fleets` |
| `/dashboard/guild/fleets/new` | `/guild/fleets/new` |
| `/dashboard/guild/fleets/[fleetId]/edit` | `/guild/fleets/[fleetId]/edit` |
| `/dashboard/raids` | `/guild/raids` |
| `/dashboard/raids/history` | `/guild/raids/history` |
| `/dashboard/guild/warnings` | `/officer/warnings` |
| `/dashboard/guild/violations` | `/officer/violations` |
| `/dashboard/guild/automations` | `/officer/automations` |
| `/dashboard/guild/raid-config` | `/officer/raid-config` |
| `/dashboard/guild/warning-types` | `/officer/warning-types` |
| `/dashboard/game-data/characters` | `/game-data/characters` |
| `/dashboard/game-data/characters/[baseId]` | `/game-data/characters/[baseId]` |
| `/dashboard/game-data/ships` | `/game-data/ships` |
| `/dashboard/game-data/ships/[baseId]` | `/game-data/ships/[baseId]` |
| `/dashboard/game-data/journey-guides` | `/game-data/journey-guides` |
| `/dashboard/game-data/journey-guides/[id]` | `/game-data/journey-guides/[id]` |
| `/select-player` | `/auth/select-player` |

## Navigation Sidebar

### Collapsible Structure

```
Player ▼
  Dashboard          → /player
  My Warnings        → /player/warnings
  My Violations      → /player/violations
  Settings           → /player/settings

Guild ▼
  Members            → /guild/members
  Squads             → /guild/squads
  Fleets             → /guild/fleets
  Raids              → /guild/raids

Officer ▼              (only visible to officers/admins/leaders)
  Warnings           → /officer/warnings
  Violations         → /officer/violations
  Automations        → /officer/automations
  Raid Config        → /officer/raid-config
  Warning Types      → /officer/warning-types

Game Data ▼
  Characters         → /game-data/characters
  Ships              → /game-data/ships
  Journey Guides     → /game-data/journey-guides
```

### Sidebar Behavior

- Sections start expanded for the current route's category
- Other sections collapsed by default
- Click section header to toggle expand/collapse
- Officer section hidden entirely for non-officers

## Access Control

### Route Protection Levels

| Route | Access Level |
|-------|--------------|
| `/auth/*` | Public (unauthenticated) |
| `/player/*` | Logged in user |
| `/guild/*` | Logged in user with active guild |
| `/officer/*` | Officer, admin, or leader role |
| `/game-data/*` | Logged in user |

### Error Handling

- **Not logged in → any protected route:** Redirect to `/auth/login`
- **Logged in but no guild → `/guild/*` or `/officer/*`:** Redirect to `/player` with message
- **Non-officer → `/officer/*`:** Show 403 error page

### 403 Page Design

- Simple centered layout
- "Access Denied" heading
- "You need officer permissions to view this page"
- "Go to Dashboard" button linking to `/player`

## Implementation Approach

**Strategy:** Big bang migration - move everything at once, update all links, delete old structure.

### Files to Change

1. Move page files to new directory structure under `app/`
2. Update sidebar component with collapsible sections
3. Update/create layout files for each section
4. Create 403 forbidden page
5. Update all internal links (Link hrefs, redirects)
6. Update middleware for route protection logic
7. Delete `/dashboard` directory
