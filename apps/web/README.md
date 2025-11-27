# Populatte Web Dashboard

Next.js 15 web application for managing Excel data and form automation projects.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (Strict mode)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Icons:** Lucide React

## Getting Started

### Install Dependencies

From the root of the monorepo:

```bash
npm install
```

### Development

```bash
# From root
npm run dev --filter=@populatte/web

# Or from this directory
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Build

```bash
npm run build
```

### Production

```bash
npm run start
```

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Home page
├── components/       # React components
│   └── ui/           # shadcn/ui components
├── hooks/            # Custom React hooks
├── lib/              # Utility functions
│   └── utils.ts      # cn() helper for Tailwind
└── styles/           # Global styles
    └── globals.css   # Tailwind + CSS variables
```

## Adding shadcn/ui Components

This project is configured to use shadcn/ui. To add new components:

```bash
# From this directory
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
# etc...
```

Components will be added to `src/components/ui/`.

## Shared Packages

This app consumes shared packages from the monorepo:

- `@populatte/types` - Shared TypeScript types
- `@populatte/commons` - Utilities and Zod schemas

Import them like this:

```typescript
import { User, Project } from '@populatte/types';
import { StringUtils, createUserSchema } from '@populatte/commons';
```

## Styling

This project uses Tailwind CSS with CSS variables for theming.

### Using cn() Helper

```typescript
import { cn } from '@/lib/utils';

<div className={cn('base-class', condition && 'conditional-class')} />
```

### Dark Mode

Dark mode is configured and ready to use. Toggle with the `dark` class on the `<html>` element.

## Code Quality

```bash
# Lint
npm run lint

# Type check
npm run type-check

# Format (from root)
npm run format
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
