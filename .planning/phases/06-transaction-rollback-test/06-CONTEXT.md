# Phase 6: Transaction Rollback Test - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Integration test proving that a failed row insert rolls back the batch insert, preventing orphaned batches. Mock-based test through CreateBatchUseCase — no real database required.

</domain>

<decisions>
## Implementation Decisions

### Failure simulation
- Mock RowRepository.createMany to throw after batch is inserted
- Throw a domain-specific error (not generic Error) to also validate error propagation path
- Test through CreateBatchUseCase.execute() only — proves the real transactional boundary
- Orchestration-only verification: trusts @nestjs-cls/transactional library for actual DB rollback

### Test infrastructure
- Mock-based testing — no real database, no Docker containers
- Use NestJS Testing module (Test.createTestingModule) with overridden providers
- Test file in dedicated test directory: test/integration/create-batch.use-case.spec.ts
- NestJS module built once in beforeAll, mock behavior swapped per test

### Assertion strategy
- Verify repository call order: batch.create called before row.createMany, then error propagated
- Test both happy path (successful batch+rows) and failure path (rows throw, batch rolled back)
- Assert execute() rejects on failure — don't assert specific error type
- Nested describe blocks: describe('CreateBatchUseCase') > describe('success') + describe('rollback')

### Claude's Discretion
- Whether to assert exact call counts (e.g., toHaveBeenCalledTimes(1)) or just call order
- Whether to also verify error propagation (assert execute() throws the expected error) or just DB state
- Mock data fixtures design (minimal valid batch/row data)
- Any additional edge case tests beyond the two core scenarios

### Test isolation
- Fresh mock instances created in beforeEach — each test fully independent
- NestJS Testing module built once in beforeAll for performance
- Nested describe/it blocks organized by scenario (success, rollback)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for NestJS integration testing with mocks.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-transaction-rollback-test*
*Context gathered: 2026-01-29*
