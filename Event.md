# Event Flow

## Overview
An Event is the top-level container for all activity in Sideline — league nights,
tournaments, reverse pairs events etc. Everything hangs off an Event: teams,
phases, divisions, slots, games, standings, and submissions.

## Event Lifecycle
draft → active → complete
- `draft` — event created, not yet visible to players
- `active` — published, players can see schedule
- `complete` — event finished, scores locked, standings final

## Subsystems

### 1. Setup (admin only, one-time per tenant)
Before events can be created the following must exist:

**Facility**
- Physical building (Haber Center, Milton Sports Centre)
- Has address, GeoJSON coordinates for maps link
- Contains one or more Venues

**Venue**
- Specific space within a facility (Gym 1, Gym 2, Rink A)
- Has type: gym | court | rink | lane
- Has amenities: dressingRooms, scoreboard, seating
- Referenced by GameSlot during scheduling

**Status:** Facility and Venue collections exist in Atlas.
API routes and UI not yet built — hardcoded to Haber Center in Event Create form.
See ARCHITECTURE.md Pending Features.

---

### 2. Event CRUD
**Status:** ✅ Built

**Routes:**
- `GET /event` — all events for current tenant
- `GET /event/:id` — single event
- `POST /event` — create event

**UI:**
- `/admin/events` — event list page ✅
- `/admin/events/create` — create form ✅
- `/admin/events/:id` — event detail page (not yet built)
- `/admin/events/:id/edit` — edit form (not yet built)

**Default values on create:**
- `status: draft`
- `visibility: all false`
- `notifications: emailEnabled, reminderMinutesBefore: 30`
- `schedule: gameDuration: 20, transitionTime: 5`

---

### 3. Team Management
**Status:** ✅ Built

**Concept:**
- Teams belong to a specific Event (not the tenant globally)
- Teams change every session — new event = new teams
- Players come from the tenant roster
- TD drafts players into teams from the roster
- CSV import available for bulk player import

**Collections involved:**
- `Team` — eventId, captainId, members[]
- `User` — tenantIds[], role[]

**UI needed:**
- Event detail page → Teams tab
- Add team form
- Assign players to team (from roster)
- Set captain

**API routes:**
- `GET /team?eventId=` — teams for an event ✅
- `POST /team` — create team ✅
- `PATCH /team/:id` — update team/roster ✅
- `DELETE /team/:id` — remove team ✅

---

### 3b. Draft System
**Status:** Not yet built

**Concept:**
The Draft is a first class entity that sits between Event and Teams.
TD hosts a Zoom call, shares their screen, and drags players into teams
in real time. Players are NOT shown the draft board — admin only.

**Lifecycle:**
Event created → Draft created → Draft open → Players assigned → Draft complete → Teams created

**Draft document:**
```json
{
  "tenantId": ObjectId,
  "eventId": ObjectId,
  "status": "pending | open | complete",
  "order": "snake | linear",
  "draftedAt": Date,
  "availablePlayers": [userId],
  "teams": [
    { "teamId": ObjectId, "name": "Team 1", "picks": [userId] }
  ]
}
```

**API routes needed:**
- `POST /draft` — create draft for event
- `GET /draft/:eventId` — get draft state
- `PATCH /draft/:id/assign` — assign player to team
- `PATCH /draft/:id/move` — move player between teams
- `PATCH /draft/:id/complete` — finalize, creates Team documents

**UI:**
- Left panel — roster of unassigned players
- Right panel — N columns, one per team
- Drag player from left into team column
- Undo/move between teams supported
- Complete Draft button — creates Team and member documents
- Admin only — never public

**CSV/Excel import:**
- Alternative to manual draft
- Format: `name, email, phone, isCaptain`
- Bulk creates User documents and assigns to tenant roster
- TD can then use draft board to assign to teams

**Notes:**
- Snake draft order supported (TD configures)
- Works great for TD sharing screen on Zoom call
- Players find out their team via email notification after draft completes
  Also add Draft to your Atlas collections in Compass:
  json{
  "tenantId": { "$oid": "67735f0807555099312d6335" },
  "eventId": { "$oid": "6747dcd3da4a82f1754d3dc2" },
  "status": "pending",
  "order": "snake",
  "draftedAt": null,
  "availablePlayers": [],
  "teams": []
  }

### 4. Phase & Division Management
**Status:** Not yet built

**Concept:**
- League nights → single phase, no divisions
- Tournaments → multiple phases (Pool Play, Playoffs, Consolation)
- Each phase can have divisions (Elite Pool A, Advanced Pool B)
- Division displayName is sport-agnostic (TD sets it)

**Collections involved:**
- `Phase` — eventId, type, order, status
- `Division` — eventId, phaseId, displayName, teamIds[]

**UI needed:**
- Event detail page → Phases tab (tournaments only)
- Add phase form
- Add division form
- Assign teams to divisions

**API routes needed:**
- `GET /phase?eventId=`
- `POST /phase`
- `GET /division?eventId=`
- `POST /division`

---

### 5. Schedule Configuration
**Status:** Not yet built

**Concept:**
- TD configures the schedule settings before generating
- Settings live on Event.schedule object
- Different for league vs tournament

**League settings:**
```json
{
  "recurring": true,
  "dayOfWeek": "sunday",
  "startTime": "18:30",
  "endTime": "21:00",
  "frequency": "weekly",
  "gameDuration": 20,
  "transitionTime": 5
}
```

**Tournament settings:**
```json
{
  "recurring": false,
  "startTime": "08:00",
  "endTime": "18:00",
  "gameDuration": 20,
  "transitionTime": 10
}
```

**UI needed:**
- Event detail page → Schedule tab
- Schedule settings form
- Court selection (which venues are active for this event)

---

### 6. Schedule Generation
**Status:** Not yet built — this is the core algorithm

**Concept:**
The scheduling engine takes:
- Teams (N teams)
- Venues (courts available)
- Slots (time blocks)
- Game duration + transition time
- Phase/division structure

And produces:
- Slot documents (time blocks)
- GameSlot documents (court + time assignments)
- Game documents (team matchups)

**Algorithm types:**
- `generateLeagueSchedule` — round robin, all teams play each other
- `generateTournamentSchedule` — pool play then brackets
- `generateReversePairsSchedule` — special format, pairs rotate partners

**Key constraints:**
- No team plays twice in the same slot
- Minimum rest between games per team
- Balanced court distribution
- Timed games — hard stop, no spillover (v1)
- Bubble/ripple updates — shelved for v2

**Collections produced:**
- `Slot` — time container, owns gameDuration
- `GameSlot` — specific court + time assignment
- `Game` — team matchup, references gameSlotId

**API route needed:**
- `POST /event/:id/generate` — triggers algorithm, creates Slot/GameSlot/Game documents

**Scheduling Constraints:**

Rest/sit constraints (enforced by algorithm):
- Maximum consecutive sits: 1 (no team sits out twice in a row)
- Maximum wait between games: configurable per event, default 2 slots
- Minimum rest between games: 1 slot (can't play back to back)
- Balanced distribution: each team plays roughly equal number of games
- Sit tracking: teams that have sat out get priority for next slot

**The sit problem:**
Without constraints a naive round robin can produce:
- Team A plays rounds 1,2,3 then sits rounds 4,5,6
- Team B sits rounds 1,2 then plays rounds 3,4,5,6

Target distribution for 9 teams, 4 courts, 7 slots:
- Each team plays ~6 games
- Each team sits ~1 time
- No team sits more than 2 consecutive slots
- Sit-outs distributed across different slots per team

**Sit tracker:**
```javascript
// tracks consecutive sits and total sits per team
const sitTracker = {
  teamId: {
    consecutiveSits: 0,
    totalSits: 0,
    lastPlayedSlot: null
  }
}
```

**Priority queue for sit-outs:**
Teams are prioritized for play based on:
1. Consecutive sits (highest priority — never sit twice in a row)
2. Total sits (teams with more sit-outs get priority)
3. Last played slot (teams that played most recently sit out)

---

### 7. Schedule Review & Adjustment
**Status:** Not yet built

**Concept:**
- TD reviews generated schedule before publishing
- Can drag/drop games between slots (v2)
- Can manually override specific game times
- Override tracked: `isOverride: true, overrideReason: string` on Game
- Bubble updates (cascade rescheduling) — v2, `bubbleUpdated` field in place

**UI needed:**
- Schedule view — grid of slots × courts
- Each cell shows team matchup
- Override modal on click

---

### 8. Publishing
**Status:** Not yet built

**Concept:**
- TD hits Publish → event status changes to `active`
- `visibility.schedulePublic` set to true
- Players notified via email with magic link
- Magic link → `/schedule/:eventId` public page

**Email contains:**
- Event name, date, venue
- Magic link for player's personalized view
- No login required for basic schedule view

**API route needed:**
- `PATCH /event/:id/publish`

---

### 9. Live Event (separate subsystem)
**Status:** Not yet built — see LIVE_EVENT.md (to be created)

**Concept:**
- Score entry by captains during event
- Real-time standings updates
- Dispute/resolution workflow
- Notifications (scores entered, next game reminder)

**Key insight from real-world failure (April 2026 tournament):**
- Transposed scores → need confirmation step
- App crashed on pool play → bracket transition → Phase model solves this
- 2 hour wait for playoffs → Standings snapshots + automatic seeding
- Volunteer confusion → role-based access, captains own their scores

---

## Data Hierarchy