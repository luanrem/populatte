# Populatte

> **"Do Excel para a Web, num gole de café."**

B2B SaaS platform that automates form-filling from Excel data using browser extensions and intelligent field mapping.

---

## 📋 Table of Contents

- [About](#about)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Development](#development)
- [Documentation](#documentation)

---

## 🎯 About

**Populatte** transforms the tedious process of manual data entry into automated form population. Instead of spending hours filling government or corporate forms manually, users can:

1. **Upload Excel/CSV** data through the web dashboard
2. **Map fields** using the browser extension
3. **Auto-fill forms** with a single click

### The Problem We Solve

Companies currently:
- ❌ Hire temporary workers just for data entry
- ❌ Spend nights manually filling forms under tight deadlines
- ❌ Face human errors due to fatigue
- ❌ Waste resources on repetitive manual work

### Our Solution

With Populatte:
- ✅ Upload data once, use it everywhere
- ✅ AI-powered field mapping suggestions
- ✅ Automatic form population with validation
- ✅ Track progress and manage multiple projects

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 22.0.0
- **pnpm** >= 9.0.0 (install with `npm install -g pnpm`)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd populatte

# Install dependencies
pnpm install

# Run development server
cd apps/web
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the web dashboard.

---

## 📁 Project Structure

```
populatte/
├── apps/
│   ├── web/          # Next.js Dashboard (Current)
│   ├── api/          # NestJS Backend (Coming Soon)
│   └── extension/    # Browser Extension (Coming Soon)
│
├── packages/         # Shared code (Future)
│   ├── types/        # Shared TypeScript types
│   ├── commons/      # Utilities and Zod schemas
│   ├── eslint-config/# ESLint configurations
│   └── tsconfig/     # TypeScript configurations
│
├── docs/             # Documentation
│   └── MONOREPO.md   # Monorepo architecture guide
│
├── CLAUDE.md         # AI assistant guidance
└── IDEA.md           # Product vision and concepts
```

### Current Status

- ✅ **apps/web** - Next.js 16 dashboard with Tailwind CSS and shadcn/ui
- 🚧 **apps/api** - NestJS backend (not implemented yet)
- 🚧 **apps/extension** - Chrome extension (not implemented yet)
- 🚧 **packages/** - Shared packages (not implemented yet)

---

## 🛠️ Tech Stack

### Web Dashboard (`apps/web`)

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.0.5 | React framework with App Router |
| **React** | 19.2.0 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Styling |
| **shadcn/ui** | Latest | UI component library |
| **ESLint** | 9.x | Code linting |

### Planned Backend (`apps/api`)

- **NestJS** - Backend framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **Prisma** - ORM
- **Clean Architecture** - Code organization

### Planned Extension (`apps/extension`)

- **React** - UI library
- **Vite** - Build tool
- **CRXJS** - Chrome extension plugin
- **Manifest V3** - Extension format

---

## 💻 Development

### Available Commands

```bash
# Web Dashboard
cd apps/web
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Lint code
pnpm type-check   # TypeScript type checking
```

### Adding shadcn/ui Components

```bash
cd apps/web
pnpm dlx shadcn@latest add [component-name]

# Examples:
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add dialog
```

Components are added to `apps/web/components/ui/`.

---

## 📚 Documentation

- **[MONOREPO.md](docs/MONOREPO.md)** - Detailed guide on monorepo architecture, Turborepo, and workspace management
- **[CLAUDE.md](CLAUDE.md)** - Guidance for AI assistants working on this codebase
- **[IDEA.md](IDEA.md)** - Product vision, user journey, and feature roadmap

---

## 🗺️ Roadmap

### Phase 1: Web Dashboard (Current)
- ✅ Next.js setup with TypeScript
- ✅ Tailwind CSS + shadcn/ui integration
- 🚧 Project management UI
- 🚧 Excel upload and data preview
- 🚧 User authentication

### Phase 2: Backend API
- 🚧 NestJS setup with Clean Architecture
- 🚧 PostgreSQL + Prisma
- 🚧 REST API for project/data management
- 🚧 User authentication and authorization

### Phase 3: Browser Extension
- 🚧 Chrome extension with Manifest V3
- 🚧 Field mapping interface
- 🚧 Auto-fill functionality
- 🚧 AI-powered field suggestions

### Phase 4: Monorepo Integration
- 🚧 Turborepo setup
- 🚧 Shared packages (types, commons)
- 🚧 Unified build and deployment

---

## 🤝 Contributing

This is a private project. For development guidelines:

1. Follow existing code structure and naming conventions
2. Use TypeScript strict mode
3. All code and comments in English
4. Run linting and type-checking before committing
5. Write meaningful commit messages

---

## 📄 License

Proprietary - All rights reserved

---

## 🔗 Links

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

---

**Built with ☕ by the Populatte team**
