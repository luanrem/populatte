# Feature Landscape: Field Inventory Visualization

**Domain:** Data profiling and field-level analytics for form-filling automation
**Researched:** 2026-01-30
**Context:** v2.3 milestone — adding field inventory view to existing batch detail UI
**Confidence:** HIGH

## Executive Summary

This research examines field-level data exploration patterns in ETL, data profiling, and data catalog tools (Tableau Prep, Trifacta/Alteryx Designer Cloud, ydata-profiling, Great Expectations) to inform Populatte's Field Inventory feature.

**Key findings:**
1. **Field cards with metadata** are universal — every tool shows field name, inferred type, presence stats, and unique value count
2. **Type inference** from raw values is table stakes — users expect automatic detection of dates, emails, phones, numbers
3. **Side panels for value inspection** are the standard pattern — clicking a field shows all its values in a drawer/sheet
4. **Search within value lists** is expected when fields have 100+ unique values
5. **Copy-to-clipboard** interactions must use Clipboard API with visual feedback (modern security standards)
6. **View toggles** between table and card layouts are common in data tools (PatternFly, Material-UI patterns)

Unlike generic data profiling tools (which focus on statistical analysis), **Populatte's differentiator is form-mapping preparation**. Users need to know "which fields can auto-map to form inputs?" not "what's the standard deviation?" This shapes our feature priorities significantly.

---

## Table Stakes

Features users expect from field-level data exploration tools. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Field cards with basic metadata** | Every data profiling tool shows field name, type, and count. Users need to see "what fields exist" at a glance. | Low | Display name, inferred type badge, presence count (e.g., "45 of 50 records"). Already have `columnMetadata` in batches table. |
| **Unique value count** | Core metric for field cardinality. Differentiates ID fields (50 unique) from category fields (5 unique). | Low | `SELECT field_key, COUNT(DISTINCT value) FROM rows GROUP BY field_key`. Essential for understanding data distribution. |
| **Null/missing value visualization** | Missing data is the #1 data quality issue. Users expect heatmaps or bar charts showing completeness. | Medium | Presence percentage (e.g., "45/50 = 90% complete"). Heat map patterns from missingno library — color-code cards by completeness. |
| **Type inference from raw values** | Users upload untyped Excel data. Automatic type detection (string/number/date/boolean) is expected behavior. | Medium | Pattern-based detection: dates (ISO8601, dd/mm/yyyy), emails (regex), phones, numbers. Google Cloud DLP and Microsoft SIT provide reference patterns. |
| **Side panel for value inspection** | Clicking a field to see all its values is universal pattern in Tableau Prep, Trifacta, ydata-profiling. | Medium | Sheet/drawer component with scrollable value list. Use shadcn/ui Sheet component. |
| **Search within value lists** | When field has 500+ unique values, users need to find specific entries. LinkedIn Jobs example: search within company filter. | Low | Client-side filter with debounce. Standard text input above value list. |
| **Copy individual values to clipboard** | Data exploration workflows require copying sample values for testing (e.g., copy a CNPJ to test form). | Low | Clipboard API with visual feedback (toast/checkmark). Security requirement: HTTPS only. |
| **View toggle (table ↔ field inventory)** | Users need both row-oriented (table) and column-oriented (field cards) perspectives. Card view useful for 50+ columns. | Medium | Button toggle in header. PatternFly and Material-UI use grid/list icons. Preserve toggle state in URL params. |
| **Sort/order fields** | Users expect alphabetical or by-completeness sorting. Helps find problematic fields quickly. | Low | Dropdown: "A-Z", "Completeness ↓", "Unique values ↓". Client-side sort on already-fetched field stats. |

---

## Differentiators

Features that set the product apart. Not expected, but highly valued. These align with Populatte's form-filling mission.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Smart type badges with form-mapping hints** | Beyond generic "string/number", show "EMAIL", "PHONE", "DOCUMENT_ID", "DATE". Helps users anticipate which form fields will auto-map. | Medium | Pattern library: Brazilian CPF/CNPJ (14 digits with punctuation), phone (country code detection), email, dates. Leverage Google Cloud infoType detectors as reference. |
| **Completeness heatmap on cards** | Visual gradient background on each card (red=50% complete, yellow=75%, green=100%). Faster than reading percentages. | Low | CSS gradient based on presence ratio. missingno library uses red/blue heatmaps — adapt for card backgrounds. |
| **Field-to-field relationship hints** | Detect that "CPF" and "Name" fields always appear together (same presence pattern). Suggests logical groupings for future form mapping. | High | Correlation analysis (Pearson/Cramér's V). ydata-profiling includes interaction matrices. **Defer to post-MVP** — requires statistical library. |
| **Example values preview on card** | Show 2-3 sample values directly on field card (e.g., "SP, RJ, MG..."). Users validate field content without clicking. | Low | `LIMIT 3` on value query. Tableau Prep shows values in profile pane by default. Reduces clicks for simple checks. |
| **Bulk copy all values** | Copy all unique values as comma-separated or newline-separated list. Useful for creating validation lists. | Low | Join array with delimiter, write to clipboard. Add dropdown: "Copy as CSV" vs "Copy as List". |
| **Empty state guidance** | When batch has 0 rows or all fields are 100% null, show actionable message (e.g., "Upload more data to see field statistics"). | Low | Conditional rendering. Better UX than blank cards. |
| **Field rename suggestions** | Detect cell-address keys (A1, B1, C1) from PROFILE_MODE and suggest "These look like headers — did you mean to use LIST_MODE?" | Medium | Pattern detection on field names. Helps users correct upload mode mistakes. **Consider for v2.4** after mode confusion patterns emerge. |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in data profiling tools that don't align with Populatte's mission.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Statistical distribution charts (histograms, box plots)** | Great Expectations and ydata-profiling show detailed histograms. But Populatte users care about "can I map this to a form field?" not statistical analysis. | Show unique count and sample values. If user needs statistics, they'll use pandas. Our job is field-to-form mapping preparation. |
| **Editable field values** | Trifacta allows inline editing. But Populatte's source of truth is Excel — users should edit there and re-upload. Inline edits create sync problems. | Make field inventory read-only. Add "Download as Excel" if users need to export and edit. |
| **Auto-detection of data quality issues** | Tools like Soda flag "90% valid emails, 10% malformed". But Populatte doesn't own data quality — users upload client data as-is. Flagging issues implies we'll fix them (we won't). | Show type inference confidence ("70% of values match EMAIL pattern") but don't label as "error". User decides if acceptable. |
| **Pivot/aggregation features** | Tableau-style aggregations (SUM, AVG, GROUP BY). Out of scope — we're not a BI tool. | If user needs aggregations, they use Excel or BI tools. We show raw field inventory for mapping. |
| **Multi-batch comparison** | Compare field schemas across batches (e.g., "Batch A has 'Email' field, Batch B doesn't"). Useful for data lineage, but adds UI complexity. **Defer indefinitely** — single batch view is MVP. | Focus on single batch. If schema drift becomes pain point, revisit in v3.x. |
| **Automatic field mapping to form** | Tempting to add "Auto-map all fields" button. But form mapping happens in browser extension (not dashboard), and requires user context (which website?). Dashboard can't know target form. | Field inventory is preparation stage. Actual mapping happens in extension (future milestone). Keep concerns separate. |

---

## Feature Dependencies

```
Field Inventory View Dependencies:

Backend API Foundation
├── GET /batches/:id/fields/stats
│   └── Returns: [{ name, inferredType, presenceCount, uniqueCount, totalRows }]
│   └── Depends on: columnMetadata (already exists)
│
└── GET /batches/:id/fields/:fieldName/values
    └── Returns: { values: string[], totalCount: number }
    └── Depends on: rows table JSONB query with pagination

UI Components
├── FieldInventoryGrid (container)
│   ├── FieldCard (metadata display)
│   │   ├── TypeBadge (inferred type)
│   │   ├── PresenceBar (completeness visualization)
│   │   └── UniqueCountLabel
│   │
│   ├── FieldValuesSheet (side panel)
│   │   ├── SearchInput (filter values)
│   │   ├── ValueList (scrollable)
│   │   └── CopyButton (clipboard)
│   │
│   └── ViewToggle (table ↔ fields)
│
Type Inference Library
└── detectFieldType(values: string[])
    ├── Patterns: EMAIL, PHONE, DATE, CPF, CNPJ, NUMBER, BOOLEAN
    └── Returns: { type: string, confidence: number }
```

**Critical Path:**
1. Backend field stats endpoint (prerequisite for UI)
2. FieldCard component with metadata
3. View toggle in batch detail header
4. FieldValuesSheet with search and copy

**Parallel Track:**
- Type inference function (can be built alongside UI)

---

## Implementation Sequencing

**Phase 1: Backend Foundation** (prerequisite for UI)
1. Field stats endpoint (aggregate presence/unique counts)
2. Field values endpoint (fetch all values for a field)
3. Type inference function (pattern-based detection)

**Phase 2: Basic UI** (MVP field inventory)
1. FieldCard component with metadata
2. Grid layout for cards
3. View toggle in batch detail header

**Phase 3: Value Inspection** (enables exploration)
1. FieldValuesSheet component (shadcn/ui Sheet)
2. Value list with virtual scrolling (if 1000+ values)
3. Search within values (client-side filter)

**Phase 4: Polish** (improves UX)
1. Copy to clipboard with feedback
2. Completeness heatmap on cards
3. Sort/filter controls for card grid
4. Example values preview on cards

---

## MVP Recommendation

For v2.3 MVP, prioritize:

**Must Have (Table Stakes):**
1. Field cards with name + inferred type + presence count + unique count
2. Basic type inference (string, number, date, boolean)
3. Side panel showing all values for clicked field
4. Search within value list
5. Copy individual values to clipboard
6. View toggle between table and field inventory

**Defer to v2.4:**
- Completeness heatmap visualization
- Sort/filter controls for cards
- Example values preview on cards
- Bulk copy all values
- Advanced type detection (CPF, CNPJ, phone patterns)
- Field-to-field relationship hints

**Defer Indefinitely:**
- Statistical charts (histograms, box plots)
- Inline value editing
- Data quality issue flagging
- Pivot/aggregation features
- Multi-batch comparison
- Automatic field mapping

---

## User Journey: Field Inventory in Context

**Before Field Inventory (v2.2):**
1. User uploads Excel file
2. User sees batch in project list
3. User clicks batch → sees paginated table of rows × columns
4. **Problem:** Can't quickly assess "What fields do I have?" or "Which fields are complete?"

**After Field Inventory (v2.3):**
1. User uploads Excel file (LIST_MODE: client list)
2. User clicks batch → **defaults to field inventory view** (not table)
3. User sees cards: "Name (100% complete, 50 unique)", "Email (94% complete, 48 unique)", "Phone (60% complete, 35 unique)"
4. User identifies incomplete field → clicks "Phone" card
5. Side sheet opens showing all phone values + empty cells highlighted
6. User searches for specific phone number to verify data
7. User copies a sample phone value to test target form
8. User toggles to table view to see row context
9. **Next milestone (browser extension):** User maps "Phone" field to form's `#txtTelefone` input

---

## Data Model Implications

**Existing Schema (no changes needed):**
- `batches.columnMetadata` already stores field names as JSON array
- `rows.data` JSONB stores all values with field keys

**Backend Query Patterns:**
```sql
-- Field stats (presence + unique count)
SELECT
  field_key,
  COUNT(*) FILTER (WHERE value IS NOT NULL) as presence_count,
  COUNT(DISTINCT value) as unique_count,
  COUNT(*) as total_rows
FROM (
  SELECT jsonb_object_keys(data) as field_key,
         data->>field_key as value
  FROM ingestion_rows
  WHERE batch_id = :batchId AND deleted_at IS NULL
) subquery
GROUP BY field_key;

-- Field values (all values for a specific field)
SELECT DISTINCT data->>:fieldName as value
FROM ingestion_rows
WHERE batch_id = :batchId
  AND deleted_at IS NULL
  AND data->>:fieldName IS NOT NULL
ORDER BY value;
```

**Type Inference (backend helper):**
- Input: array of string values from a field
- Output: `{ type: 'EMAIL' | 'PHONE' | 'DATE' | 'NUMBER' | 'BOOLEAN' | 'STRING', confidence: number }`
- Logic: regex pattern matching with threshold (e.g., 80% match = high confidence)

---

## Performance Considerations

**Field Stats Endpoint:**
- Batch with 1,000 rows × 50 fields = 50,000 JSONB key extractions
- Use PostgreSQL JSONB operators with GIN index for performance
- **Acceptable for MVP** — if slow, add materialized field stats to batches table in v2.4

**Field Values Endpoint:**
- Field with 1,000 unique values requires DISTINCT operation
- Add pagination if uniqueCount > 500
- Virtual scrolling in UI for smooth rendering

**Type Inference:**
- Run on backend (not browser) to avoid shipping regex patterns to client
- Cache inferred types in `columnMetadata` after first query
- Re-infer only when batch data changes

---

## Accessibility & UX Notes

**Keyboard Navigation:**
- Arrow keys navigate between field cards
- Enter opens value sheet
- Escape closes sheet
- Tab + Enter focuses/activates copy buttons

**Screen Readers:**
- Announce field metadata: "Name field, string type, 50 of 50 records, 50 unique values"
- Announce completeness: "Email field, 94 percent complete"
- Copy feedback: "Value copied to clipboard"

**Mobile Responsiveness:**
- Card grid: 1 column on mobile, 2-3 on tablet, 4+ on desktop
- Value sheet: full-screen on mobile, drawer on desktop
- Search input: sticky at top of value list

---

## Testing Strategy

**Unit Tests:**
- Type inference function with sample data (emails, dates, numbers, edge cases)
- Field stats aggregation logic
- Search filter for value lists

**Integration Tests:**
- Field stats endpoint returns correct counts for LIST_MODE batch
- Field values endpoint returns distinct values only
- View toggle preserves batch context

**E2E Tests:**
1. Upload batch → verify field inventory appears
2. Click field card → verify value sheet opens with correct data
3. Search values → verify filter works
4. Copy value → verify clipboard contains expected text
5. Toggle to table view → verify same batch data shown

---

## Open Questions

1. **Should type inference run synchronously on upload or lazy-load on field inventory view?**
   - **Recommendation:** Lazy-load — type inference is optional feature, shouldn't slow batch creation

2. **How to handle fields with 10,000+ unique values?**
   - **Recommendation:** Paginate value list + add "Showing 500 of 10,000 values" message

3. **Should we persist inferred types in database or compute on-demand?**
   - **Recommendation:** Compute on-demand for MVP, cache in `columnMetadata` if performance becomes issue

4. **What's the default view for LIST_MODE vs PROFILE_MODE batches?**
   - **Recommendation:** LIST_MODE → table view (fewer columns, row-centric), PROFILE_MODE → field inventory (many columns, field-centric)

---

## Validation Against Populatte's Context

**Existing features (v2.2):**
- Batch detail with data table (rows × columns, server-side pagination)
- Batch list with metadata cards
- View already has header with breadcrumb navigation

**Integration points:**
- Add view toggle to existing batch detail header (next to breadcrumb)
- Field inventory uses same API client and React Query patterns
- Field cards follow same shadcn/ui Card pattern as batch cards

**Consistency with established patterns:**
- Card-based layouts (ProjectCard, BatchCard → FieldCard)
- Sheet/drawer for detail views (shadcn/ui Sheet)
- Search inputs (same pattern as future batch search)
- Copy buttons (Clipboard API, toast notifications)

---

## Research Sources

### Data Profiling Tools & Patterns
- [9 Data Profiling Tools That Save Hours of Cleanup in 2026](https://airbyte.com/top-etl-tools-for-sources/data-profiling-tools)
- [Best Data Profiling Tools in 2026: Full Comparison](https://www.ovaledge.com/blog/data-profiling-tools)
- [What Is Data Profiling? Process, Best Practices and Tools](https://panoply.io/analytics-stack-guide/data-profiling-best-practices/)

### ETL & Column Statistics
- [10 Best Data Lineage Tools in 2026](https://airbyte.com/top-etl-tools-for-sources/data-lineage-tools)
- [Data Validation in ETL - 2026 Guide](https://www.integrate.io/blog/data-validation-etl/)

### Data Catalog & Metadata
- [12 Best Data Catalog Tools in 2026](https://atlan.com/data-catalog-tools/)
- [Top 9 Data Catalog Tools in 2026](https://www.integrate.io/blog/data-catalog-tools/)
- [What is a Data Catalog? Definition and 2026 Guide](https://atlan.com/what-is-a-data-catalog/)

### UI Patterns
- [Data Table Design UX Patterns & Best Practices](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- [Filter UX Design Patterns & Best Practices](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering)
- [15 Filter UI Patterns That Actually Work in 2025](https://bricxlabs.com/blogs/universal-search-and-filters-ui)
- [Search Filters design pattern](https://ui-patterns.com/patterns/LiveFilter)

### View Toggle Patterns
- [Table vs List vs Cards: When to Use Each Data Display Pattern](https://uxpatterns.dev/pattern-guide/table-vs-list-vs-cards)
- [PatternFly Card view](https://www.patternfly.org/patterns/card-view/design-guidelines/)

### Copy to Clipboard
- [Clipboard API - Web APIs](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [How to copy text](https://web.dev/patterns/clipboard/copy-text)
- [Implementing copy-to-clipboard in React with Clipboard API](https://blog.logrocket.com/implementing-copy-clipboard-react-clipboard-api/)

### Type Inference & Data Detection
- [InfoTypes and infoType detectors](https://cloud.google.com/sensitive-data-protection/docs/concepts-infotypes)
- [Learn about sensitive information types](https://learn.microsoft.com/en-us/purview/sit-sensitive-information-type-learn-about)

### Missing Data Visualization
- [Visual Patterns of Missing Data](https://apxml.com/courses/intro-data-cleaning-preprocessing/chapter-2-handling-missing-data/visualizing-missing-data)
- [Visualization of missing data: a state-of-the-art survey](https://arxiv.org/html/2410.03712v1)
- [5 Ways to Visualize Missing Data](https://vanarloeyu.medium.com/5-ways-to-visualize-missing-data-4d5dc1cd081b)

### Specific Tool Documentation
- [YData Profiling (pandas-profiling)](https://github.com/ydataai/ydata-profiling)
- [Pandas Profiling (ydata-profiling) in Python: A Guide for Beginners](https://www.datacamp.com/tutorial/pandas-profiling-ydata-profiling-in-python-guide)
- [Great Expectations Data Docs](https://legacy.017.docs.greatexpectations.io/docs/0.14.13/reference/data_docs/)
- [Tableau Prep: Examine Your Data](https://help.tableau.com/current/prep/en-us/prep_explore.htm)
- [Trifacta: Overview of Visual Profiling](https://help.alteryx.com/aac/en/trifacta-classic/concepts/feature-overviews/overview-of-visual-profiling.html)
