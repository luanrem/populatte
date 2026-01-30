---
phase: 01-prerequisites
verified: 2026-01-28T18:22:00Z
status: gaps_found
score: 4/6 must-haves verified
gaps:
  - truth: "Repository has atomic upsert method using INSERT ON CONFLICT DO UPDATE"
    status: partial
    reason: "Upsert method exists but is orphaned - not used by SyncUserUseCase"
    artifacts:
      - path: "apps/api/src/infrastructure/database/drizzle/repositories/drizzle-user.repository.ts"
        issue: "upsert() method exists but is never called"
      - path: "apps/api/src/core/use-cases/user/sync-user.use-case.ts"
        issue: "Still uses findByClerkId + update/create pattern instead of upsert"
    missing:
      - "SyncUserUseCase should call userRepository.upsert() instead of separate find/update/create calls"
      - "Removes race condition risk from current pattern"
  - truth: "Clerk JWT tokens include email, firstName, lastName, imageUrl claims"
    status: human_needed
    reason: "Cannot verify Clerk Dashboard configuration programmatically"
    artifacts: []
    missing:
      - "Human verification: Decode JWT from authenticated session"
      - "Confirm payload contains: email, firstName, lastName, imageUrl"
human_verification:
  - test: "Verify Clerk JWT contains user profile claims"
    expected: "JWT payload includes email, firstName, lastName, imageUrl"
    why_human: "Requires Clerk Dashboard access and authenticated user session"
  - test: "Verify concurrent upsert prevents duplicates"
    expected: "Multiple simultaneous requests with same clerkId create only 1 record"
    why_human: "Requires running API and executing concurrent HTTP requests"
---

# Phase 1: Prerequisites Verification Report

**Phase Goal:** Clerk JWT tokens contain user profile data and database layer handles concurrent requests atomically

**Verified:** 2026-01-28T18:22:00Z

**Status:** GAPS FOUND

**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Database schema includes lastSyncedAt, deletedAt, and source columns | ✓ VERIFIED | Schema file contains all three columns with correct types |
| 2 | Partial unique index on clerkId excludes soft-deleted records | ✓ VERIFIED | `uniqueIndex('users_clerk_id_unique').on(table.clerkId).where(sql\`deleted_at IS NULL\`)` |
| 3 | Repository has atomic upsert method using INSERT ON CONFLICT DO UPDATE | ⚠️ PARTIAL | Method exists but is orphaned - not used in codebase |
| 4 | Missing CLERK_SECRET_KEY causes app startup failure | ✓ VERIFIED | Joi validation schema marks CLERK_SECRET_KEY as required |
| 5 | Clerk JWT tokens include email, firstName, lastName, imageUrl claims | ? HUMAN | Cannot verify Clerk Dashboard config programmatically |
| 6 | Concurrent requests for same user do not create duplicates | ⚠️ PARTIAL | Database mechanism supports this, but upsert not used by app code |

**Score:** 4/6 truths verified (2 partial, 1 needs human)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/infrastructure/database/drizzle/schema/users.schema.ts` | Extended schema with soft delete | ✓ VERIFIED | Contains lastSyncedAt, deletedAt, source; 39 lines |
| `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-user.repository.ts` | Atomic upsert method | ⚠️ ORPHANED | Method exists (95-132) but grep shows 0 call sites |
| `apps/api/src/core/repositories/user.repository.ts` | Upsert method signature | ✓ VERIFIED | Abstract method defined (line 14) |
| `apps/api/src/infrastructure/config/env.validation.ts` | Joi validation schema | ✓ VERIFIED | Contains CLERK_SECRET_KEY, DATABASE_URL as required; 26 lines |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| drizzle-user.repository.ts | users.schema.ts | onConflictDoUpdate targeting clerkId | ✓ WIRED | Line 108-124: uses `target: users.clerkId` with setWhere |
| app.module.ts | env.validation.ts | ConfigModule validationSchema | ✓ WIRED | Line 21: `validationSchema: envValidationSchema` |
| SyncUserUseCase | DrizzleUserRepository.upsert() | Use case should call upsert | ✗ NOT_WIRED | Use case uses findByClerkId + update/create instead |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| CFG-01: Clerk JWT tokens contain user profile claims | ? NEEDS HUMAN | Cannot verify Clerk Dashboard configuration |
| CFG-02: Database upsert with INSERT ON CONFLICT DO UPDATE | ⚠️ PARTIAL | Upsert method exists but not used by application code |
| CFG-03: Concurrent requests don't create duplicates | ⚠️ PARTIAL | Would work if upsert was used; current pattern has race condition |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| sync-user.use-case.ts | 23-44 | Check-then-act pattern (findByClerkId + update/create) | ⚠️ WARNING | Race condition risk; defeats purpose of atomic upsert |
| (none) | - | No TODO/FIXME/placeholder patterns found | - | - |

### Human Verification Required

#### 1. Verify Clerk JWT Configuration

**Test:** 
1. Go to Clerk Dashboard -> Sessions -> Customize session token
2. Verify this JSON template is configured:
   ```json
   {
     "email": "{{user.primary_email_address}}",
     "firstName": "{{user.first_name}}",
     "lastName": "{{user.last_name}}",
     "imageUrl": "{{user.image_url}}"
   }
   ```
3. Sign in to the web app
4. Open browser devtools -> Application -> Cookies
5. Find `__session` cookie, decode JWT at jwt.io

**Expected:** JWT payload contains email, firstName, lastName, imageUrl fields

**Why human:** Requires access to Clerk Dashboard and authenticated user session - cannot be automated

#### 2. Verify Environment Validation

**Test:**
1. Temporarily remove `CLERK_SECRET_KEY` from `apps/api/.env`
2. Run: `cd apps/api && pnpm run start:dev`
3. Observe startup failure with validation error
4. Restore `CLERK_SECRET_KEY` and verify app starts

**Expected:** App fails at startup with Joi validation error when CLERK_SECRET_KEY is missing

**Why human:** Requires modifying .env and observing runtime behavior

#### 3. Verify Concurrent Upsert (Deferred to Phase 2)

**Test:** 
After fixing the gap (using upsert in SyncUserUseCase):
1. Start API server
2. Fire 3 simultaneous POST requests with same clerkId
3. Check database: `SELECT COUNT(*) FROM users WHERE clerk_id = 'test_id'`

**Expected:** Exactly 1 row in database (not 3)

**Why human:** Requires running API and executing concurrent HTTP requests; deferred until upsert is actually wired

### Gaps Summary

**Critical Gap: Upsert Method Not Used**

The atomic upsert method was successfully implemented with:
- INSERT ON CONFLICT DO UPDATE pattern
- setWhere optimization (only updates when values change)
- Partial unique index on clerkId (excludes soft-deleted records)

However, **the method is orphaned** - no code in the codebase calls `userRepository.upsert()`.

The `SyncUserUseCase` (lines 22-45) still uses the non-atomic pattern:
```typescript
// Current pattern (race condition risk):
const existingUser = await this.userRepository.findByClerkId(input.clerkId);
if (existingUser) {
  return this.userRepository.update(input.clerkId, updateData);
}
return this.userRepository.create(createData);
```

**Should be:**
```typescript
// Atomic pattern:
return this.userRepository.upsert({
  clerkId: input.clerkId,
  email: input.email,
  firstName: input.firstName,
  lastName: input.lastName,
  imageUrl: input.imageUrl,
});
```

**Impact:** 
- Phase goal "database layer handles concurrent requests atomically" is NOT achieved
- Concurrent requests could still create duplicate users (race between find and create)
- The infrastructure is ready, but the application doesn't use it

**Secondary Gap: Clerk JWT Configuration Not Verified**

The SUMMARY.md claims "Clerk JWT session token configured with profile claims" was completed as a human checkpoint (Task 3: approved), but this cannot be verified programmatically. The infrastructure to consume JWT claims is ready (env validation, database schema), but without decoded JWT evidence, we cannot confirm the claims are configured correctly.

---

**Recommendation:** 
1. Update `SyncUserUseCase.execute()` to call `userRepository.upsert()` instead of find+update/create
2. Human verification of Clerk JWT claims (decode authenticated session token)
3. Re-run verification after gap closure

---

_Verified: 2026-01-28T18:22:00Z_
_Verifier: Claude (gsd-verifier)_
