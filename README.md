# Grakchawwaa Web - SWGOH Guild Management Dashboard

Web interface for the Grakchawwaa SWGOH guild management system.

## Overview

Next.js-based web application providing a dashboard for guild officers and members to manage and view:
- Guild member information
- Ticket violations and warnings
- Raid performance and configuration
- Automated task scheduling

## Technology Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Authentication:** Discord OAuth (via backend API)
- **UI Components:** Custom React components with Tailwind
- **Notifications:** Sonner toast library

## Features

### For All Members

- **Dashboard** - Overview of personal stats and guild information
- **Raids** - View current raid progress and leaderboard
- **Raid History** - Browse past raid results with pagination
- **Warnings** - View personal warning history
- **Ticket Violations** - Track ticket collection performance
- **Settings** - Configure Mhann API key for raid tracking

### For Officers (Member Level 3+)

- **Guild Members** - View and manage all guild members
- **Guild Warnings** - Issue warnings and view guild-wide warning history
- **Guild Violations** - View ticket violations across all members
- **Warning Types** - Create and manage custom warning categories
- **Raid Configuration** - Set minimum score targets for guild and individual players
  - Supports all three raid types: Krayt Dragon, Naboo, Order 66
  - Guild-wide minimum scores
  - Individual player targets
- **Automations** - Configure scheduled tasks and notifications
  - Raid collection with reminder hours
  - Ticket collection and reminders
  - Guild sync and anniversary notifications

## Project Structure

```
grakchawwaa-web/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx                    # Main dashboard
│   │   ├── settings/page.tsx           # User settings (API key)
│   │   ├── warnings/page.tsx           # Personal warnings
│   │   ├── violations/page.tsx         # Personal violations
│   │   ├── raids/
│   │   │   ├── page.tsx               # Current raid view
│   │   │   └── history/page.tsx       # Raid history
│   │   └── guild/
│   │       ├── members/page.tsx        # Guild roster
│   │       ├── warnings/page.tsx       # Guild warnings (officers)
│   │       ├── violations/page.tsx     # Guild violations (officers)
│   │       ├── warning-types/page.tsx  # Warning management (officers)
│   │       ├── raid-config/page.tsx    # Raid targets (officers)
│   │       └── automations/page.tsx    # Automation config (officers)
│   ├── auth/
│   │   └── callback/page.tsx           # Discord OAuth callback
│   └── page.tsx                         # Landing page
├── components/
│   ├── Header.tsx                       # Dashboard header with player selector
│   └── Sidebar.tsx                      # Navigation sidebar
├── lib/
│   ├── api.ts                          # Backend API client
│   └── auth-context.tsx                # Authentication context provider
└── public/                             # Static assets
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Running grakchawwaa-backend instance

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your backend URL
```

### Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

### Development

```bash
# Start development server
pnpm dev
```

Web interface runs on http://localhost:3001

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
6. Session maintained via cookies (credentials: 'include')

## API Integration

The web app communicates with grakchawwaa-backend via REST API:

```typescript
// Example: Fetch active raid
const raidData = await raidsApi.getActive(guildId);

// Example: Update player API key
await playersApi.update(allyCode, { mhannApiKey: 'key' });

// Example: Configure raid target
await raidsApi.updateGuildConfig(guildId, 'krayt', 500000000);
```

See [`lib/api.ts`](lib/api.ts) for complete API client.

## Raid Configuration

Officers can configure raid tracking for all three raid types:

1. Navigate to **Officer Tools > Raid Configuration**
2. Select raid type (Order 66, Naboo, or Krayt Dragon)
3. Set guild minimum score target
4. Set individual player targets (optional)
5. Configuration persists per raid type

The backend automatically:
- Collects raid data via Mhann API (requires player API key)
- Compares scores against configured targets
- Triggers Discord notifications via the bot

## Responsive Design

The application is fully responsive with mobile support:
- Hamburger menu for mobile navigation
- Responsive tables with horizontal scroll
- Adaptive layouts using Tailwind breakpoints (sm, md, lg)
- Mobile-optimized spacing and typography

## Related Projects

- **grakchawwaa-backend** - REST API backend
- **grakchawwaa-bot** - Discord bot for notifications

## License

MIT
