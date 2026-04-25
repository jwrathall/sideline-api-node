# Sideline API

## Overview
Multi-tenant sports tournament and league scheduling platform. Built to handle volleyball leagues, tournaments, speed skating meets, and other community sports events.

## Stack
- Node.js / Express
- MongoDB Atlas (direct driver, no Mongoose)
- Passport.js (local strategy, session based auth)
- bcrypt (password hashing)
- dotenv (environment variables)

## Key Architectural Decisions

### No Mongoose
Using the MongoDB driver directly — intentional. Less magic, more control, better for learning the driver patterns.

### Session Auth vs JWT
Passport.js sessions over JWT. Simpler for a server-rendered/SPA hybrid, no token refresh complexity.

### Multi-tenancy
Every collection has `tenantId`. The `tenantMiddleware` reads `x-tenant-id` from request headers, converts to ObjectId, attaches to `req.tenantId`. Every protected query filters by `req.tenantId`.

### Role Hierarchy
- `tenant_admin` — global, manages all tenants (you)
- `admin` — tenant scoped, creates events, manages scheduleOld
- `editor` — captain equivalent, enters scores, manages roster
- `user` — read only, views scheduleOld and standings

### Permissions
Permission documents exist in Atlas on Role collection but are shelved for v2. Role hierarchy handles access control for now via `getEffectiveRole`.

## Middleware Order
isAuthenticated → tenantMiddleware → route handler

## Routes
- `/user`   → routes/user.js   — full CRUD, tenant scoped, + /current session endpoint
- `/team`   → routes/team.js   — full CRUD, tenant scoped, GET "/" requires `eventId` query param, PATCH `/:id/reset` clears roster members without affecting captain
- `/event`  → routes/event.js  — full CRUD, tenant scoped
- `/tenant` → routes/tenant.js — lookup only, no auth guard yet

## Folder Structure
src/
routes/       — Express route handlers (thin, no business logic)
middleware/   — tenant.js, auth guards
db/           — MongoDB connection
auth.js       — Passport strategy, serialize/deserialize
server.js     — Express app setup

## Collections
Tenant          — top level customer/organization
Event           — league session or tournament
Phase           — competition structure (pool play, playoffs, consolation)
Division        — grouping within a phase (Pool A, Senior Women etc)
Slot            — time block (6:30-6:50pm, all courts)
GameSlot        — specific court+time assignment within a slot
Game            — the actual match, atomic, owns result
Standings       — snapshot after each phase for seeding
Submissions     — versioned score entries, audit trail
Facility        — physical building (Milton Sports Centre)
Venue           — specific space within facility (Gym 1, Rink 2)
Team            — group of players for a specific event
User            — player, captain, admin or tenant_admin; all queries scoped by tenantId
Role            — role definition with permissions array

## Data Hierarchy
Tenant
└── Event
└── Phase
└── Division
└── Slot
└── GameSlot ←── Game
└── Facility
└── Venue
└── Team
└── User

## Known TODOs
- `server.js /register` — `tenantId` is hardcoded, needs to be dynamic
- `/tenant` route — no auth guard, should add `isAuthenticated` before shipping
- `auth()` is called twice in server.js (lines 37 and 47) — one call should be removed

## Environment Variables
ATLAS_URI=mongodb+srv://...
PORT=5050
SESSION_SECRET=...

## Scheduling Concepts
- `Slot` — time container, owns `gameDuration` and `transitionTime`
- `GameSlot` — physical assignment, court + specific time
- `Game` — match result, references `gameSlotId` for location/time
- Rescheduling = update `gameSlotId` on Game, GameSlot stays intact
- Override = `isOverride: true` on Game with `overrideReason`
- Bubble updates (cascade rescheduling) — shelved for v2, `bubbleUpdated` field in place

## Notifications (v1)
- node-cron scheduled job (not yet built)
- SendGrid or Resend for email
- 30 min reminder before game via `event.notifications.reminderMinutesBefore`
- Magic link / email lookup for casual users — no forced signup

## Planned Refactor — Data Access Layer

Current state: routes query MongoDB directly
Target state: repository pattern separating data access from business logic

Structure:
src/
repositories/
team.js       — all Team queries
event.js      — all Event queries
game.js       — all Game queries
slot.js       — all Slot queries
user.js       — all User queries
services/
scheduleGenerator.js  — algorithm, calls repositories
routes/
event.js      — HTTP only, calls services/repositories

Priority: after schedule algorithm is working

## Core Design Principle
Reliability over features. The target user has been burned by janky
sports software before. Every feature must work correctly under
pressure — during a live tournament with stressed volunteers.

- Always confirm before destructive actions
- Every score entry is versioned
- Schedule generation is deterministic and testable
- Graceful error handling everywhere — never a blank screen