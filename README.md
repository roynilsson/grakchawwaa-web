# Grakchawwaa Web - SWGOH Guild Management Dashboard

Web interface for the Grakchawwaa SWGOH guild management system.

## Overview

Next.js-based web application providing a dashboard for guild officers and members to manage:
- Guild member information and admin roles
- Ticket violations and warnings
- Raid performance and configuration
- Squad and fleet templates
- Automated task scheduling
- Game data browsing (characters, ships, journey guides)

## Technology Stack

- **Framework:** Next.js 15 (App Router)
- **React:** 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Authentication:** Discord OAuth (via backend API)
- **Notifications:** Sonner toast library
- **CSV Import:** PapaParse

## Features

### For All Members

| Feature | Description |
|---------|-------------|
| **Dashboard** | Overview of personal stats and guild information |
| **Raids** | View current raid progress and leaderboard |
| **Raid History** | Browse past raid results with pagination |
| **Warnings** | View personal warning history |
| **Violations** | Track ticket collection performance |
| **Settings** | Configure Mhann API key for raid tracking |

### For Officers (Member Level 3+ or Admin)

| Feature | Description |
|---------|-------------|
| **Guild Members** | View roster, grant/revoke admin status |
| **Guild Warnings** | Issue warnings, view guild-wide history, bulk CSV import |
| **Guild Violations** | View ticket violations across all members, bulk CSV import |
| **Warning Types** | Create and manage custom warning categories |
| **Raid Configuration** | Set minimum score targets (guild-wide and per-player) |
| **Automations** | Configure scheduled tasks and notifications |
| **Squads** | Create and manage squad templates |
| **Fleets** | Create and manage fleet templates |

### Game Data (All Users)

| Feature | Description |
|---------|-------------|
| **Characters** | Browse characters with filtering (alignment, role, faction, GL, zeta, omicron) |
| **Character Details** | View abilities, categories, requirements |
| **Ships** | Browse ships with filtering (alignment, role, faction, capital) |
| **Ship Details** | View abilities, categories, crew requirements |
| **Journey Guides** | View legendary character requirements and progression |

## Project Structure

```
grakchawwaa-web/
├── app/
│   ├── page.tsx                         # Landing page
│   ├── privacy-policy/page.tsx          # Privacy policy
│   ├── select-player/page.tsx           # Multi-account player selection
│   ├── auth/callback/page.tsx           # Discord OAuth callback
│   └── dashboard/
│       ├── page.tsx                     # Main dashboard
│       ├── settings/page.tsx            # User settings (API key)
│       ├── warnings/page.tsx            # Personal warnings
│       ├── violations/page.tsx          # Personal violations
│       ├── raids/
│       │   ├── page.tsx                 # Current raid view
│       │   └── history/page.tsx         # Raid history
│       ├── game-data/
│       │   ├── characters/
│       │   │   ├── page.tsx             # Character list
│       │   │   └── [baseId]/page.tsx    # Character detail
│       │   ├── ships/
│       │   │   ├── page.tsx             # Ship list
│       │   │   └── [baseId]/page.tsx    # Ship detail
│       │   └── journey-guides/
│       │       ├── page.tsx             # Journey guide list
│       │       └── [id]/page.tsx        # Journey guide detail
│       └── guild/
│           ├── members/page.tsx         # Guild roster (officers)
│           ├── warnings/page.tsx        # Guild warnings (officers)
│           ├── violations/page.tsx      # Guild violations (officers)
│           ├── warning-types/page.tsx   # Warning types (officers)
│           ├── raid-config/page.tsx     # Raid targets (officers)
│           ├── automations/page.tsx     # Automation config (officers)
│           ├── squads/
│           │   ├── page.tsx             # Squad list
│           │   ├── new/page.tsx         # Create squad
│           │   └── [squadId]/edit/page.tsx
│           └── fleets/
│               ├── page.tsx             # Fleet list
│               ├── new/page.tsx         # Create fleet
│               └── [fleetId]/edit/page.tsx
├── components/
│   ├── Header.tsx                       # Dashboard header with player selector
│   ├── Sidebar.tsx                      # Navigation sidebar
│   └── ImportCsvModal.tsx               # CSV import modal
├── lib/
│   ├── api.ts                           # Backend API client
│   └── auth-context.tsx                 # Authentication context provider
└── public/                              # Static assets
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker and Docker Compose
- Running grakchawwaa-backend instance

### Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

### Development (Docker - Recommended)

```bash
# Start web container
docker compose up -d

# View logs
docker compose logs -f web

# Restart after code changes
docker compose restart web
```

Web interface runs on http://localhost:3001

### Local Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Authentication Flow

1. User clicks "Login with Discord" on landing page
2. Redirected to backend's `/auth/discord` endpoint
3. Discord OAuth authorization
4. Callback to backend creates session
5. Redirected to web app dashboard
6. Session maintained via cookies (`credentials: 'include'`)

For multi-account users:
1. After login, redirected to player selection page
2. Choose which account to use for this session
3. Can switch accounts from the header dropdown

## API Integration

The web app communicates with grakchawwaa-backend via REST API:

```typescript
// Example: Fetch active raid
const raidData = await raidsApi.getActive(guildId);

// Example: Update player API key
await playersApi.update(allyCode, { mhannApiKey: 'key' });

// Example: Configure raid target
await raidsApi.updateGuildConfig(guildId, 'krayt', 500000000);

// Example: Create a squad
await squadsApi.create(guildId, {
  name: 'SLKR',
  description: 'Supreme Leader Kylo Ren team',
  isFleet: false,
  slots: [...]
});
```

See [`lib/api.ts`](lib/api.ts) for complete API client.

## Key Workflows

### Raid Configuration
1. Navigate to **Officer Tools > Raid Configuration**
2. Select raid type (Order 66, Naboo, or Krayt Dragon)
3. Set guild minimum score target
4. Set individual player targets (optional)
5. Configuration persists per raid type

### Automation Setup
1. Navigate to **Officer Tools > Automations**
2. Select automation type (ticket collection, raid collection, etc.)
3. Choose a pre-registered Discord channel
4. Configure timing (offsets, reminder hours)
5. Enable the automation

### Squad/Fleet Builder
1. Navigate to **Officer Tools > Squads** or **Fleets**
2. Click "New Squad" or "New Fleet"
3. Configure slots (specific character, category requirement, or pool)
4. Add requirement badges (relic level, gear, rarity)
5. Set zeta/omicron requirements
6. Add tags for organization

## Responsive Design

The application is fully responsive with mobile support:
- Hamburger menu for mobile navigation
- Slide-out sidebar on mobile
- Responsive tables with horizontal scroll
- Adaptive layouts using Tailwind breakpoints (sm, md, lg)
- Mobile-optimized spacing and typography

## Related Projects

- **grakchawwaa-backend** - REST API backend
- **grakchawwaa-bot** - Discord bot for notifications
- **grakchawwaa-comlink** - SWGOH game data proxy

## License

MIT
