---
phase: quick
plan: 002
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/api/src/core/entities/project.entity.ts
  - apps/api/src/core/repositories/project.repository.ts
  - apps/api/src/core/use-cases/project/list-projects.use-case.ts
  - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-project.repository.ts
  - apps/api/src/infrastructure/database/drizzle/mappers/project.mapper.ts
  - apps/api/src/presentation/controllers/project.controller.ts
  - apps/web/lib/api/schemas/project.schema.ts
  - apps/web/lib/api/endpoints/projects.ts
autonomous: true

must_haves:
  truths:
    - "GET /projects returns only the fields needed for listing (id, name, description, status, targetEntity, targetUrl) -- no timestamps, no userId, no deletedAt"
    - "GET /projects/:id still returns the full Project entity (no regression)"
    - "The web dashboard project grid renders correctly with the slimmer response"
    - "Edit dialog pre-populates correctly from the listing data"
  artifacts:
    - path: "apps/api/src/core/entities/project.entity.ts"
      provides: "ProjectSummary interface"
      contains: "ProjectSummary"
    - path: "apps/api/src/core/repositories/project.repository.ts"
      provides: "findAllSummariesByUserId abstract method"
      contains: "findAllSummariesByUserId"
    - path: "apps/api/src/infrastructure/database/drizzle/repositories/drizzle-project.repository.ts"
      provides: "Drizzle implementation selecting only 6 columns"
      contains: "projects.id, projects.name"
    - path: "apps/web/lib/api/schemas/project.schema.ts"
      provides: "projectSummaryResponseSchema for list validation"
      contains: "projectSummaryResponseSchema"
  key_links:
    - from: "apps/api/src/presentation/controllers/project.controller.ts"
      to: "ListProjectsUseCase"
      via: "list() method returns ProjectSummary[]"
      pattern: "ProjectSummary"
    - from: "apps/web/lib/api/endpoints/projects.ts"
      to: "projectSummaryListResponseSchema"
      via: "list() validates with summary schema"
      pattern: "projectSummaryListResponseSchema"
---

<objective>
Optimize the GET /projects endpoint to return only the columns needed for the project listing grid view, reducing payload size and establishing a clean API contract for list vs detail views.

Purpose: The listing endpoint currently returns the full Project entity (including userId, createdAt, updatedAt, deletedAt) which the frontend does not use. Creating a dedicated summary type with column-level selection produces a smaller payload and clearer API contract. Note: the userId index already exists in the schema (`idx_projects_user_id`), so no indexing changes are needed.

Output: A ProjectSummary type flowing through all layers (entity -> repository -> use case -> controller -> web client) with Drizzle selecting only 6 columns.
</objective>

<execution_context>
@/Users/luanmartins/.claude/get-shit-done/workflows/execute-plan.md
@/Users/luanmartins/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/api/src/core/entities/project.entity.ts
@apps/api/src/core/repositories/project.repository.ts
@apps/api/src/core/use-cases/project/list-projects.use-case.ts
@apps/api/src/infrastructure/database/drizzle/repositories/drizzle-project.repository.ts
@apps/api/src/infrastructure/database/drizzle/mappers/project.mapper.ts
@apps/api/src/infrastructure/database/drizzle/schema/projects.schema.ts
@apps/api/src/presentation/controllers/project.controller.ts
@apps/web/lib/api/schemas/project.schema.ts
@apps/web/lib/api/endpoints/projects.ts
@apps/web/components/projects/project-card.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add ProjectSummary entity and repository method with Drizzle column selection</name>
  <files>
    apps/api/src/core/entities/project.entity.ts
    apps/api/src/core/repositories/project.repository.ts
    apps/api/src/infrastructure/database/drizzle/repositories/drizzle-project.repository.ts
    apps/api/src/infrastructure/database/drizzle/mappers/project.mapper.ts
  </files>
  <action>
    1. In `apps/api/src/core/entities/project.entity.ts`, add a new `ProjectSummary` interface below the existing `Project` interface:
       ```typescript
       export interface ProjectSummary {
         id: string;
         name: string;
         description: string | null;
         targetEntity: string | null;
         targetUrl: string | null;
         status: ProjectStatus;
       }
       ```
       These are exactly the 6 fields the frontend ProjectCard component uses. No timestamps, no userId, no deletedAt.

    2. In `apps/api/src/core/repositories/project.repository.ts`, add a new abstract method:
       ```typescript
       public abstract findAllSummariesByUserId(userId: string): Promise<ProjectSummary[]>;
       ```
       Import `ProjectSummary` from the entity file. Keep the existing `findAllByUserId` method unchanged (other code may depend on it).

    3. In `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-project.repository.ts`, implement `findAllSummariesByUserId`:
       ```typescript
       public async findAllSummariesByUserId(userId: string): Promise<ProjectSummary[]> {
         const result = await this.drizzle
           .getClient()
           .select({
             id: projects.id,
             name: projects.name,
             description: projects.description,
             targetEntity: projects.targetEntity,
             targetUrl: projects.targetUrl,
             status: projects.status,
           })
           .from(projects)
           .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)))
           .orderBy(projects.createdAt);

         return result.map((row) => ProjectMapper.toSummary(row));
       }
       ```
       Import `ProjectSummary` from the entity file.

    4. In `apps/api/src/infrastructure/database/drizzle/mappers/project.mapper.ts`, add a `toSummary` static method:
       ```typescript
       public static toSummary(row: { id: string; name: string; description: string | null; targetEntity: string | null; targetUrl: string | null; status: string }): ProjectSummary {
         return {
           id: row.id,
           name: row.name,
           description: row.description,
           targetEntity: row.targetEntity,
           targetUrl: row.targetUrl,
           status: row.status as ProjectStatus,
         };
       }
       ```
       Import `ProjectSummary` from the entity file.
  </action>
  <verify>Run `npm run type-check --filter=@populatte/api` and confirm no TypeScript errors. The new abstract method must be implemented in DrizzleProjectRepository.</verify>
  <done>ProjectSummary interface exists in core entity, repository has the new abstract method, Drizzle implementation selects exactly 6 columns, mapper has toSummary method. All existing methods remain untouched.</done>
</task>

<task type="auto">
  <name>Task 2: Wire ListProjectsUseCase to return summaries and update web client schema</name>
  <files>
    apps/api/src/core/use-cases/project/list-projects.use-case.ts
    apps/api/src/presentation/controllers/project.controller.ts
    apps/web/lib/api/schemas/project.schema.ts
    apps/web/lib/api/endpoints/projects.ts
  </files>
  <action>
    1. In `apps/api/src/core/use-cases/project/list-projects.use-case.ts`, change the return type and method call:
       - Change import from `Project` to `ProjectSummary`
       - Change return type from `Promise<Project[]>` to `Promise<ProjectSummary[]>`
       - Change the repository call from `findAllByUserId` to `findAllSummariesByUserId`
       ```typescript
       import { ProjectSummary } from '../../entities/project.entity';
       import { ProjectRepository } from '../../repositories/project.repository';

       @Injectable()
       export class ListProjectsUseCase {
         public constructor(private readonly projectRepository: ProjectRepository) {}

         public async execute(userId: string): Promise<ProjectSummary[]> {
           return this.projectRepository.findAllSummariesByUserId(userId);
         }
       }
       ```

    2. The controller (`project.controller.ts`) does NOT need changes -- it already calls `this.listProjects.execute(user.id)` and returns the result directly. The return type will naturally flow through from the use case.

    3. In `apps/web/lib/api/schemas/project.schema.ts`, add a summary schema for the list endpoint:
       - Add `projectSummaryResponseSchema` with only the 6 fields:
         ```typescript
         export const projectSummaryResponseSchema = z.object({
           id: z.string(),
           name: z.string(),
           description: z.string().nullable(),
           targetEntity: z.string().nullable(),
           targetUrl: z.string().nullable(),
           status: z.enum(['active', 'archived']),
         });

         export const projectSummaryListResponseSchema = z.array(projectSummaryResponseSchema);
         ```
       - Add the type export:
         ```typescript
         export type ProjectSummaryResponse = z.infer<typeof projectSummaryResponseSchema>;
         ```
       - Keep the existing `projectResponseSchema` and `projectListResponseSchema` unchanged (used by getById, create, update endpoints).

    4. In `apps/web/lib/api/endpoints/projects.ts`:
       - Import `projectSummaryListResponseSchema` and `ProjectSummaryResponse`
       - Change the `list()` method return type from `Promise<ProjectResponse[]>` to `Promise<ProjectSummaryResponse[]>`
       - Change the validation from `projectListResponseSchema.safeParse(data)` to `projectSummaryListResponseSchema.safeParse(data)`
       ```typescript
       async list(): Promise<ProjectSummaryResponse[]> {
         const response = await fetchFn('/projects');
         const data: unknown = await response.json();

         const result = projectSummaryListResponseSchema.safeParse(data);

         if (!result.success) {
           console.error('[API] Project list response validation failed:', result.error.issues);
           throw new Error('Invalid project list data received from server');
         }

         return result.data;
       }
       ```

    5. IMPORTANT: The web components (`project-card.tsx`, `project-grid.tsx`, `projects/page.tsx`, `project-form-dialog.tsx`, `delete-project-dialog.tsx`) currently use `ProjectResponse` as their prop type. Since `ProjectSummaryResponse` is a subset of `ProjectResponse` (it has all the fields these components actually access), you need to update the following imports:
       - In `apps/web/components/projects/project-card.tsx`: Change `ProjectResponse` import to `ProjectSummaryResponse`, update the interface and callbacks
       - In `apps/web/components/projects/project-grid.tsx`: Change `ProjectResponse` import to `ProjectSummaryResponse`, update the interface and callbacks
       - In `apps/web/app/(platform)/projects/page.tsx`: Change `ProjectResponse` import to `ProjectSummaryResponse`, update all `useState<ProjectResponse | null>` to `useState<ProjectSummaryResponse | null>`, and update function parameter types
       - In `apps/web/components/projects/project-form-dialog.tsx`: Change `ProjectResponse` import to `ProjectSummaryResponse`, update the interface prop type
       - In `apps/web/components/projects/delete-project-dialog.tsx`: Change `ProjectResponse` import to `ProjectSummaryResponse`, update the interface prop type
       - Also update the `useProjects` hook return type if it exists in `apps/web/lib/query/hooks/use-projects.ts`

    NOTE: The edit form dialog pre-populates `name`, `description`, `targetEntity`, `targetUrl` from the project object -- all of which are present in `ProjectSummaryResponse`. No data loss.
  </action>
  <verify>
    1. Run `npm run type-check --filter=@populatte/api` -- no errors
    2. Run `npm run type-check --filter=@populatte/web` -- no errors (confirms all frontend components accept the summary type)
    3. Run `npm run lint --filter=@populatte/api` -- no lint errors
    4. Run `npm run lint --filter=@populatte/web` -- no lint errors
    5. Run `npm run build` -- full monorepo builds successfully
  </verify>
  <done>
    - ListProjectsUseCase returns ProjectSummary[] via findAllSummariesByUserId
    - GET /projects endpoint returns only {id, name, description, targetEntity, targetUrl, status} per project
    - GET /projects/:id still returns full Project (unchanged)
    - Web client validates list response with projectSummaryResponseSchema
    - All frontend components compile and render correctly with ProjectSummaryResponse
    - Full monorepo builds and type-checks without errors
  </done>
</task>

</tasks>

<verification>
1. `npm run type-check` passes for both api and web workspaces
2. `npm run lint` passes for both api and web workspaces
3. `npm run build` succeeds for the full monorepo
4. Manual verification: Start the dev server (`npm run dev`), navigate to the projects page, confirm projects render correctly in the grid (name, description, status badge, targetEntity badge, targetUrl badge all display)
5. Manual verification: Click edit on a project, confirm the form pre-populates with name, description, targetEntity, targetUrl
6. Manual verification: Archive/unarchive a project, confirm it works
</verification>

<success_criteria>
- GET /projects returns exactly 6 fields per project: id, name, description, targetEntity, targetUrl, status
- GET /projects/:id continues to return the full Project entity with all fields
- No TypeScript errors across the monorepo
- No lint errors across the monorepo
- Dashboard project grid renders identically to before (no visual regression)
- Edit and archive flows work unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/002-optimize-project-listing-performance/002-SUMMARY.md`
</output>
