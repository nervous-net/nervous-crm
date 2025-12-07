# nervous-crm Design Document

## Overview

Sales/business CRM for small teams with a clear path to enterprise scale. Web app with API-first architecture, built on Node.js/TypeScript.

## Goals

- **First milestone:** Internal use - team can run real sales workflows day-to-day
- **Second milestone:** Beta launch - ready for early external users
- **Third milestone:** Production-ready - full polish, ready for real customers

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Fastify, TypeScript |
| Database | PostgreSQL (Fly Postgres) |
| ORM | Prisma |
| Validation | Zod |
| Auth | Manual sessions (JWT + Argon2) |
| Frontend | React 18, Vite |
| Routing | React Router |
| State | TanStack Query |
| Forms | React Hook Form + Zod |
| UI | shadcn/ui + Tailwind CSS |
| Deployment | Fly.io |

## Architecture

Modular monolith - single Fastify backend with well-separated modules, React SPA frontend. Deploys as one unit to Fly.io.

### Project Structure

```
nervous-crm/
├── src/
│   ├── api/              # Fastify routes & handlers
│   │   ├── contacts/
│   │   ├── companies/
│   │   ├── deals/
│   │   ├── activities/
│   │   └── auth/
│   ├── services/         # Business logic layer
│   ├── db/               # Database schema, migrations, queries
│   ├── shared/           # Shared types, utils, validation schemas
│   └── server.ts         # Fastify app entry point
├── web/                  # React SPA (Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── api/          # API client
│   │   └── main.tsx
│   └── index.html
├── package.json          # Monorepo root (npm workspaces)
└── fly.toml
```

## Data Models

```
┌─────────────┐       ┌─────────────┐
│   Company   │───────│   Contact   │
└─────────────┘  1:N  └─────────────┘
       │                     │
       │ N:N                 │ N:1
       ▼                     ▼
┌─────────────┐       ┌─────────────┐
│    Deal     │───────│  Activity   │
└─────────────┘  1:N  └─────────────┘
```

### Entities

| Entity | Key Fields |
|--------|------------|
| User | id, email, name, role, team_id |
| Team | id, name, settings |
| Company | id, name, domain, industry, team_id |
| Contact | id, name, email, phone, company_id, owner_id |
| Deal | id, title, value, stage, probability, company_id, contact_id, owner_id |
| Activity | id, type (call/email/meeting/task), due_at, completed_at, deal_id, contact_id, user_id |

### Relationships

- Contacts belong to Companies (optional)
- Deals link to Company and/or Contact
- Activities link to Deals, Contacts, or both
- Everything scoped to Team for multi-tenancy
- Owner (User) assigned to Contacts and Deals

## API Design

RESTful API at `/api/v1/` with flat routes and query filters.

| Resource | Endpoints |
|----------|-----------|
| **Auth** | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh` |
| **Users** | `GET /users/me`, `PUT /users/me` |
| **Teams** | `GET /teams/me`, `PUT /teams/me`, `POST /teams/invite`, `GET /teams/members` |
| **Companies** | `GET /companies`, `POST /companies`, `GET /companies/:id`, `PUT /companies/:id`, `DELETE /companies/:id` |
| **Contacts** | `GET /contacts`, `POST /contacts`, `GET /contacts/:id`, `PUT /contacts/:id`, `DELETE /contacts/:id` |
| **Deals** | `GET /deals`, `POST /deals`, `GET /deals/:id`, `PUT /deals/:id`, `DELETE /deals/:id` |
| **Activities** | `GET /activities`, `POST /activities`, `GET /activities/:id`, `PUT /activities/:id`, `DELETE /activities/:id` |

### Conventions

- **Filtering:** `?stage=negotiation&ownerId=123`
- **Sorting:** `?sort=-createdAt` (prefix `-` for descending)
- **Pagination:** `?limit=50&cursor=abc123` (cursor-based)
- **Includes:** `?include=company,activities`
- **Auth:** JWT in httpOnly cookies

## Authentication

### Email/Password (MVP)
1. User registers with email + password
2. Password hashed with Argon2 (via `@node-rs/argon2`)
3. Session created in PostgreSQL, JWT issued
4. Access token (15 min) + refresh token (7 days) stored in httpOnly cookies
5. Refresh token rotated on each use

### OAuth (v2 - Post-MVP)
Google OAuth will be added in v2.

### Session Storage
```
Session: id, userId, refreshToken, expiresAt, createdAt
```

### Team Creation
- When a user registers, they automatically get a new team as owner
- Other users join via email invite

### Roles & Permissions

```
owner  → full access, manage billing, delete team
admin  → manage users, invite/remove members, all CRUD
member → CRUD own records, view team records
viewer → read-only access
```

### Ownership Rules
- Contacts/Deals have `ownerId` (assigned user)
- Members can edit their own records, view others
- Admins/Owners can edit any record

All queries automatically scoped to user's team.

## Deployment

### Fly.io Setup

```
nervous-crm (Fly App)
├── web machine(s)     # Fastify serves API + static React build
└── Fly Postgres       # Managed PostgreSQL cluster
```

Single deployment: Vite builds React, Fastify serves static files + API.

### Scaling Path
1. Start: 1 shared-cpu machine
2. Beta: 2+ machines with load balancing
3. Production: Add regions as needed

## MVP Scope (Internal Use)

### In Scope
- **Auth:** Email/password only, JWT sessions, Argon2 hashing
- **Teams:** Auto-created on register, invite by email, roles (owner/admin/member/viewer)
- **Companies:** Full CRUD, list with search/filter
- **Contacts:** Full CRUD, optional company link, owner assignment
- **Deals:** Full CRUD, pipeline board + list view with toggle, stages (lead → qualified → proposal → negotiation → won/lost)
- **Activities:** Full CRUD, types (call/email/meeting/task), link to contact/deal, due dates, mark complete
- **Dashboard:** Open deals summary, upcoming activities, recent contacts
- **Settings:** User profile, team members list, invite users

### Frontend Pages
| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Email/password form |
| Register | `/register` | Create account + team |
| Dashboard | `/` | Overview: open deals, upcoming activities, recent contacts |
| Contacts | `/contacts` | List view with search/filter |
| Contact Detail | `/contacts/:id` | Contact info, linked activities, deals |
| Companies | `/companies` | List view with search/filter |
| Company Detail | `/companies/:id` | Company info, linked contacts, deals |
| Deals | `/deals` | Pipeline board (Kanban) + list view toggle |
| Deal Detail | `/deals/:id` | Deal info, linked activities, contact/company |
| Activities | `/activities` | List view, filter by type/status/due date |
| Settings | `/settings` | User profile, team members, invite |

### Out of Scope (Post-MVP)
- OAuth (Google/GitHub) - v2 feature
- Calendar sync (Google Calendar)
- Email integration
- Custom fields
- Automation/workflows
- Reporting/analytics
- Import/export
- Audit logs
- SSO/SAML
