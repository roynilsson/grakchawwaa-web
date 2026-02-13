# CLAUDE.md - grakchawwaa-web

Web UI for SWGOH guild management. Built with Next.js 16 + React 19 + Tailwind CSS.

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
├── layout.tsx              # Root layout
├── page.tsx                # Landing page
├── privacy-policy/         # Privacy policy page
├── select-player/          # Player selection
└── dashboard/
    ├── layout.tsx          # Dashboard layout
    ├── page.tsx            # Dashboard home
    ├── warnings/           # Player warnings view
    ├── violations/         # Player violations view
    └── guild/              # Guild management
        ├── warnings/       # Guild warnings
        ├── violations/     # Guild violations
        ├── warning-types/  # Warning type config
        └── automations/    # Automation settings
```

## Key Technologies

- **Next.js 16** - App Router
- **React 19** - Latest React features
- **Tailwind CSS 4** - Styling
- **Sonner** - Toast notifications

## Environment Variables

- `NEXT_PUBLIC_BACKEND_URL` - Backend API URL (defaults to `http://localhost:3000`)

## Adding Features

### New Page
1. Create directory under `app/`
2. Add `page.tsx` with default export
3. Use existing layouts or create new `layout.tsx`

### API Integration
Use fetch to call backend API at `NEXT_PUBLIC_BACKEND_URL`.

## Reference

- Backend API runs on port 3000
- Web runs on port 3001
