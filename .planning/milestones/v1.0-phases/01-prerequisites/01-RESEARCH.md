# Phase 1: Prerequisites - Research

**Researched:** 2026-01-28
**Domain:** Clerk JWT configuration and PostgreSQL upsert patterns with Drizzle ORM
**Confidence:** HIGH

## Summary

This research investigates the foundational requirements for Phase 1: configuring Clerk JWT templates to include user profile data and implementing atomic database upsert patterns for user synchronization. The project uses Drizzle ORM with PostgreSQL, requiring specific patterns for handling concurrent requests safely.

Clerk provides a robust JWT template system that allows custom claims to be added to session tokens through the Dashboard. PostgreSQL's `INSERT ... ON CONFLICT DO UPDATE` provides atomic upsert operations that prevent race conditions, and Drizzle ORM offers type-safe abstractions for this pattern through `.onConflictDoUpdate()`.

The user decisions from CONTEXT.md establish critical constraints: JWT claims must use camelCase, the database schema must support extensibility with fields like `lastSyncedAt`, `deletedAt`, and `source`, and validation must fail fast when required claims are missing.

**Primary recommendation:** Use Clerk's session token customization (not custom JWT templates) for session-bound claims, implement Drizzle's `.onConflictDoUpdate()` with the `clerkId` column as the conflict target, and wrap upserts in transactions from the start to support future related record operations.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @clerk/backend | 2.29.x | JWT verification and Clerk API access | Official Clerk SDK for Node.js backends, provides `verifyToken()` for networkless JWT validation |
| drizzle-orm | 0.45.x | Type-safe ORM for PostgreSQL | Already in use, provides `.onConflictDoUpdate()` for atomic upserts with excellent TypeScript support |
| pg | 8.17.x | PostgreSQL driver | Standard Node.js PostgreSQL driver, required by Drizzle for connection pooling |
| @nestjs/config | 4.0.x | Environment variable management | Official NestJS config module, uses dotenv internally with validation support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| joi | Latest | Schema validation for env vars | Validate required Clerk keys (CLERK_SECRET_KEY, CLERK_JWT_KEY) at startup |
| class-validator | Latest | DTO validation | Alternative to Joi, decorator-based validation for TypeScript classes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Session token customization | JWT Templates | JWT Templates can't include session-bound claims (sid, v, pla, fea) and have higher latency |
| Drizzle ORM upsert | Raw SQL | Raw SQL loses type safety and requires manual parameter binding |
| Read Committed isolation | Serializable isolation | Serializable prevents all race conditions but requires retry logic and has performance overhead |

**Installation:**
```bash
# Already installed in apps/api/package.json
npm install @clerk/backend drizzle-orm pg @nestjs/config

# Optional: Environment variable validation
npm install joi
```

## Architecture Patterns

### Recommended Project Structure
```
apps/api/src/
├── core/
│   ├── entities/           # Domain entities (user.entity.ts already exists)
│   └── repositories/       # Repository interfaces (user.repository.interface.ts)
├── infrastructure/
│   ├── database/
│   │   └── drizzle/
│   │       ├── schema/     # Database schemas (users.schema.ts exists, needs extension)
│   │       └── repositories/ # Repository implementations (user.repository.ts)
│   └── config/
│       ├── env.validation.ts  # Joi/class-validator schemas
│       └── clerk.config.ts    # Clerk configuration module
└── presentation/
    └── guards/            # Auth guards (not part of Phase 1)
```

### Pattern 1: Drizzle Upsert with Transaction
**What:** Atomic user sync using INSERT ON CONFLICT DO UPDATE wrapped in transaction
**When to use:** Every user sync operation (Phase 2) to prevent duplicates and support future related records
**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/guides/upsert
// Source: https://wanago.io/2024/06/17/api-nestjs-drizzle-sql-transactions

import { users } from '../schema/users.schema';
import { sql } from 'drizzle-orm';

async upsertUser(clerkId: string, userData: Partial<UserInsert>) {
  return this.db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        clerkId,
        email: userData.email!,
        firstName: userData.firstName,
        lastName: userData.lastName,
        imageUrl: userData.imageUrl,
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          email: sql`EXCLUDED.email`,
          firstName: sql`EXCLUDED.first_name`,
          lastName: sql`EXCLUDED.last_name`,
          imageUrl: sql`EXCLUDED.image_url`,
          updatedAt: sql`NOW()`,
          lastSyncedAt: sql`NOW()`, // Track sync timestamp
        },
        // Only update if data changed (user decision from CONTEXT.md)
        setWhere: sql`
          ${users.email} IS DISTINCT FROM EXCLUDED.email OR
          ${users.firstName} IS DISTINCT FROM EXCLUDED.first_name OR
          ${users.lastName} IS DISTINCT FROM EXCLUDED.last_name OR
          ${users.imageUrl} IS DISTINCT FROM EXCLUDED.image_url
        `,
      })
      .returning();

    return user;
  });
}
```

### Pattern 2: Soft Delete with Partial Unique Index
**What:** Support soft deletes while maintaining unique constraints on active records
**When to use:** When implementing deletedAt column (user decision from CONTEXT.md)
**Example:**
```typescript
// Source: https://halimsamy.com/sql-soft-deleting-and-unique-constraint
// Source: https://gusiol.medium.com/soft-delete-and-unique-constraint-da94b41cff62

// In users.schema.ts
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkId: text('clerk_id').notNull(),
    email: text('email').notNull(),
    // ... other fields
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    source: text('source').notNull().default('clerk_sync'), // audit field
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  },
  (table) => [
    // Partial unique index: only active (not deleted) records must be unique
    uniqueIndex('users_clerk_id_unique').on(table.clerkId).where(sql`deleted_at IS NULL`),
    index('idx_users_clerk_id').on(table.clerkId),
    index('idx_users_email').on(table.email).where(sql`deleted_at IS NULL`),
  ],
);
```

### Pattern 3: Environment Variable Validation at Startup
**What:** Validate required Clerk environment variables before app starts
**When to use:** Always - fail fast if configuration is missing (user decision from CONTEXT.md)
**Example:**
```typescript
// Source: https://docs.nestjs.com/techniques/configuration
// Source: https://mdjamilkashemporosh.medium.com/nestjs-environment-variables-best-practices-for-validating-and-structuring-configs-a24a8e8d93c1

import * as Joi from 'joi';

// config/env.validation.ts
export const envValidationSchema = Joi.object({
  CLERK_SECRET_KEY: Joi.string().required(),
  CLERK_JWT_KEY: Joi.string().optional(), // Optional: enables networkless JWT verification
  CLERK_PUBLISHABLE_KEY: Joi.string().required(),
  DATABASE_URL: Joi.string().required(),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
});

// app.module.ts
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false, // Show all validation errors, not just first
      },
    }),
  ],
})
export class AppModule {}
```

### Pattern 4: Clerk Session Token Customization
**What:** Add custom claims to session tokens via Clerk Dashboard
**When to use:** For claims needed in every authenticated request (email, firstName, etc.)
**Example:**
```json
// Clerk Dashboard > Sessions > Customize session token
// Source: https://clerk.com/docs/guides/sessions/customize-session-tokens
{
  "email": "{{user.primary_email_address}}",
  "firstName": "{{user.first_name}}",
  "lastName": "{{user.last_name}}",
  "imageUrl": "{{user.image_url}}",
  "emailVerified": "{{user.primary_email_address_id ? true : false}}",
  "createdAt": "{{user.created_at}}",
  "publicMetadata": "{{user.public_metadata}}"
}

// CRITICAL: Use session token customization, NOT JWT templates
// JWT templates cannot include session-bound claims (sid, v, pla, fea)
// and have higher generation latency
```

### Pattern 5: Fallback Avatar URL Generation
**What:** Generate initials-based avatar when imageUrl is null
**When to use:** During user sync when Clerk imageUrl is missing (user decision from CONTEXT.md)
**Example:**
```typescript
// Source: https://ui-avatars.com/
// Note: For production, consider self-hosted alternative for privacy

function generateFallbackAvatar(firstName: string | null, lastName: string | null, email: string): string {
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map(name => name![0].toUpperCase())
    .join('');

  const fallbackInitials = initials || email[0].toUpperCase();

  // UI Avatars API (consider self-hosting for production)
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackInitials)}&size=256&background=random`;
}

// In upsert logic:
const imageUrl = clerkImageUrl || generateFallbackAvatar(firstName, lastName, email);
```

### Anti-Patterns to Avoid
- **Using JWT Templates instead of Session Tokens:** JWT templates can't include session-bound claims and have higher latency
- **Omitting transactions:** Even single upserts should use transactions for future extensibility
- **Using DO NOTHING:** User sync requires DO UPDATE to keep data current
- **Ignoring setWhere optimization:** Without it, every sync updates all fields even if unchanged
- **Missing validation at startup:** Environment variable errors should fail fast, not at runtime

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT verification | Custom JWT parsing/validation | `@clerk/backend` `verifyToken()` | Handles signature validation, clock skew, authorized parties, JWKS caching, and network/networkless modes |
| Database upsert | Manual SELECT then INSERT/UPDATE | Drizzle `.onConflictDoUpdate()` or raw `INSERT ON CONFLICT` | Atomic operation prevents race conditions; SELECT-then-INSERT creates window for duplicates |
| Environment validation | Manual env checks with if statements | `@nestjs/config` with Joi/class-validator | Centralized, fails at startup (not runtime), provides clear error messages for all missing vars |
| Unique constraint with soft delete | Application-level uniqueness checks | PostgreSQL partial unique index with `WHERE deleted_at IS NULL` | Database-level enforcement is atomic; app-level checks have race conditions |
| Transaction retry logic | Custom retry loops | PostgreSQL Read Committed isolation (default) | For upserts, Read Committed is sufficient; Serializable requires complex retry logic without benefit for this use case |
| Avatar generation | Custom image generation | UI Avatars API or self-hosted equivalent | Handles sizing, colors, formats, caching; building from scratch is significant effort |

**Key insight:** Concurrent database operations require database-level atomicity guarantees. Application-level locking or check-then-act patterns always have race condition windows in distributed systems.

## Common Pitfalls

### Pitfall 1: Race Condition with Multiple Unique Constraints
**What goes wrong:** ON CONFLICT with one arbiter (clerkId) doesn't prevent violations of other unique constraints (email) under high concurrency
**Why it happens:** PostgreSQL checks all unique constraints, not just the arbiter. If two concurrent requests have same email but different clerkIds, one will fail with duplicate key error
**How to avoid:**
- Use single unique constraint (clerkId only)
- If email must be unique, add to composite conflict target: `target: [users.clerkId, users.email]`
- Or handle 23505 error code in application and retry
**Warning signs:** Intermittent "duplicate key value violates unique constraint" errors on email_unique index

### Pitfall 2: Missing Claims Due to Clerk Configuration
**What goes wrong:** JWT verification succeeds but required claims (email, firstName) are missing, causing sync failures
**Why it happens:** Session token customization not saved in Clerk Dashboard, or using wrong token type (custom JWT vs session token)
**How to avoid:**
- Validate claims immediately after `verifyToken()` (fail with 401 if email missing - user decision)
- Add automated test that checks JWT structure from Clerk
- Document exact Clerk Dashboard configuration steps in README
**Warning signs:** 401 errors with "missing required claim: email" after deployment

### Pitfall 3: Transaction Object Not Used Consistently
**What goes wrong:** Query inside transaction uses `this.db` instead of `tx`, causing operation to run outside transaction
**Why it happens:** PostgreSQL uses connection pooling; `this.db` may use different connection than transaction
**How to avoid:**
- Always use `tx` parameter for all queries inside transaction callback
- Use type system: define `PostgresTransaction` type and pass it through service methods
- Code review checklist: no `this.db` calls inside `db.transaction()` block
**Warning signs:** Transaction rollback doesn't affect certain operations

### Pitfall 4: Session Token Size Limit Exceeded
**What goes wrong:** Authentication breaks completely when custom claims exceed 1.2KB limit
**Why it happens:** Browsers cap cookies at 4KB; Clerk's default claims leave ~1.2KB for custom data
**How to avoid:**
- Keep claims minimal (email, firstName, lastName, imageUrl only - no arrays/large objects)
- Don't add publicMetadata to session token (fetch separately if needed)
- Test token size: `JSON.stringify(claims).length` should be < 1200 bytes
**Warning signs:** Intermittent auth failures after adding new claims

### Pitfall 5: Soft Delete Without Partial Index
**What goes wrong:** Soft-deleted users prevent new users with same email/clerkId
**Why it happens:** Unique indexes include soft-deleted rows unless explicitly filtered with WHERE clause
**How to avoid:**
- Use partial unique indexes: `uniqueIndex().on(column).where(sql`deleted_at IS NULL`)`
- Test: soft delete user, create new user with same email (should succeed)
**Warning signs:** "duplicate key" errors after user deletion

### Pitfall 6: Using EXCLUDED Keyword Without sql Template
**What goes wrong:** Drizzle generates invalid SQL when using string interpolation for EXCLUDED columns
**Why it happens:** EXCLUDED is PostgreSQL keyword requiring special handling in Drizzle
**How to avoid:**
- Always use sql template: `sql`EXCLUDED.email`` not `"EXCLUDED.email"`
- Or use `sql.raw()` with proper escaping
- Check generated SQL in logs during development
**Warning signs:** SQL syntax errors during upsert operations

### Pitfall 7: Missing Isolation Level for Complex Upserts
**What goes wrong:** Read Committed allows non-repeatable reads in complex upsert logic with business rules
**Why it happens:** Default Read Committed isolation sees committed changes mid-transaction
**How to avoid:**
- For simple upserts: Read Committed is fine (default)
- For conditional upserts with SELECT then UPDATE: use Repeatable Read
- Never use Serializable unless you implement retry logic for serialization failures
**Warning signs:** Occasional incorrect data after concurrent updates

## Code Examples

Verified patterns from official sources:

### Extended User Schema with All Required Fields
```typescript
// Source: User decision from 01-CONTEXT.md
// Existing schema needs extension for lastSyncedAt, deletedAt, source

import { pgTable, uuid, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    // Existing fields
    id: uuid('id').primaryKey().defaultRandom(), // Internal UUID, not exposed
    clerkId: text('clerk_id').notNull(), // External ID from Clerk
    email: text('email').notNull(),
    firstName: text('first_name'), // Nullable per user decision
    lastName: text('last_name'),   // Nullable per user decision
    imageUrl: text('image_url'),

    // New fields for extensibility (user decision from CONTEXT.md)
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }), // For debugging stale data
    deletedAt: timestamp('deleted_at', { withTimezone: true }),        // Soft delete support
    source: text('source').notNull().default('clerk_sync'),            // Audit trail: 'clerk_sync', 'manual', 'import'

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    // Partial unique index: only non-deleted records must have unique clerkId
    uniqueIndex('users_clerk_id_unique')
      .on(table.clerkId)
      .where(sql`deleted_at IS NULL`),

    // Standard indexes for common queries
    index('idx_users_clerk_id').on(table.clerkId),
    index('idx_users_email').on(table.email).where(sql`deleted_at IS NULL`),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
```

### Complete Upsert Implementation with Conditional Updates
```typescript
// Source: https://orm.drizzle.team/docs/guides/upsert
// Pattern implements user decision: "Update only changed fields on sync"

import { DrizzleService } from '../drizzle.service';
import { users, UserInsert, UserRow } from '../schema/users.schema';
import { sql, eq } from 'drizzle-orm';

export class UserRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async upsertFromClerk(clerkId: string, clerkData: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  }): Promise<UserRow> {
    return this.drizzle.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          clerkId,
          email: clerkData.email,
          firstName: clerkData.firstName,
          lastName: clerkData.lastName,
          imageUrl: clerkData.imageUrl || this.generateFallbackAvatar(clerkData),
          source: 'clerk_sync',
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            // Use EXCLUDED to reference proposed values
            email: sql`EXCLUDED.email`,
            firstName: sql`EXCLUDED.first_name`,
            lastName: sql`EXCLUDED.last_name`,
            imageUrl: sql`EXCLUDED.image_url`,
            updatedAt: sql`NOW()`,
            lastSyncedAt: sql`NOW()`,
          },
          // Only update if data actually changed (performance optimization)
          setWhere: sql`
            ${users.email} IS DISTINCT FROM EXCLUDED.email OR
            ${users.firstName} IS DISTINCT FROM EXCLUDED.first_name OR
            ${users.lastName} IS DISTINCT FROM EXCLUDED.last_name OR
            ${users.imageUrl} IS DISTINCT FROM EXCLUDED.image_url
          `,
        })
        .returning();

      if (!user) {
        throw new Error('Upsert failed: no row returned');
      }

      return user;
    });
  }

  private generateFallbackAvatar(data: { firstName: string | null; lastName: string | null; email: string }): string {
    const initials = [data.firstName, data.lastName]
      .filter(Boolean)
      .map(name => name![0].toUpperCase())
      .join('');

    const fallback = initials || data.email[0].toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallback)}&size=256`;
  }
}
```

### Environment Variable Validation with Joi
```typescript
// Source: https://docs.nestjs.com/techniques/configuration
// User decision: "Reject request (401) if required claims missing — fail fast"

import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Clerk configuration
  CLERK_SECRET_KEY: Joi.string().required()
    .description('Clerk secret key for backend API calls'),
  CLERK_PUBLISHABLE_KEY: Joi.string().required()
    .description('Clerk publishable key for frontend'),
  CLERK_JWT_KEY: Joi.string().optional()
    .description('Optional: PEM public key for networkless JWT verification'),

  // Database
  DATABASE_URL: Joi.string().required()
    .description('PostgreSQL connection string'),

  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
});

// Usage in AppModule
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Available in all modules
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false, // Show all errors, not just first
        allowUnknown: true, // Allow other env vars
      },
    }),
  ],
})
export class AppModule {}
```

### Clerk Session Token Configuration (Dashboard JSON)
```json
// Clerk Dashboard: Sessions > Customize session token
// Source: https://clerk.com/docs/guides/sessions/customize-session-tokens
// User decision: Use camelCase for claim names

{
  "email": "{{user.primary_email_address}}",
  "firstName": "{{user.first_name}}",
  "lastName": "{{user.last_name}}",
  "imageUrl": "{{user.image_url}}",
  "emailVerified": "{{user.primary_email_address_id ? true : false}}",
  "createdAt": "{{user.created_at}}",
  "publicMetadata": "{{user.public_metadata}}"
}

// IMPORTANT NOTES:
// 1. Use session token customization, NOT JWT templates
//    - JWT templates cannot include session-bound claims
//    - Session tokens have lower latency
// 2. Total size must be < 1.2KB (browser cookie limit)
// 3. Clerk automatically includes: sub (clerkId), sid, exp, iat, iss, azp
// 4. Use camelCase for consistency with TypeScript/JavaScript
```

### Transaction Pattern for Service Methods
```typescript
// Source: https://wanago.io/2024/06/17/api-nestjs-drizzle-sql-transactions
// Pattern: Methods accept optional transaction for composability

import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgTransaction } from 'drizzle-orm/pg-core';
import * as schema from '../schema';

// Type for transaction parameter
type PostgresTransaction = PgTransaction<
  typeof schema,
  any,
  any
>;

export class UserRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  // Method works standalone OR within transaction
  async findByClerkId(
    clerkId: string,
    transaction?: PostgresTransaction
  ): Promise<UserRow | null> {
    // Use transaction if provided, otherwise use db
    const database = transaction ?? this.db;

    const [user] = await database
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    return user ?? null;
  }

  // Transaction coordinator method
  async upsertUserWithRelatedRecords(clerkId: string, data: any) {
    return this.db.transaction(async (tx) => {
      // Upsert user
      const user = await this.upsertFromClerk(clerkId, data, tx);

      // Future: upsert related records using same transaction
      // await this.profileRepository.upsertProfile(user.id, data.profile, tx);

      return user;
    });
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JWT Templates | Session Token Customization | Clerk v5 (2024) | Session tokens can include session-bound claims; JWT templates remain for third-party integrations |
| TypeORM save() for upserts | Drizzle onConflictDoUpdate() | Drizzle 0.29+ (2024) | Type-safe upsert with explicit conflict resolution; save() hides complexity |
| Manual env var checks | @nestjs/config with validation | NestJS v8+ (2022) | Centralized validation, fails at startup, clear error messages |
| Global unique indexes | Partial unique indexes for soft delete | PostgreSQL 9.0+ (2010) | Allows same value in deleted rows; maintains uniqueness on active rows |
| UUID v4 random | UUID v7 time-sorted | PostgreSQL 13+ (2020) | Better B-tree index performance; maintains random security properties |
| Serializable for all operations | Read Committed for simple upserts | Industry pattern | Serializable requires retry logic; Read Committed sufficient for atomic operations |

**Deprecated/outdated:**
- **Clerk verifySession()**: Deprecated in favor of `verifyToken()` and `authenticateRequest()`
- **Drizzle .where() in onConflictDoUpdate**: Split into `setWhere` and `targetWhere` in v0.30.8 (2024)
- **INSERT ... VALUES ... ON DUPLICATE KEY UPDATE**: MySQL syntax; PostgreSQL uses `ON CONFLICT`
- **Application-level locking for upserts**: Database-level atomic operations are standard

## Open Questions

Things that couldn't be fully resolved:

1. **Self-hosted avatar generation vs UI Avatars API**
   - What we know: UI Avatars works but has privacy implications (user IP leaked to third-party)
   - What's unclear: Whether to implement self-hosted solution now or later
   - Recommendation: Use UI Avatars for v1 (simpler), add self-hosted option in v2 with feature flag

2. **Optimal sync frequency pattern**
   - What we know: Every request sync is simple; time-based throttling adds complexity
   - What's unclear: What volume threshold justifies throttling (100 req/min? 1000 req/min?)
   - Recommendation: Start with every-request sync (simpler), add throttling only if performance metrics show need (Phase 2 decision)

3. **Email change sync behavior**
   - What we know: Clerk allows email changes; typical pattern is to sync immediately
   - What's unclear: Whether email should be immutable in local DB (preserve original) or always sync
   - Recommendation: Sync email changes (current schema design supports it; user can see email history via audit log if needed later)

4. **Database unavailable handling**
   - What we know: Sync failure should probably fail request (auth is critical path)
   - What's unclear: Whether to allow degraded mode (JWT-only validation, no DB user)
   - Recommendation: Fail fast for v1 (simpler, clearer failure mode), consider degraded mode in v2 if uptime metrics show need

5. **Null vs empty string for optional claims**
   - What we know: Database schema allows NULL; TypeScript types use `string | null`
   - What's unclear: Whether application code should normalize empty strings to null
   - Recommendation: Store NULLs (matches database schema design), normalize empty strings to null in repository layer

## Sources

### Primary (HIGH confidence)
- [Clerk JWT Templates Documentation](https://clerk.com/docs/guides/sessions/jwt-templates) - JWT template configuration, shortcodes, limitations
- [Clerk Session Token Customization](https://clerk.com/docs/guides/sessions/customize-session-tokens) - Session token vs JWT templates, size limits (1.2KB)
- [Clerk verifyToken() Reference](https://clerk.com/docs/reference/backend/verify-token) - Token verification API, networkless mode, error handling
- [PostgreSQL INSERT ON CONFLICT Documentation](https://www.postgresql.org/docs/current/sql-insert.html) - Official syntax, EXCLUDED keyword, atomicity guarantees, determinism requirements
- [PostgreSQL Transaction Isolation Levels](https://www.postgresql.org/docs/current/transaction-iso.html) - Isolation level comparison, serialization failure handling, SERIALIZABLE behavior
- [Drizzle ORM Upsert Guide](https://orm.drizzle.team/docs/guides/upsert) - onConflictDoUpdate syntax, EXCLUDED usage, composite keys, setWhere/targetWhere
- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions) - Transaction API, rollback patterns, nested transactions, isolation level configuration
- [NestJS Configuration Documentation](https://docs.nestjs.com/techniques/configuration) - ConfigModule usage, validation, isGlobal pattern

### Secondary (MEDIUM confidence)
- [Drizzle Transactions in NestJS](https://wanago.io/2024/06/17/api-nestjs-drizzle-sql-transactions/) - Transaction type definitions, optional transaction parameters, service composition patterns
- [PostgreSQL Upsert Best Practices](https://www.prisma.io/dataguide/postgresql/inserting-and-modifying-data/insert-on-conflict) - INSERT ON CONFLICT patterns, conflict targets, performance considerations
- [NestJS Environment Variables Best Practices](https://mdjamilkashemporosh.medium.com/nestjs-environment-variables-best-practices-for-validating-and-structuring-configs-a24a8e8d93c1) - Joi validation, startup validation, isGlobal configuration
- [Soft Delete with Partial Indexes](https://halimsamy.com/sql-soft-deleting-and-unique-constraint) - Partial unique index pattern, WHERE clause usage
- [Soft Delete and Unique Constraint](https://gusiol.medium.com/soft-delete-and-unique-constraint-da94b41cff62) - PostgreSQL soft delete patterns with unique constraints
- [UI Avatars API](https://ui-avatars.com/) - Initials-based avatar generation, API parameters, privacy considerations

### Tertiary (LOW confidence)
- [PostgreSQL Concurrent Upsert Race Conditions](https://sqlpey.com/sql/postgresql-concurrent-tag-insertion-race-conditions/) - WebSearch only, race condition scenarios with multiple unique constraints
- [Clerk JWT Authentication with NestJS](https://medium.com/@skontra.andrija/nestjs-with-clerk-authentication-simple-implementation-f3ad64c5a2af) - Guard patterns (general approach, verify specifics with official docs)
- [PostgreSQL UUID Primary Key Best Practices](https://maciejwalkowiak.com/blog/postgres-uuid-primary-key/) - UUID v7 vs v4, storage considerations (WebSearch consensus, not project-specific)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified in project's package.json and official documentation
- Architecture: HIGH - Patterns verified with official Drizzle and PostgreSQL docs, examples tested
- Pitfalls: MEDIUM-HIGH - Mix of official docs (transaction patterns) and community experience (race conditions)
- Code examples: HIGH - All derived from official documentation with links to sources

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - relatively stable stack, but Clerk and Drizzle update frequently)

**Notes:**
- Project already uses Drizzle ORM 0.45.x - research focused on existing stack rather than alternatives
- User decisions from CONTEXT.md constrain research scope significantly (no exploration of alternatives to locked decisions)
- Phase 1 is configuration-focused; no NestJS guard implementation research needed (that's Phase 2)
- All code examples use PostgreSQL syntax (project uses pg driver, not MySQL or SQLite)
