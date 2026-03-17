# CLAUDE.md - grakchawwaa-web

Web UI for SWGOH guild management. Built with Next.js 15 + React 19 + Tailwind CSS 4.

## Quick Reference

```bash
# Development (all commands run inside Docker)
docker compose up -d              # Start web container
docker compose logs -f web        # View logs
docker compose restart web        # Restart after code changes
docker compose exec web pnpm lint # Run linting
```

**Prerequisite:** The backend should be running for API functionality (`cd ../grakchawwaa-backend && docker compose up -d`).

**Access:** http://localhost:3001

## Project Structure

```
app/
├── layout.tsx                    # Root layout
├── page.tsx                      # Landing page
├── privacy-policy/               # Privacy policy page
├── auth/callback/                # Discord OAuth callback
└── (authenticated)/
    ├── layout.tsx                # Dashboard layout with sidebar
    ├── player/                   # Player pages (dashboard, settings, warnings, leaves)
    ├── officer/                  # Officer pages (warnings, violations, leaves, config)
    ├── guild/                    # Guild pages (members, raids, squads, fleets)
    └── game-data/                # Game data pages (characters, ships, journey guides)

components/
├── Header.tsx                    # Dashboard header with player selector
├── Sidebar.tsx                   # Navigation sidebar
├── ImportCsvModal.tsx            # CSV import modal
└── IssueWarningModal.tsx         # Warning issuance modal

lib/
├── api.ts                        # Backend API client
└── auth-context.tsx              # Authentication context provider
```

## Key Technologies

- **Next.js 15** - App Router
- **React 19** - Latest React features
- **Tailwind CSS 4** - Styling
- **Sonner** - Toast notifications
- **PapaParse** - CSV parsing

## Key Patterns

### API Client
All backend calls go through `lib/api.ts`:
```typescript
// Authenticated requests include credentials
const response = await fetch(`${API_URL}/api/guilds/${guildId}/warnings`, {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
});
```

### Auth Context
User session available via `useAuth()`:
```typescript
const { player, isOfficer, isAdmin, guildId } = useAuth();
```

### Officer Access Control
Officer pages check permissions in layout:
```typescript
if (!isOfficer && !isAdmin) {
  redirect('/forbidden');
}
```

## Environment Variables

- `NEXT_PUBLIC_BACKEND_URL` - Backend API URL (defaults to `http://localhost:3000`)

## Adding Features

### New Page
1. Create directory under `app/(authenticated)/`
2. Add `page.tsx` with default export
3. Add to `Sidebar.tsx` navigation if needed

### API Integration
1. Add types and methods to `lib/api.ts`
2. Use `credentials: 'include'` for authenticated requests
3. Handle errors with try/catch and toast notifications

### New Component
1. Create in `components/`
2. Use Tailwind for styling
3. Make responsive with `sm:`, `md:`, `lg:` breakpoints

## Reference

- Backend API runs on port 3000
- Web runs on port 3001
- Auth via Discord OAuth through backend
