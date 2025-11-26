# Populatte

B2B SaaS Monorepo built with TypeScript, Turborepo, and NPM Workspaces.

## Project Structure

```
populatte/
├── apps/
│   ├── api/          # NestJS Backend (Clean Architecture)
│   ├── web/          # Next.js Web Dashboard (App Router)
│   └── extension/    # Browser Extension (React + Vite + CRXJS)
└── packages/
    ├── types/        # Shared TypeScript types
    ├── commons/      # Shared utilities and Zod schemas
    ├── eslint-config/# Shared ESLint configurations
    └── tsconfig/     # Shared TypeScript configurations
```

## Tech Stack

- **Monorepo:** Turborepo + NPM Workspaces
- **Language:** TypeScript (Strict mode)
- **Backend:** NestJS with Clean Architecture
- **Web:** Next.js (App Router)
- **Extension:** React + Vite + CRXJS
- **Linting:** ESLint + Prettier

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- NPM >= 9.0.0

### Installation

```bash
# Install dependencies for all workspaces
npm install
```

### Development

```bash
# Run all apps in development mode
npm run dev

# Run specific app
npm run dev --filter=@populatte/api
npm run dev --filter=@populatte/web
npm run dev --filter=@populatte/extension
```

### Build

```bash
# Build all apps
npm run build

# Build specific app
npm run build --filter=@populatte/api
```

### Linting & Formatting

```bash
# Lint all workspaces
npm run lint

# Format all files
npm run format

# Check formatting
npm run format:check
```

### Type Checking

```bash
# Type check all workspaces
npm run type-check
```

## Workspace Structure

### Apps

- **`@populatte/api`**: NestJS backend following Clean Architecture principles
- **`@populatte/web`**: Next.js web dashboard using App Router
- **`@populatte/extension`**: Browser extension built with React and Vite

### Shared Packages

- **`@populatte/types`**: Pure TypeScript interfaces and types
- **`@populatte/commons`**: Shared utilities and Zod validation schemas
- **`@populatte/eslint-config`**: Shared ESLint configurations
  - `@populatte/eslint-config/base`: Base configuration
  - `@populatte/eslint-config/nest`: NestJS-specific rules
  - `@populatte/eslint-config/next`: Next.js-specific rules
  - `@populatte/eslint-config/react`: React-specific rules
- **`@populatte/tsconfig`**: Shared TypeScript configurations
  - `@populatte/tsconfig/base.json`: Base configuration
  - `@populatte/tsconfig/nest.json`: NestJS-specific settings
  - `@populatte/tsconfig/next.json`: Next.js-specific settings
  - `@populatte/tsconfig/react.json`: React-specific settings

## Architecture Principles

This project strictly follows SOLID principles:

- **Single Responsibility Principle (SRP)**: Each module has one reason to change
- **Open/Closed Principle (OCP)**: Open for extension, closed for modification
- **Liskov Substitution Principle (LSP)**: Subtypes must be substitutable for base types
- **Interface Segregation Principle (ISP)**: Many specific interfaces over one general interface
- **Dependency Inversion Principle (DIP)**: Depend on abstractions, not concretions

## Clean Architecture (NestJS API)

The API follows Clean Architecture with three main layers:

- **Core Layer** (`src/core/`): Domain entities, value objects, and use cases
- **Infrastructure Layer** (`src/infrastructure/`): Database, external services, repositories
- **Presentation Layer** (`src/presentation/`): Controllers, DTOs, middleware

## Contributing

1. Follow the existing code structure and naming conventions
2. Use the shared ESLint and TypeScript configurations
3. Ensure all code is in English
4. Run linting and type-checking before committing
5. Write meaningful commit messages

## License

Proprietary - All rights reserved
