# Testing Patterns

**Analysis Date:** 2026-01-28

## Test Framework

**Runner:**
- Jest 30.0.0
- Config: `apps/api/package.json` (inline Jest config in `jest` field)
- Configured with TypeScript support via `ts-jest`

**Assertion Library:**
- Jest built-in `expect()` for assertions

**Run Commands:**
```bash
npm run test                    # Run all tests in API
npm run test:watch             # Watch mode (run from apps/api)
npm run test:cov               # Coverage report (run from apps/api)
npm run test:debug             # Debug mode with inspector
npm run test:e2e               # E2E tests only
```

## Test File Organization

**Location:**
- Unit tests co-located with source: `src/app.controller.spec.ts` in same directory as `src/app.controller.ts`
- E2E tests in separate directory: `test/app.e2e-spec.ts`

**Naming:**
- Unit test files: `*.spec.ts` (e.g., `app.controller.spec.ts`)
- E2E test files: `*.e2e-spec.ts` (e.g., `app.e2e-spec.ts`)

**Structure:**
```
apps/api/
├── src/
│   ├── app.controller.ts
│   ├── app.controller.spec.ts          # Co-located unit test
│   ├── core/
│   │   ├── entities/
│   │   ├── use-cases/
│   │   └── repositories/
│   └── ...
└── test/
    └── app.e2e-spec.ts                # Separate E2E tests
```

## Test Structure

**Suite Organization:**
```typescript
describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
```

**Patterns:**
- Use `describe()` blocks for feature grouping
- Use nested `describe()` for method-level grouping
- Use `it()` for individual test cases
- Setup test module in `beforeEach()` using `Test.createTestingModule()`
- Get instance from module: `app.get<ClassName>(ClassName)`

## Mocking

**Framework:** Jest mocking built-in

**Patterns (NestJS):**
```typescript
// Mock dependencies in TestingModule
const mockUserRepository = {
  findById: jest.fn().mockResolvedValue(null),
  findByClerkId: jest.fn().mockResolvedValue(mockUser),
  create: jest.fn().mockResolvedValue(mockUser),
  update: jest.fn().mockResolvedValue(mockUser),
  delete: jest.fn().mockResolvedValue(undefined),
};

const app: TestingModule = await Test.createTestingModule({
  providers: [
    {
      provide: UserRepository,
      useValue: mockUserRepository,
    },
  ],
}).compile();
```

**What to Mock:**
- External dependencies (databases, APIs, services)
- Repository interfaces when testing use cases
- HTTP clients and external APIs
- Clerk authentication service

**What NOT to Mock:**
- Domain entity logic (entities themselves)
- Mappers (data transformation logic)
- Pure utility functions
- Controllers (test with compiled module)

## Fixtures and Factories

**Test Data:**
- Currently minimal—use object literals for test data
- No factory pattern yet implemented

**Pattern for Creating Test Data:**
```typescript
const mockUser = {
  id: 'test-id',
  clerkId: 'clerk_test',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  imageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

**Location:**
- Test data declared in test file itself
- Could be extracted to separate fixtures directory if tests grow

## Coverage

**Requirements:** None enforced currently

**View Coverage:**
```bash
cd apps/api
npm run test:cov
```

Output directory: `apps/api/../coverage/`

## Test Types

**Unit Tests:**
- Scope: Individual classes and methods
- Approach: Mock external dependencies, test isolation
- Location: Co-located with source files (`.spec.ts`)
- Example: `apps/api/src/app.controller.spec.ts`

**Integration Tests:**
- Scope: Testing modules with their dependencies
- Approach: Create TestingModule with real implementations or controlled mocks
- Currently integrated into unit tests via `Test.createTestingModule()`

**E2E Tests:**
- Framework: Jest with Supertest for HTTP requests
- Scope: Full application flow including NestJS bootstrap
- Location: `test/` directory with `*.e2e-spec.ts` naming
- Configuration: Separate Jest config file `test/jest-e2e.json`
- Example pattern in `apps/api/test/app.e2e-spec.ts`

## E2E Test Pattern

```typescript
describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],  // Full module import
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
```

**Key Differences:**
- Uses `imports: [AppModule]` instead of `providers`
- Creates full NestApplication with `createNestApplication()`
- Uses Supertest `request()` for HTTP assertions
- Tests actual HTTP layer, not mocked controllers

## Async Testing

**Pattern:**
```typescript
it('should find user by id', async () => {
  const result = await userRepository.findById('test-id');
  expect(result).toBeDefined();
});
```

- Use `async/await` in test functions
- Jest automatically detects Promise returns
- Alternatively, return Promise from test: `return promise`

## Error Testing

**Pattern:**
```typescript
it('should throw error when user not found', async () => {
  await expect(
    userRepository.findById('nonexistent')
  ).rejects.toThrow('User not found');
});
```

- Use `rejects.toThrow()` for async errors
- Use `toThrow()` for synchronous errors

## Test Environment

**Configuration (`apps/api/package.json`):**
```json
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "collectCoverageFrom": ["**/*.(t|j)s"],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node"
}
```

- Root directory: `src/` (tests run relative to source)
- Test regex: `.*\.spec\.ts$` (matches `*.spec.ts` files)
- Transform: `ts-jest` for TypeScript support
- Environment: `node` (NestJS is server-side)

## Web App Testing

**Status:** No tests currently configured for `apps/web`

**Future Approach (if added):**
- Framework: Vitest (faster than Jest for React) or Jest with React Testing Library
- Pattern: Component unit tests with React Testing Library
- E2E tests: Playwright or Cypress for browser automation

## Common Patterns

### Setting Up Test Module

```typescript
beforeEach(async () => {
  const app: TestingModule = await Test.createTestingModule({
    controllers: [UserController],
    providers: [
      UserService,
      {
        provide: UserRepository,
        useValue: mockUserRepository,
      },
    ],
  }).compile();

  controller = app.get<UserController>(UserController);
});
```

### Mocking Repository Behavior

```typescript
const mockUserRepository = {
  findByClerkId: jest
    .fn()
    .mockResolvedValue({ id: '1', clerkId: 'clerk_123', ... }),
  create: jest.fn().mockResolvedValue({ id: '1', clerkId: 'clerk_123', ... }),
};
```

### Testing HTTP Endpoints (E2E)

```typescript
it('POST /api/endpoint (POST)', () => {
  return request(app.getHttpServer())
    .post('/api/endpoint')
    .send({ data: 'value' })
    .expect(201)
    .expect((res) => {
      expect(res.body.id).toBeDefined();
    });
});
```

## Test Maintenance

**Running Tests:**
- Run all: `npm run test`
- Run specific suite: `npm run test -- app.controller`
- Watch mode: `npm run test:watch` (from `apps/api`)
- With coverage: `npm run test:cov`

**Debugging Tests:**
- Run debug mode: `npm run test:debug`
- Node inspector opens at `chrome://inspect`

---

*Testing analysis: 2026-01-28*
