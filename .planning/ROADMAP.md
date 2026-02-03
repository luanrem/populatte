# Roadmap: Populatte v3.0 Backend Mapping

## Overview

Build the mapping CRUD layer that associates Excel columns to web form selectors, enabling the Chrome extension to fetch and execute form-filling recipes. Three phases deliver domain foundation, mapping lifecycle, and step management -- following established Clean Architecture patterns from v2.x.

## Phases

**Phase Numbering:**
- Continues from v2.3 Phase 20
- Integer phases (21, 22, 23): Planned milestone work
- Decimal phases (21.1, 22.1): Urgent insertions if needed

- [ ] **Phase 21: Domain Foundation** - Mapping and Step entities, Drizzle schemas, and repository layer
- [ ] **Phase 22: Mapping CRUD** - Complete mapping lifecycle with ownership validation and soft-delete
- [ ] **Phase 23: Step CRUD** - Step management with reordering and defense-in-depth security

## Phase Details

### Phase 21: Domain Foundation
**Goal**: Mapping and Step domain models exist with database persistence and repository abstractions
**Depends on**: Nothing (foundation phase)
**Requirements**: DOM-01, DOM-02, DOM-03
**Success Criteria** (what must be TRUE):
  1. Mapping entity exists with projectId, name, targetUrl, isActive, nullable successTrigger enum, and soft-delete timestamps
  2. Step entity exists with mappingId, action enum (fill/click/wait/verify), selector, selectorFallbacks array, mutually exclusive sourceFieldKey/fixedValue, stepOrder, and config options (waitMs, optional, clearBefore, pressEnter)
  3. Drizzle schema creates mappings and steps tables with proper foreign keys, indexes, and relationships
  4. Repository interfaces and Drizzle implementations support CRUD operations for both entities with soft-delete filtering on mappings
**Plans**: TBD

Plans:
- [ ] 21-01: Mapping domain layer (entity, Drizzle schema, repository interface + implementation, mapper)
- [ ] 21-02: Step domain layer (entity, Drizzle schema, repository interface + implementation, mapper, run migration)

### Phase 22: Mapping CRUD
**Goal**: Users can create, list, view, update, and soft-delete mappings for their projects
**Depends on**: Phase 21
**Requirements**: MAP-01, MAP-02, MAP-03, MAP-04, MAP-05, SEC-01, SEC-03
**Success Criteria** (what must be TRUE):
  1. User can create a mapping with name, targetUrl, and optional successTrigger for a project they own
  2. User can list paginated mappings for a project, with optional targetUrl prefix filter returning only active mappings
  3. User can view a mapping's details including all associated steps ordered by stepOrder
  4. User can update a mapping's name, targetUrl, isActive status, and successTrigger
  5. User can soft-delete a mapping, making it and its steps inaccessible via mapping endpoints
**Plans**: TBD

Plans:
- [ ] 22-01: Mapping use cases (create, list, get, update, soft-delete) with ownership validation
- [ ] 22-02: Mapping controller, DTOs, and endpoint wiring

### Phase 23: Step CRUD
**Goal**: Users can manage ordered steps within their mappings with full defense-in-depth security
**Depends on**: Phase 22
**Requirements**: STEP-01, STEP-02, STEP-03, STEP-04, SEC-02
**Success Criteria** (what must be TRUE):
  1. User can add a step to a mapping with action type, selector, and auto-assigned order at the end
  2. User can update a step's action, selector, fallbacks, sourceFieldKey or fixedValue (mutually exclusive), and config options
  3. User can delete a step from a mapping
  4. User can reorder steps by providing an ordered list of step IDs
  5. All step operations enforce the full ownership chain: step belongs to mapping, mapping belongs to project, project belongs to user
**Plans**: TBD

Plans:
- [ ] 23-01: Step use cases (create, update, delete, reorder) with defense-in-depth ownership
- [ ] 23-02: Step controller, DTOs, and endpoint wiring

## Progress

**Execution Order:**
Phases execute in numeric order: 21 → 22 → 23

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 21. Domain Foundation | 0/2 | Not started | - |
| 22. Mapping CRUD | 0/2 | Not started | - |
| 23. Step CRUD | 0/2 | Not started | - |
