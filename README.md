# TitleBridge Platform

Secure electronic vehicle titling and vehicle records management platform.

## Overview

TitleBridge provides customer-facing and staff portals for:

- Electronic vehicle titles and ownership records
- Case workflows (transfers, liens, service requests)
- Documents and notifications
- Staff tools: customers, vehicles, cases, integrations, state configuration, audit logs

## Tech stack

- **React 19** + **TypeScript**
- **Vite** for build tooling
- **React Router 7** for client-side routing
- Separate customer authentication and staff role authorization

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and production build |
| `npm run type-check` | Run TypeScript without emit |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## Route structure

### Public

| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/login` | Customer / general sign-in |
| `/register` | Customer registration |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

### Customer (authenticated)

Requires any authenticated user. Unauthenticated users redirect to `/login`.

| Path | Description |
|------|-------------|
| `/dashboard` | Customer dashboard |
| `/dashboard/vehicles` | Vehicle list |
| `/dashboard/vehicles/:vin` | Vehicle details |
| `/dashboard/cases` | Case list |
| `/dashboard/cases/:caseId` | Case details |
| `/dashboard/documents` | Documents |
| `/dashboard/notifications` | Notifications |
| `/dashboard/profile` | Profile |
| `/dashboard/security` | Security settings |

### Staff (role-protected)

Requires `staff` or `admin` role. Authenticated **customers cannot access** these routes by navigating to `/staff`; they are redirected to `/dashboard`.

| Path | Description |
|------|-------------|
| `/staff` | Staff dashboard |
| `/staff/customers` | Customer management |
| `/staff/vehicles` | Platform vehicles |
| `/staff/cases` | Case queues |
| `/staff/integrations` | Integrations |
| `/staff/states` | State configuration |
| `/staff/audit` | Audit logs |
| `/staff/settings` | Settings |

## Authentication model

- **Customer authentication** and **staff authorization** are separate.
- `ProtectedRoute` allows any authenticated user into `/dashboard/*`.
- `StaffRoute` additionally checks for `staff` or `admin` role. A normal customer session never grants staff access.
- Auth state is provided via `AuthProvider` / `useAuth`. Service layer lives in `src/services/authService.ts` (mock users for local development).

### Demo accounts

| Email | Password | Role |
|-------|----------|------|
| customer@example.com | password | customer |
| staff@example.com | password | staff |
| admin@example.com | password | admin |

## Project structure

```
src/
  components/
    auth/          # ProtectedRoute, StaffRoute
    common/        # PageHeader, Card, EmptyState
    layout/        # Navbar
  hooks/           # useAuth
  layouts/         # PublicLayout, CustomerLayout, StaffLayout
  pages/
    public/        # Home, Login, Register, Privacy, Terms
    customer/      # Dashboard, Vehicles, Cases, Documents, …
    staff/         # Staff dashboard and admin pages
  routes/          # App route configuration
  services/        # Auth and API placeholders
  styles/          # Global CSS
  types/           # Shared TypeScript types
```

## Security notes

- Staff routes are enforced in the client for UX; production APIs must enforce the same role checks server-side.
- Replace mock auth in `authService.ts` with real identity providers and secure session handling before production use.

## License

Proprietary — TitleBridge.
