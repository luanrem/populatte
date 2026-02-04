# Phase 32: Dashboard Mapping Editor - Research

**Researched:** 2026-02-04
**Domain:** React form management, drag-and-drop UI, Next.js dashboard page
**Confidence:** HIGH

## Summary

This phase builds a comprehensive mapping editor for managing mapping properties (name, URL, active status, success trigger) and steps (CRUD operations with drag-and-drop reordering). The technical foundation combines React Hook Form with Zod validation for form state management, dnd-kit for accessible drag-and-drop, shadcn/ui components for UI consistency, and TanStack Query for data synchronization with optimistic updates.

The codebase already has established patterns: TanStack Query hooks for API communication with query invalidation on mutations, shadcn/ui Form components wrapping React Hook Form, Zod schemas for validation, and a clean separation between API endpoints, query hooks, and UI components. The backend API is fully implemented with mapping update, step CRUD, and step reordering endpoints.

**Primary recommendation:** Use @dnd-kit/sortable for step reordering, shadcn/ui Collapsible for property sections, React Hook Form with existing Form components for all editable fields, and implement unsaved changes detection with beforeunload event and Next.js router interception using next-navigation-guard.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Hook Form | ^7.71.1 | Form state management | Already in use; minimal re-renders, uncontrolled components, excellent TypeScript support |
| @hookform/resolvers | ^5.2.2 | Zod integration for RHF | Already installed; bridges Zod schemas to React Hook Form validation |
| Zod | ^4.3.6 | Runtime validation | Already in use across codebase; type-safe schemas, server-client validation sharing |
| @dnd-kit/core | Latest | Drag-and-drop foundation | Modern, lightweight (10kb), accessible, touch/keyboard/pointer support |
| @dnd-kit/sortable | Latest | Sortable list preset | Purpose-built for reordering lists, includes arrayMove utility, handles edge cases |
| @tanstack/react-query | ^5.90.20 | Server state management | Already in use; handles caching, optimistic updates, invalidation patterns |
| shadcn/ui | Current | UI component library | Project standard; accessible, themeable, customizable |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-navigation-guard | Latest | Router navigation interception | Detect unsaved changes during SPA navigation in Next.js App Router |
| sonner | ^2.0.7 | Toast notifications | Already in use; feedback for save success/failure |
| lucide-react | ^0.555.0 | Icons | Already in use; action type icons, drag handles, edit/delete buttons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/sortable | react-beautiful-dnd | RBD is now maintained as hello-pangea/dnd fork; dnd-kit is more modern and lighter |
| @dnd-kit/sortable | HTML5 drag-drop API | Native API doesn't support touch devices properly |
| next-navigation-guard | Custom implementation | Library handles App Router complexities; custom code prone to edge cases |

**Installation:**
```bash
# From apps/web directory
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install next-navigation-guard

# Add shadcn/ui components (if not already installed)
pnpm dlx shadcn@latest add collapsible
pnpm dlx shadcn@latest add switch
pnpm dlx shadcn@latest add combobox
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/app/(platform)/mappings/[mappingId]/
├── page.tsx                          # Main editor page (client component)
└── _components/                      # Page-specific components
    ├── mapping-properties-section.tsx   # Properties form with collapsible cards
    ├── steps-section.tsx                # Steps list with drag-and-drop
    ├── step-card.tsx                    # Individual step display card
    ├── step-editor-modal.tsx            # Step create/edit modal
    └── unsaved-changes-guard.tsx        # Navigation guard wrapper

apps/web/lib/query/hooks/
├── use-mappings.ts                   # Add useMapping, useUpdateMapping hooks
└── use-steps.ts                      # Create new file for step hooks

apps/web/lib/api/endpoints/
├── mappings.ts                       # Add getById, update endpoints
└── steps.ts                          # Create new file for step endpoints

apps/web/lib/api/schemas/
├── mapping.schema.ts                 # Add single mapping response schema
└── step.schema.ts                    # Create new file for step schemas
```

### Pattern 1: Form State with Unsaved Changes Detection
**What:** Track form dirty state and warn users before leaving page with unsaved changes
**When to use:** Any form with explicit save button (not auto-save)
**Example:**
```typescript
// Source: Project pattern from use-batches.ts + WebSearch research
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';

export function MappingEditor() {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(mappingSchema),
    defaultValues: { /* from API */ },
  });

  const { isDirty } = form.formState;

  // Browser navigation (close tab, reload, external navigation)
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // Next.js SPA navigation (use next-navigation-guard)
  // See next-navigation-guard docs for App Router implementation

  return (/* form UI */);
}
```

### Pattern 2: Sortable List with Drag-and-Drop
**What:** Reorderable step cards with touch/keyboard support and optimistic updates
**When to use:** User needs to reorder items in a list
**Example:**
```typescript
// Source: https://docs.dndkit.com/presets/sortable
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableStepCard({ step, index }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div {...listeners} className="drag-handle">
        {/* Drag handle icon */}
      </div>
      {/* Step card content */}
    </div>
  );
}

function StepsSection({ steps, onReorder }) {
  const [items, setItems] = useState(steps.map(s => s.id));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,      // Long press for touch
        tolerance: 5,
      },
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        // Mark form as dirty, actual save happens on explicit Save button
        return reordered;
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((id, index) => {
          const step = steps.find(s => s.id === id);
          return <SortableStepCard key={id} step={step} index={index} />;
        })}
      </SortableContext>
    </DndContext>
  );
}
```

### Pattern 3: shadcn/ui Form with Inline Validation
**What:** React Hook Form + shadcn Form components with field-level error display
**When to use:** Any editable form field with validation
**Example:**
```typescript
// Source: apps/web/components/ui/form.tsx (project file)
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no minimo 3 caracteres'),
  targetUrl: z.string().url('URL invalida'),
});

function MappingPropertiesSection() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', targetUrl: '' },
  });

  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage /> {/* Auto-displays validation errors */}
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="targetUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Alvo</FormLabel>
              <FormControl>
                <Input {...field} type="url" />
              </FormControl>
              <FormDescription>
                A extensao ativara em qualquer URL que comece com este endereco.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
```

### Pattern 4: TanStack Query Mutation with Optimistic Update
**What:** Update mapping/steps with immediate UI feedback before server confirms
**When to use:** User actions that modify data (update mapping, reorder steps)
**Example:**
```typescript
// Source: Project pattern from apps/web/lib/query/hooks/use-batches.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUpdateMapping(projectId: string) {
  const client = useApiClient();
  const endpoints = createMappingEndpoints(client.fetch);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mappingId, data }) =>
      endpoints.update(projectId, mappingId, data),
    onSuccess: (_data, variables) => {
      // Invalidate queries to refetch latest data
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'mappings', variables.mappingId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'mappings'],
      });
    },
  });
}

export function useReorderSteps(mappingId: string) {
  const client = useApiClient();
  const endpoints = createStepEndpoints(client.fetch);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderedStepIds: string[]) =>
      endpoints.reorder(mappingId, { orderedStepIds }),
    // Optimistic update: update UI immediately
    onMutate: async (orderedStepIds) => {
      // Cancel ongoing queries to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: ['mappings', mappingId, 'steps'],
      });

      // Snapshot previous value for rollback
      const previousSteps = queryClient.getQueryData([
        'mappings',
        mappingId,
        'steps',
      ]);

      // Optimistically update cache
      queryClient.setQueryData(['mappings', mappingId, 'steps'], (old) => {
        // Reorder steps based on orderedStepIds
        return reorderSteps(old, orderedStepIds);
      });

      return { previousSteps };
    },
    // Rollback on error
    onError: (_err, _variables, context) => {
      queryClient.setQueryData(
        ['mappings', mappingId, 'steps'],
        context?.previousSteps
      );
    },
    // Always refetch to sync with server
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ['mappings', mappingId, 'steps'],
      });
    },
  });
}
```

### Pattern 5: Collapsible Property Cards
**What:** Group related form fields in expandable/collapsible cards
**When to use:** Multiple sections of form fields to reduce visual clutter
**Example:**
```typescript
// Source: https://ui.shadcn.com/docs/components/collapsible
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChevronDown } from 'lucide-react';

function MappingPropertiesSection() {
  return (
    <div className="space-y-4">
      <Collapsible defaultOpen>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50">
              <CardTitle className="flex items-center justify-between">
                Informacoes Basicas
                <ChevronDown className="h-4 w-4 transition-transform" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {/* Name and URL fields */}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible defaultOpen>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50">
              <CardTitle className="flex items-center justify-between">
                Comportamento
                <ChevronDown className="h-4 w-4 transition-transform" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {/* Active toggle and success trigger fields */}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Auto-save without user control**: User explicitly requested a Save button, not auto-save. Don't trigger mutations on every field change.
- **Ignoring isDirty in beforeunload dependency array**: This causes stale closure - beforeunload won't see updated isDirty value.
- **Using HTML5 drag-drop API directly**: No touch support, poor mobile experience. Always use dnd-kit.
- **Forgetting to cancel queries in optimistic updates**: Ongoing requests can overwrite optimistic UI changes.
- **Validating on every keystroke**: Validate on blur for better UX, only validate on change after field has been touched.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop for reordering | Custom mouse/touch event handlers | @dnd-kit/sortable | Handles touch, keyboard, accessibility, placeholder animation, auto-scroll, collision detection |
| Form state management | useState for each field | React Hook Form | Handles validation, dirty state, touched fields, error messages, re-render optimization |
| Runtime validation | Custom validation functions | Zod schemas with zodResolver | Type-safe, reusable on server/client, excellent error messages |
| Unsaved changes warning | Custom router.push interception | next-navigation-guard | Handles both browser navigation and Next.js App Router SPA navigation |
| Combobox with search | Custom select with filter | shadcn/ui Combobox | Keyboard navigation, screen reader support, virtualization for large lists |

**Key insight:** Drag-and-drop has extreme complexity for proper implementation - touch long-press, keyboard spacebar/arrows, screen reader announcements, smooth animations, placeholder rendering, auto-scroll near edges, collision detection algorithms. @dnd-kit/sortable handles all these edge cases. Custom implementation will miss touch support or accessibility.

## Common Pitfalls

### Pitfall 1: Stale Closure in beforeunload Event
**What goes wrong:** beforeunload event handler doesn't see updated isDirty value, warns user even when form is clean
**Why it happens:** useEffect captures isDirty value at registration time, doesn't update when isDirty changes
**How to avoid:** Include isDirty in useEffect dependency array and remove/re-add listener when it changes
**Warning signs:** User gets "unsaved changes" warning even after saving form

### Pitfall 2: Drag Handle Not Keyboard Accessible
**What goes wrong:** Users can't reorder steps using keyboard (violates WCAG 2.5.7)
**Why it happens:** Only attaching listeners to mouse/touch events, no keyboard sensor configured
**How to avoid:** Add KeyboardSensor with sortableKeyboardCoordinates to useSensors array
**Warning signs:** Tab key doesn't focus drag handle, spacebar doesn't grab item

### Pitfall 3: Optimistic Update Overwritten by In-Flight Request
**What goes wrong:** User drags step, sees it move, then it jumps back to original position
**Why it happens:** Didn't cancel ongoing queries before optimistic update; stale request finishes and overwrites cache
**How to avoid:** Call await queryClient.cancelQueries before setQueryData in onMutate
**Warning signs:** UI flickers or reverts after mutation

### Pitfall 4: Form Reset Doesn't Clear Dirty State
**What goes wrong:** After successful save, form still shows as dirty (isDirty = true)
**Why it happens:** form.reset() not called after mutation success, or called with wrong values
**How to avoid:** Call form.reset(savedData) in mutation onSuccess callback to sync with server state
**Warning signs:** Save button stays enabled, unsaved changes warning appears after saving

### Pitfall 5: Drag-and-Drop Breaks on Touch Devices
**What goes wrong:** Step cards don't drag on mobile, or trigger click instead of drag
**Why it happens:** TouchSensor not configured with activationConstraint delay
**How to avoid:** Add TouchSensor with delay: 250ms to distinguish tap from drag intent
**Warning signs:** Mobile users report "can't reorder steps" or "edit modal opens instead of dragging"

### Pitfall 6: Step Numbers Don't Update After Drag
**What goes wrong:** After reordering, step cards show old numbers (Step 1, 3, 2 instead of 1, 2, 3)
**Why it happens:** Rendering index from original array instead of reordered array
**How to avoid:** Map over reordered items array and use map index + 1 as step number
**Warning signs:** Visual step numbers don't match logical order after drag

### Pitfall 7: Validation Errors Too Aggressive
**What goes wrong:** Red error borders appear immediately on page load before user touches field
**Why it happens:** Default validation mode is onSubmit, but errors are shown immediately
**How to avoid:** Use mode: 'onBlur' or mode: 'onTouched' in useForm config for gentler validation timing
**Warning signs:** User sees error messages before typing anything

### Pitfall 8: Combobox Doesn't Show All Excel Columns
**What goes wrong:** Source column dropdown only shows first 20 columns, user can't find their column
**Why it happens:** Not implementing virtualization or pagination for large column lists
**How to avoid:** Use shadcn Combobox with proper items prop containing all columns, component handles rendering
**Warning signs:** User reports "my column doesn't appear in the list"

## Code Examples

Verified patterns from official sources:

### Step Editor Modal with Toggle Switch and Combobox
```typescript
// Source: https://ui.shadcn.com/docs/components/radix/combobox + project patterns
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Combobox, ComboboxInput, ComboboxContent, ComboboxEmpty, ComboboxList, ComboboxItem } from '@/components/ui/combobox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const stepSchema = z.object({
  action: z.enum(['fill', 'click', 'wait']),
  selector: z.object({
    type: z.enum(['css', 'xpath']),
    value: z.string().min(1, 'Seletor obrigatorio'),
  }),
  sourceFieldKey: z.string().optional(),
  fixedValue: z.string().optional(),
  optional: z.boolean().default(false),
  clearBefore: z.boolean().default(false),
  pressEnter: z.boolean().default(false),
}).refine(
  (data) => {
    // Can't have both sourceFieldKey and fixedValue
    const hasSource = data.sourceFieldKey && data.sourceFieldKey !== '';
    const hasFixed = data.fixedValue && data.fixedValue !== '';
    return !(hasSource && hasFixed);
  },
  { message: 'Cannot provide both source column and fixed value' }
);

function StepEditorModal({ open, onClose, step, excelColumns }) {
  const form = useForm({
    resolver: zodResolver(stepSchema),
    defaultValues: step || {
      action: 'fill',
      selector: { type: 'css', value: '' },
      sourceFieldKey: '',
      fixedValue: '',
      optional: false,
      clearBefore: false,
      pressEnter: false,
    },
  });

  const [useFixedValue, setUseFixedValue] = useState(!!step?.fixedValue);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{step ? 'Editar Passo' : 'Novo Passo'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Action type field */}

            {/* Selector field */}

            {/* Source type toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                checked={useFixedValue}
                onCheckedChange={setUseFixedValue}
              />
              <Label>Usar valor fixo</Label>
            </div>

            {/* Conditional field based on toggle */}
            {useFixedValue ? (
              <FormField
                control={form.control}
                name="fixedValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Fixo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="sourceFieldKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coluna de Origem</FormLabel>
                    <FormControl>
                      <Combobox
                        items={excelColumns}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <ComboboxInput placeholder="Buscar coluna..." />
                        <ComboboxContent>
                          <ComboboxEmpty>Nenhuma coluna encontrada</ComboboxEmpty>
                          <ComboboxList>
                            {(column) => (
                              <ComboboxItem key={column} value={column}>
                                {column}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Option checkboxes */}
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="optional"
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Label>Opcional (pular se nao encontrado)</Label>
                  </div>
                )}
              />
              <FormField
                control={form.control}
                name="clearBefore"
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Label>Limpar antes de preencher</Label>
                  </div>
                )}
              />
              <FormField
                control={form.control}
                name="pressEnter"
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Label>Pressionar Enter apos preencher</Label>
                  </div>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                {step ? 'Salvar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### Drag Handle with Visual Feedback
```typescript
// Source: dnd-kit documentation + CONTEXT decisions
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';

function StepCard({ step, index }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Action type colors
  const actionColors = {
    fill: 'border-l-blue-500',
    click: 'border-l-green-500',
    wait: 'border-l-yellow-500',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={`
          ${actionColors[step.action]}
          border-l-4
          ${isDragging ? 'shadow-lg opacity-50' : 'shadow-sm'}
        `}
      >
        <div className="flex items-center gap-3 p-4">
          {/* Drag handle - always on left edge */}
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Step number */}
          <span className="text-sm font-medium text-muted-foreground">
            {index + 1}
          </span>

          {/* Action type icon */}
          <ActionIcon action={step.action} />

          {/* Selector (monospace, truncated) */}
          <code className="flex-1 truncate text-sm">
            {step.selector.value}
          </code>

          {/* Source column */}
          {step.sourceFieldKey && (
            <span className="text-sm text-muted-foreground">
              {step.sourceFieldKey}
            </span>
          )}

          {/* Edit and delete buttons */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(step)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(step.id)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit/core + sortable | 2021-2022 | Lighter bundle, better touch support, more flexible |
| Formik | React Hook Form | 2020-2021 | Less re-renders, smaller bundle, better TypeScript |
| Yup | Zod | 2022-2023 | Better TypeScript inference, runtime + compile-time types |
| Pages Router routeChangeStart | App Router with navigation guards | 2023-2024 | No global events in App Router, need library or custom solution |

**Deprecated/outdated:**
- react-beautiful-dnd: No longer maintained by Atlassian (fork exists as hello-pangea/dnd)
- HTML5 drag-and-drop API: Works but doesn't support touch devices
- Custom router.push wrapping: Next.js App Router changed navigation model

## Open Questions

Things that couldn't be fully resolved:

1. **Exact API response for GET /mappings/:mappingId with steps included**
   - What we know: Mapping entity exists, steps have separate endpoints, GET /mappings/:mappingId exists
   - What's unclear: Does getById return steps array or require separate GET /mappings/:mappingId/steps call?
   - Recommendation: Check API response or ask backend team; if separate endpoint needed, create useSteps hook with ['mappings', mappingId, 'steps'] query key

2. **Excel columns source for step editor combobox**
   - What we know: Need searchable dropdown of Excel column names for sourceFieldKey
   - What's unclear: Where to get column list - from batch field stats, from project metadata, or passed as prop?
   - Recommendation: Most likely from batch.fieldStats or project.excelColumns if available; check existing batch detail page implementation

3. **Success trigger field component design**
   - What we know: Field has type dropdown (SuccessTrigger enum) + optional selector value
   - What's unclear: Should selector field be always visible or conditional on trigger type?
   - Recommendation: Show selector field only for ElementDisappears and TextAppears triggers (not for UrlChange)

## Sources

### Primary (HIGH confidence)
- @dnd-kit/sortable documentation - https://docs.dndkit.com/presets/sortable - Sortable preset API, sensors, arrayMove utility
- shadcn/ui Collapsible - https://ui.shadcn.com/docs/components/collapsible - Collapsible component usage
- shadcn/ui Combobox - https://ui.shadcn.com/docs/components/radix/combobox - Searchable select with filtering
- Project codebase - apps/web/lib/query/hooks/use-batches.ts - TanStack Query patterns
- Project codebase - apps/web/components/ui/form.tsx - React Hook Form + shadcn integration
- Project codebase - apps/api/src/presentation/controllers/mapping.controller.ts - Available endpoints
- Project codebase - apps/api/src/presentation/controllers/step.controller.ts - Step CRUD and reorder endpoints
- Project codebase - apps/api/src/core/entities/step.entity.ts - Step data structure
- Project codebase - apps/api/src/core/entities/mapping.entity.ts - Mapping data structure

### Secondary (MEDIUM confidence)
- [Top 5 Drag-and-Drop Libraries for React in 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) - dnd-kit recommendation and comparison
- [React Hook Form with Zod: Complete Guide for 2026](https://dev.to/marufrahmanlive/react-hook-form-with-zod-complete-guide-for-2026-1em1) - Best practices for RHF + Zod
- [How-to handle unsaved page changes with NextJS app router](https://medium.com/@jonjamesdesigns/how-to-handle-unsaved-page-changes-with-nextjs-app-router-65b74f1148de) - App Router navigation guard pattern
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) - Mutation with onMutate, rollback
- [React form validation patterns inline errors 2026 best practices](https://daily.dev/blog/form-on-react-best-practices) - Validation timing strategy

### Tertiary (LOW confidence)
- [Drag-and-Drop UX: Guidelines and Best Practices](https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/) - UX patterns and pitfalls
- [Why most drag and drop UIs fail accessibility](https://medium.com/@subux.contact/why-most-drag-and-drop-uis-fail-accessibility-and-how-to-fix-yours-1faeab06942a) - Accessibility concerns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified in project package.json or official docs, versions confirmed
- Architecture: HIGH - Patterns extracted from existing project code and official library documentation
- Pitfalls: MEDIUM - Based on combination of project experience and WebSearch-verified best practices

**Research date:** 2026-02-04
**Valid until:** 2026-03-06 (30 days - stable stack, no fast-moving dependencies)
