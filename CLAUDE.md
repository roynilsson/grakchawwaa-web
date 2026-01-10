# Grakchawwaa Web - Web UI for SWGOH Guild Management

## Overview

**grakchawwaa-web** is a web interface for the Grakchawwaa system, providing a browser-based UI for Star Wars: Galaxy of Heroes (SWGOH) guild management. It complements the Discord bot by offering a more visual, accessible interface for viewing guild data, player statistics, and violation reports.

**Repository:** `git@github.com:roynilsson/grakchawwaa-web`
**License:** MIT License (Copyright 2025 Hannes)
**Status:** Initial setup, under construction
**Deployment:** GitHub Pages

## Technology Stack

### Core Technologies
- **Framework:** Next.js 16.0.3 (App Router)
- **UI Library:** React 19.2.0
- **Language:** TypeScript 5
- **Runtime:** Node.js 20
- **Package Manager:** pnpm 8

### Styling
- **CSS Framework:** Tailwind CSS v4 (latest major version)
- **PostCSS:** CSS transformation tool with Tailwind plugin
- **Custom Colors:** Light blue (#7ac8ef) and dark blue (#102739) theme

### Development Tools
- **Linting:** ESLint 9 with Next.js configuration
- **Build Target:** Static export for GitHub Pages
- **CI/CD:** GitHub Actions

## Project Structure

```
grakchawwaa-web/
├── app/                          # Next.js App Router
│   ├── privacy-policy/           # Privacy policy route
│   │   └── page.tsx             # Privacy policy page
│   ├── globals.css              # Global CSS with Tailwind
│   ├── layout.tsx               # Root layout component
│   └── page.tsx                 # Home page
├── public/                       # Static assets
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Pages deployment
├── eslint.config.mjs            # ESLint configuration
├── next.config.ts               # Next.js configuration
├── package.json                 # Dependencies
├── postcss.config.mjs          # PostCSS configuration
├── tsconfig.json               # TypeScript configuration
└── LICENSE                     # MIT License
```

## Key Configuration Files

### [next.config.ts](next.config.ts)
Configured for static site generation and GitHub Pages deployment:
- `output: "export"` - Static HTML export
- `basePath: "/grakchawwaa-web"` - GitHub Pages subpath (production only)
- `assetPrefix: "/grakchawwaa-web"` - Asset URL prefix (production only)
- Image optimization disabled (required for static export)

### [tsconfig.json](tsconfig.json)
TypeScript compiler configuration:
- Target: ES2017 for broad browser compatibility
- Strict mode enabled
- Path alias: `@/*` maps to root directory
- Next.js plugin integration

### [app/globals.css](app/globals.css)
Global styles with custom theme:
```css
@import "tailwindcss";

/* Light mode: #7ac8ef (light blue) */
/* Dark mode: #102739 (dark blue) */
```

## Current Pages

### Home Page - [app/page.tsx](app/page.tsx)
Currently displays "Under construction" message. Will become the main dashboard showing:
- Guild roster overview
- Recent ticket violations
- Warning summaries
- Player statistics

### Privacy Policy - [app/privacy-policy/page.tsx](app/privacy-policy/page.tsx)
Placeholder page for privacy policy. Will contain:
- Data collection practices
- Cookie usage
- Third-party integrations (Discord, SWGOH API)

## Development Workflow

### Local Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
# Access at http://localhost:3000

# Build for production
pnpm build

# Lint code
pnpm lint
```

### Production Deployment

**Platform:** GitHub Pages
**URL:** `https://roynilsson.github.io/grakchawwaa-web/`
**Workflow:** [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

**Deployment triggers:**
- Push to `main` branch
- Manual workflow dispatch

**Build process:**
1. Checkout code
2. Setup Node.js 20 with pnpm 8
3. Install dependencies (`pnpm install`)
4. Build static site (`pnpm build`)
5. Upload to GitHub Pages
6. Deploy to production

## Future Features (Planned)

### Dashboard
- Guild overview with member count and statistics
- Recent activity feed
- Quick links to reports and violation summaries

### Player Management
- Player roster with search and filtering
- Individual player profiles
- Registration and ally code management
- Discord account linking

### Violation Reports
- Weekly and monthly ticket violation summaries
- Sortable and filterable violation tables
- Export functionality (CSV, PDF)
- Historical violation trends and charts

### Warning System
- View and issue warnings (officer/leader only)
- Warning type management
- Warning history per player
- Severity-based filtering and sorting

### Guild Configuration
- Channel configuration for Discord notifications
- Ticket monitoring schedule settings
- Anniversary notification settings
- User role and permission management

### Authentication
- Discord OAuth2 integration
- Session management
- Role-based access control
- Secure API communication with backend

## Integration Points

### Backend API
Will consume REST API from **grakchawwaa-backend** (PHP/Symfony):
- Player data and registration
- Guild member rosters
- Ticket violations and reports
- Warning types and warnings
- Permission checks

### Discord OAuth2
For user authentication and role verification:
- Login via Discord account
- Fetch user's guild roles
- Permission mapping (Member/Officer/Leader)

### SWGOH Comlink API
Via backend proxy to:
- Fetch real-time player data
- Sync guild rosters
- Validate ally codes

## Design System

### Color Palette
- **Primary (Light):** `#7ac8ef` (Light blue)
- **Primary (Dark):** `#102739` (Dark blue)
- **Background (Light):** White
- **Background (Dark):** Dark theme (via `prefers-color-scheme`)

### Component Library (To Be Decided)
Options include:
- shadcn/ui (Radix UI + Tailwind)
- Headless UI
- Custom components

### Typography & Layout
- Tailwind CSS utility classes
- Responsive design (mobile-first)
- Accessibility compliance (WCAG 2.1 AA)

## Dependencies

### Production
- `next: 16.0.3` - Framework
- `react: 19.2.0` - UI library
- `react-dom: 19.2.0` - React renderer

### Development
- `@tailwindcss/postcss: ^4` - Tailwind CSS processor
- `@types/node: ^20` - Node.js type definitions
- `@types/react: ^19` - React type definitions
- `@types/react-dom: ^19` - React DOM type definitions
- `eslint: ^9` - Code linting
- `eslint-config-next: 16.0.3` - Next.js ESLint rules
- `tailwindcss: ^4` - CSS framework
- `typescript: ^5` - TypeScript compiler

## Development Status

**Current State:** Very early stage (3 commits)
- Initial Next.js project setup ✅
- GitHub Pages deployment configured ✅
- Basic routing structure ✅
- Tailwind CSS theme configured ✅

**Next Steps:**
1. Design system and component library setup
2. Backend API integration
3. Discord OAuth2 authentication
4. Dashboard and player roster UI
5. Violation reporting interface
6. Warning system UI

## Related Projects

- **grakchawwaa-bot** - Discord bot interface (TypeScript/Node.js, production-ready)
- **grakchawwaa-backend** - REST API backend (PHP/Symfony, planned)
- **ARCHITECTURE.md** - Complete system architecture specification

## Branch Strategy

- **main** - Production branch (deployed to GitHub Pages)
- **develop** - Development branch (current working branch)

## License

MIT License (Copyright 2025 Hannes)
