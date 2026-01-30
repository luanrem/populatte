# Phase 17: Backend Field Stats with Type Inference - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Field-level analytics endpoint for a batch. Returns per-field stats (presence count, unique value count, inferred type, confidence, sample values) with a single aggregation pass. Follows existing ownership validation pattern (404/403 separation) with soft-delete filtering. Frontend consumption and value browsing are separate phases (19 and 20).

</domain>

<decisions>
## Implementation Decisions

### Response shape
- Claude decides structure (flat array vs keyed object) based on existing API patterns
- Include `totalRows` at the top level so frontend can compute presence percentage
- Include 3 sample distinct values per field for card preview
- For zero-row batches: return field keys from columnMetadata with zero stats (fields exist but no data)

### Type inference rules
- Majority-wins heuristic: if 80%+ of non-empty sampled values match a type, infer that type; otherwise STRING
- Locale-aware: recognize Brazilian formats (CPF, CNPJ, CEP, DD/MM/YYYY dates, R$ currency) — classify correctly as STRING/NUMBER/DATE rather than mistyping them
- Return type + confidence score per field (e.g., `{ type: "NUMBER", confidence: 0.92 }`)
- BOOLEAN detection is strict keywords only: true/false, yes/no, sim/nao, 0/1, S/N
- Supported types: STRING, NUMBER, DATE, BOOLEAN, UNKNOWN

### Sampling strategy
- Type inference samples first 100 rows (deterministic, matches what users see in data table)
- Presence count and unique count use ALL rows (exact, not approximate)
- Sample values also drawn from the sampled set

### Edge cases
- Fields with zero presence across all rows: include in results with type UNKNOWN
- Empty strings treated as missing (not counted toward presence)
- Same logic for both LIST_MODE and PROFILE_MODE batches — uniform aggregation regardless of ingestion mode

### Claude's Discretion
- Response structure (flat array vs keyed object) — pick based on codebase patterns
- Query strategy (single aggregation vs multiple queries)
- How to extract and classify Brazilian format patterns
- Error response format for invalid batch IDs
- Exact confidence score calculation method

</decisions>

<specifics>
## Specific Ideas

- Confidence score enables frontend to visually indicate uncertain type inference (e.g., dim badge)
- Sample values give field cards a preview without needing the Phase 18 values endpoint
- First-100-rows sampling is intentionally deterministic so results are reproducible and debuggable

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-backend-field-stats-with-type-inference*
*Context gathered: 2026-01-30*
