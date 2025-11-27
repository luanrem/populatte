# Gemini Code Assistant Context

This document provides context for the Gemini code assistant to understand the Populatte project.

## Project Overview

Populatte is a B2B SaaS platform designed to automate the process of filling out web forms with data from Excel or CSV files. It consists of a web dashboard for managing data and projects, and a browser extension for mapping and populating form fields.

The project is structured as a **Turborepo** monorepo, with separate applications for the web dashboard, the backend API, and the browser extension.

**Key Technologies:**

*   **Web Dashboard (`apps/web`):** Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Clerk for authentication.
*   **Backend API (`apps/api`):** (Planned) NestJS, PostgreSQL with Prisma, following **Clean Architecture** principles.
*   **Browser Extension (`apps/extension`):** (Planned) React, Vite, CRXJS.

## Building and Running

The project uses **pnpm** as the package manager and **Turborepo** to manage the monorepo.

**Prerequisites:**

*   Node.js >= 22.0.0
*   pnpm >= 9.0.0

**Development Commands:**

1.  **Install Dependencies:**
    ```bash
    pnpm install
    ```

2.  **Run all applications in development mode:**
    ```bash
    pnpm dev
    ```

3.  **Run a specific application:**
    ```bash
    # Run the web dashboard
    pnpm dev --filter=@populatte/web

    # Run the API (when available)
    pnpm dev --filter=@populatte/api
    ```
    The web app will be available at [http://localhost:3000](http://localhost:3000).

**Other useful commands:**

*   `pnpm build`: Build all applications.
*   `pnpm lint`: Lint the entire monorepo.
*   `pnpm type-check`: Run TypeScript type checking across all packages.

## Development Conventions

The project enforces a strict and consistent development style.

*   **TypeScript:** Strict mode is enabled across the entire monorepo. Avoid using `any`.
*   **Code Style:** Follow the existing code style. The project uses ESLint and Prettier to enforce code quality and consistent formatting. Import order is also enforced.
*   **SOLID Principles:** All new code should adhere to SOLID principles.
*   **Shared Code:**
    *   **Types:** All shared TypeScript types should be defined in `packages/types`.
    *   **Utilities & Schemas:** Shared utilities and Zod validation schemas are located in `packages/commons`.

### Web App (`apps/web`) Conventions

*   **UI Components:**
    *   The primary component library is **shadcn/ui**. Before creating a custom component, always check if an equivalent exists in shadcn/ui.
    *   Add new shadcn/ui components using:
        ```bash
        cd apps/web
        pnpm dlx shadcn-ui@latest add [component-name]
        ```

*   **Component File Structure:**
    *   `components/ui/`: Exclusively for shadcn/ui components. **Do not** add custom components here.
    *   `components/layout/`: For major layout components (e.g., `app-header.tsx`, `app-sidebar.tsx`).
    *   `components/theme/`: For theme-related components (e.g., `theme-provider.tsx`, `mode-toggle.tsx`).
    *   `components/`: The root is for simple, reusable components.
    *   Feature-specific components should be organized into their own subdirectories (e.g., `components/forms/`).

*   **Authentication:** User authentication is handled by [Clerk](https://clerk.com/). The main layout in `apps/web/app/layout.tsx` separates the views for signed-in and signed-out users.

### Backend API (`apps/api`) Conventions

*   **Clean Architecture:** The API will follow a strict Clean Architecture pattern:
    *   `src/core/`: Domain logic (entities, use cases, repository interfaces).
    *   `src/infrastructure/`: External concerns (database connections, repository implementations).
    *   `src/presentation/`: The HTTP layer (controllers, DTOs).
    *   **Dependency Rule:** The `core` layer must never import from `infrastructure` or `presentation`.
