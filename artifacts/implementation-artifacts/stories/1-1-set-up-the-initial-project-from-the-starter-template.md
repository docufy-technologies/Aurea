# Story 1.1: Set up the initial project from the starter template

**Status**: ready-for-dev
**Story ID**: 1.1
**Story Key**: 1-1-set-up-the-initial-project-from-the-starter-template
**Epic**: Epic 1 - Access, Accounts, and Trust
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As the development team,**
**I want the project initialized from the approved starter template,**
**So that the implementation begins from the required monorepo and stack foundation.**

### Business Context

This is the foundational story that establishes the entire project structure. All subsequent stories depend on having this monorepo foundation in place. The starter template is mandatory to ensure consistency across all packages and to support the specific technical requirements defined in the architecture document.

### Acceptance Criteria

1. **Given** the project has not been initialized
   **When** setup begins
   **Then** the pnpm workspace monorepo structure is created
   **And** the web, server, and shared packages are initialized according to architecture

2. **Given** the starter stack is applied
   **When** dependencies and baseline configuration are added
   **Then** React 19, Vite, Express, Prisma, Tailwind CSS, and shadcn/ui are set up as required
   **And** the workspace is ready for feature implementation

---

## Technical Requirements

### Core Dependencies and Versions

| Package | Version | Purpose |
|---------|---------|---------|
| pnpm | Latest (workspace) | Package manager |
| react | 19 | Frontend framework |
| typescript | 5.x | Type safety |
| vite | 6.x | Frontend build tool |
| express | 5.x | Backend framework |
| prisma | 7.x | ORM |
| tailwindcss | 4.x | Styling |
| shadcn/ui | latest | UI components |

### Database

- PostgreSQL via Supabase (recommended) or Neon
- Prisma schema with entities: User, Product, Variant, Inventory, Cart, Order, Payment, Address
- UUID primary keys
- Soft deletes for audit trails

### Monorepo Structure Requirements

The project MUST follow this exact structure:

```
aurea/                            # Root - pnpm workspace
├── package.json                   # Root package.json
├── pnpm-workspace.yaml           # pnpm workspaces config
├── .env                          # Root environment (shared)
├── .env.example
├── docker-compose.yml            # Local development
└── packages/
    ├── web/                      # React 19 + TypeScript + Vite
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── vite.config.ts
    │   ├── tailwind.config.js
    │   ├── postcss.config.js
    │   ├── index.html
    │   ├── public/
    │   └── src/
    │       ├── main.tsx
    │       ├── App.tsx
    │       ├── index.css
    │       ├── components/
    │       ├── features/
    │       ├── hooks/
    │       ├── lib/
    │       ├── stores/
    │       ├── pages/
    │       └── types/
    │
    ├── server/                   # Express + TypeScript + Prisma
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── .env
    │   ├── prisma/
    │   │   ├── schema.prisma
    │   │   └── migrations/
    │   └── src/
    │       ├── main.ts
    │       ├── app.ts
    │       ├── config/
    │       ├── controllers/
    │       ├── services/
    │       ├── repositories/
    │       ├── middleware/
    │       ├── utils/
    │       ├── types/
    ��       └── routes/
    │
    └── shared/                   # Shared types and utilities
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── types/
            └── utils/
```

### API Requirements

- Base URL: `/api/v1/`
- Response wrapper format: `{ success: boolean, data: T, metadata?: object }`
- Error format: `{ success: false, error: { code: string, message: string } }`

### Authentication Structure

- JWT with refresh token rotation
- Access token expiry: 30 minutes
- Refresh token: 30 days with remember me
- bcrypt for password hashing

### Project Files to Create

**Root level:**
- `package.json` - Root package with pnpm workspaces
- `pnpm-workspace.yaml` - Workspace configuration
- `.env` - Environment variables template
- `.env.example` - Example environment file
- `docker-compose.yml` - Local development database
- `README.md` - Project documentation

**packages/web/**
- `package.json` with React 19, Vite, Tailwind dependencies
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `index.html` - Entry HTML file
- `src/main.tsx` - React entry point
- `src/App.tsx` - Main application component
- `src/index.css` - Tailwind imports and base styles

**packages/server/**
- `package.json` with Express, Prisma dependencies
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment configuration
- `prisma/schema.prisma` - Database schema with all entities
- `src/main.ts` - Express entry point
- `src/app.ts` - Express application setup

**packages/shared/**
- `package.json` - Type definitions package
- `tsconfig.json` - TypeScript configuration
- `src/types/` - Shared type definitions

---

## Architecture Compliance

### MUST Follow

1. **Package Manager**: pnpm only - never npm or yarn
2. **Naming Conventions**:
   - Tables: snake_case, plural (e.g., `users`, `products`)
   - Columns: snake_case (e.g., `user_id`, `created_at`)
   - API endpoints: plural resources (`/api/v1/users`)
   - Components: PascalCase
   - Files: kebab-case
3. **Database**:
   - Use Prisma with PostgreSQL
   - Follow schema.prisma conventions
   - Use UUIDs for primary keys
4. **API Response Format**:
   - Always wrap responses: `{ success: boolean, data: T }`
   - Use error codes, not just messages
5. **State Management**:
   - TanStack Query for server state
   - Zustand for UI state
   - React Context for auth state

### Security Requirements

- Helmet.js for security headers
- CORS configuration
- Zod for input validation
- Rate limiting (5 failed attempts = 30-minute lockout)
- Environment variable secrets management

### Development Enablement

This story establishes the foundation that ALL subsequent stories depend on. The workspace must be immediately ready for:
- Running `pnpm install` successfully
- Starting dev server with `pnpm dev` in web package
- Starting backend with `pnpm dev` in server package
- TypeScript compilation without errors
- Basic routing and API health check endpoints

---

## Implementation Checklist

- [ ] Create root `package.json` with pnpm workspace config
- [ ] Create `pnpm-workspace.yaml`
- [ ] Create `.env` and `.env.example`
- [ ] Create `docker-compose.yml` for local PostgreSQL
- [ ] Create packages/web with Vite + React 19 + TypeScript
- [ ] Configure Tailwind CSS 4.x in web package
- [ ] Set up shadcn/ui (initialize with button, input, card components)
- [ ] Set up basic React Router with home route
- [ ] Create packages/server with Express + TypeScript
- [ ] Initialize Prisma with schema (User, Product, Variant, Inventory, Cart, Order, Payment, Address entities)
- [ ] Set up basic Express server with health endpoint
- [ ] Create packages/shared with type definitions
- [ ] Configure API response wrapper utility
- [ ] Verify all packages build without errors
- [ ] Verify applications start successfully
- [ ] Commit initial structure to git

---

## Success Criteria

The workspace setup is complete when:
1. `pnpm install` executes without errors
2. `pnpm --filter web dev` starts the Vite dev server
3. `pnpm --filter server dev` starts the Express server
4. Both web and server compile TypeScript without errors
5. Basic health check endpoint responds at GET `/api/v1/health`
6. Frontend renders at localhost:5173 (or configured port)
7. shadcn/ui components are available and functional

---

## Notes

- This is Epic 1's first story - establishes the foundation for all work
- All subsequent stories depend on this structure
- Do NOT add feature code yet - just the foundation
- Remember to include `.gitignore` files in each package
- Use React Router v7 for routing in web package
- Configure ESLint and Prettier for consistency
- Set up GitHub Actions CI pipeline for monorepo

**Status**: ready-for-dev
**Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created