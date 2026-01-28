# Roadmap: End-to-End Authentication & User Sync

## Overview

This roadmap delivers request-time user synchronization for Populatte. The journey starts with Clerk JWT configuration (prerequisite for all code), moves to the core backend sync implementation (guard enhancement, type updates, upsert verification), and concludes with a frontend API client for type-safe authenticated requests. By completion, every authenticated request will have access to the local User entity without manual lookups.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Prerequisites** - Clerk JWT Template and database upsert pattern
- [ ] **Phase 2: Backend Sync** - Guard-based user sync with full User entity attachment
- [ ] **Phase 3: Frontend Client** - Type-safe API client with token injection

## Phase Details

### Phase 1: Prerequisites
**Goal**: Clerk JWT tokens contain user profile data and database layer handles concurrent requests atomically
**Depends on**: Nothing (first phase)
**Requirements**: CFG-01, CFG-02
**Success Criteria** (what must be TRUE):
  1. Clerk JWT tokens include email, firstName, lastName, and imageUrl claims
  2. Database upsert for users uses INSERT ON CONFLICT DO UPDATE pattern
  3. Concurrent requests for same user do not create duplicates
**Plans**: 1 plan

Plans:
- [ ] 01-01-PLAN.md — Extend schema, implement upsert, add env validation, configure Clerk JWT

### Phase 2: Backend Sync
**Goal**: Authenticated requests have full User entity attached; controllers never manually fetch users
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. ClerkAuthGuard creates user in database if not found during request
  2. ClerkAuthGuard updates user metadata if changed since last sync
  3. Request object contains full User entity (not just clerkId)
  4. CurrentUser decorator returns User entity with correct TypeScript types
  5. Sync failures return 503 with generic message (no leaked internals)
**Plans**: TBD

Plans:
- [ ] 02-01: Extend ClerkService to extract full JWT claims
- [ ] 02-02: Enhance ClerkAuthGuard with sync logic and error handling
- [ ] 02-03: Update types and CurrentUser decorator

### Phase 3: Frontend Client
**Goal**: Frontend has type-safe API client with automatic authentication
**Depends on**: Phase 2
**Requirements**: API-01, API-02, API-03
**Success Criteria** (what must be TRUE):
  1. API client automatically injects Clerk Bearer token into requests
  2. 401 responses trigger token refresh and single retry before redirect
  3. API responses are parsed with Zod schemas for type safety
**Plans**: TBD

Plans:
- [ ] 03-01: Build fetch wrapper with token injection and retry logic
- [ ] 03-02: Add Zod schema integration for type-safe responses

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Prerequisites | 0/1 | Planned | - |
| 2. Backend Sync | 0/3 | Not started | - |
| 3. Frontend Client | 0/2 | Not started | - |

---
*Roadmap created: 2026-01-28*
*Depth: Quick (3-5 phases)*
