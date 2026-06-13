---
status: diagnosed
trigger: "Batch card action buttons (settings, delete) are too small and poorly positioned"
created: 2026-02-04T12:00:00Z
updated: 2026-02-04T12:00:00Z
---

## Current Focus

hypothesis: Button size (icon-xs = 24px/6 units) combined with inline positioning makes them hard to see and use
test: Analyzed batch-card.tsx and button.tsx
expecting: Confirmed layout/sizing issues
next_action: Return diagnosis

## Symptoms

expected: Action buttons should be clearly visible, appropriately sized, and positioned in a standard location (top-right or bottom-right)
actual: Buttons use icon-xs size (24px square with 12px icons), positioned inline with chevron in the middle-right of card
errors: N/A (cosmetic issue)
reproduction: View any batch card in the batches list
started: From initial implementation

## Evidence

- timestamp: 2026-02-04T12:00:00Z
  checked: batch-card.tsx lines 92-126
  found: |
    1. Buttons use size="icon-xs" which renders as 24px square (size-6)
    2. Icons inside are h-4 w-4 (16px) but icon-xs forces them to size-3 (12px)
    3. Buttons are positioned in a flex container with the ChevronRight icon
    4. The action buttons div has opacity-0 by default, only showing on hover
    5. Layout is horizontal: [left content] --- [settings] [delete] [chevron]
  implication: The icon-xs size is too small for comfortable clicking, and the chevron icon adds visual noise/confusion

- timestamp: 2026-02-04T12:00:00Z
  checked: button.tsx lines 28-31
  found: |
    icon-xs: "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3"
    This means:
    - Button is 24px x 24px (size-6)
    - SVG icons are forced to 12px (size-3) unless they have explicit size class
  implication: The icon-xs variant is designed for very compact UIs, not primary action buttons

## Resolution

root_cause: Action buttons use icon-xs size (24px with 12px icons) and are positioned inline next to a semantically confusing chevron, making them too small and poorly placed
fix: Empty - diagnosis only
verification: Empty - diagnosis only
files_changed: []
