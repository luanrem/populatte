# Requirements: End-to-End Authentication & User Sync

**Defined:** 2026-01-28
**Core Value:** Every authenticated request must have access to the local database user entity — not just the Clerk ID.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Configuration

- [x] **CFG-01**: Clerk JWT Template configured in Dashboard with email, firstName, lastName, imageUrl claims
- [x] **CFG-02**: Database repository uses upsert pattern (INSERT ON CONFLICT DO UPDATE) for atomic user sync

### Backend Infrastructure

- [ ] **AUTH-01**: Auth guard performs request-time user sync (creates user if not found, updates if exists)
- [ ] **AUTH-02**: Auth guard attaches full User entity to request object (not just clerkId)
- [ ] **AUTH-03**: ClerkService extracts email, firstName, lastName, imageUrl from JWT claims
- [ ] **AUTH-04**: User repository handles concurrent requests atomically via upsert pattern
- [ ] **AUTH-05**: CurrentUser decorator returns full User entity with correct TypeScript types
- [ ] **AUTH-06**: AuthenticatedRequest interface updated to use User entity type

### Frontend API Client

- [ ] **API-01**: Fetch wrapper automatically injects Clerk Bearer token into all API requests
- [ ] **API-02**: 401 responses trigger token refresh and single retry before redirect to sign-in
- [ ] **API-03**: API client provides type-safe response parsing with Zod schemas

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Optimization

- **OPT-01**: Request-scoped caching ensures sync only happens once per request
- **OPT-02**: SkipUserSync decorator bypasses sync for performance-critical routes
- **OPT-03**: Selective sync with lastSyncedAt field only syncs if data is stale

### Frontend Enhancements

- **FE-01**: Request queueing during token refresh prevents multiple parallel refresh attempts

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| OAuth/social login providers | Clerk handles this upstream — no backend changes needed |
| Roles/permissions system | Future milestone — requires design decisions beyond auth |
| Session management UI | Handled by Clerk components (UserButton, etc.) |
| API rate limiting | Separate infrastructure concern — not auth-related |
| Webhook changes | Existing webhook flow remains intact — request-time sync is additive |
| Audit logging | Add when observability infrastructure exists |
| Metadata sync from Clerk | Wait until there is a use case for publicMetadata/privateMetadata |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CFG-01 | Phase 1 | Complete |
| CFG-02 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| AUTH-06 | Phase 2 | Pending |
| API-01 | Phase 3 | Pending |
| API-02 | Phase 3 | Pending |
| API-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-01-28*
*Last updated: 2026-01-28 after roadmap creation*
