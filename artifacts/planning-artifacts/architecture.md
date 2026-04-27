# Architecture Decision Document

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The Aurea platform requires a complete end-to-end ecommerce system supporting customer acquisition through product discovery, cart management, checkout and payment processing, order fulfillment, and post-purchase account management. Key functional areas include user authentication (registration, login, guest checkout, password reset), product catalog (browse, search, product details with variants), shopping cart with 30-day persistence, multi-step checkout flow, payment processing via SSLCOMMERZ (cards, mobile wallets) and COD, order tracking, returns processing, and customer profile management.

**Non-Functional Requirements:**
Performance targets mandate 3-second homepage loads on 3G, 300ms search autocomplete, and 1-second add-to-cart operations. Checkout must complete within 5 minutes for returning customers. Payment processing requires 30-second transaction completion. Availability must exceed 99.5% uptime. Security mandates PCI DSS compliance for payment handling, AES-256 encryption at rest, and TLS 1.2+ for data in transit.

**Scale & Complexity:**

- Application type: Full-stack web ecommerce
- Edge case scenarios: 30+ (handled explicitly)
- Estimated architectural components: 10-15 core services/modules

**Technical Constraints & Dependencies:**

- Bangladesh market focus with BDT currency and local payment methods
- Integration with SSLCOMMERZ payment gateway required
- COD logistics partner integration needed
- Email marketing platform for lifecycle communications

**Cross-Cutting Concerns:**

- Real-time inventory synchronization to prevent phantom stock
- Session and cart persistence across devices
- Idempotent payment processing for duplicate prevention
- Multi-channel notifications (SMS, email) for order updates
- Rate limiting for authentication security

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web ecommerce - monorepo with pnpm workspaces.

### Starter Options Considered

**Frontend Options:**

- Vite + React 19 + TypeScript - Matches PRD exactly, fast HMR, modern React 19 features
- Next.js 16 - Full-stack but includes API routes we don't need since backend is separate

**Backend Options:**

- Express + TypeScript - Matches PRD backend requirement
- NestJS - More opinionated, good for enterprise

### Selected Starter: Monorepo with pnpm Workspaces

**Rationale for Selection:**
Using pnpm workspaces for a monorepo structure provides:

- Single dependency tree with deduplication
- Shared types between frontend and backend
- Simplified CI/CD with single pipeline
- Easier code sharing

**Initialization:**

```bash
# Root monorepo setup
pnpm init

# Add pnpm workspaces configuration to package.json
```

### Architectural Decisions Provided

**Frontend:**

- Language: TypeScript with React 19
- Styling: Tailwind CSS (as per PRD)
- Build: Vite
- Components: shadcn/ui (as per PRD)

**Backend:**

- Runtime: Node.js with Express
- ORM: Prisma (as per PRD)
- Database: PostgreSQL (Neon/Supabase)
- TypeScript strict mode

**Monorepo Structure:**

- `packages/web` - React frontend
- `packages/server` - Express backend
- `packages/shared` - Shared types and utilities

## Core Architectural Decisions

### Decision Priority Analysis

Priority defines how soon a decision blocks progress:

- **Critical (Block Implementation):** Must decide before any coding starts. Changing later would require major rework.
- **Important (Shape Architecture):** Needed for MVP but can evolve during implementation.
- **Deferred (Post-MVP):** Can wait until after launch without blocking core functionality.

**Critical Decisions (Block Implementation):**

- Package manager: pnpm with workspaces
- Monorepo structure
- Database provider selection

**Important Decisions (Shape Architecture):**

- API structure and versioning
- Authentication flow
- Edge case handling patterns
- CI/CD pipeline

**Deferred Decisions (Post-MVP):**

- Advanced analytics
- Loyalty program infrastructure
- Multi-language localization beyond English

### Data Architecture

**Database:** PostgreSQL via Supabase (recommended)

- Version: Latest Supabase PostgreSQL
- Rationale: Production-ready with built-in auth, storage, real-time subscriptions, and excellent free tier for startup phase
- Migration: Prisma migrations for version control

**Data Modeling:**

- Prisma schema matching PRD entities (User, Product, Variant, Inventory, Cart, Order, Payment, Address)
- Soft deletes for audit trails
- UUID primary keys for distributed systems

**Caching Strategy:**

- Redis for session storage and rate limiting
- CDN for static assets
- Application-level caching for product catalog (5-minute TTL)

### Authentication & Security

**Authentication:** JWT with refresh token rotation

- Access token expiry: 30 minutes inactivity
- Refresh token: 30 days with "remember me"
- Password: bcrypt hashing with salt
- Rate limiting: 5 failed attempts triggers 30-minute lockout
- Multi-factor for password reset flows

**Security Middleware:**

- Helmet.js for headers
- CORS configuration
- Input validation with Zod
- SQL injection prevention via Prisma parameterized queries

**Data Encryption:**

- AES-256 at rest (database encryption)
- TLS 1.2+ in transit
- Environment variable secrets management

### API & Communication Patterns

**API Design:** RESTful with JSON

- Version in URL: `/api/v1/`
- Response format: `{ success: boolean, data: T, metadata?: object }`
- Error format: `{ success: false, error: { code: string, message: string } }`

**Rate Limiting:**

- Public read: 60 requests/minute
- Authenticated: 120 requests/minute
- Write operations: 10 requests/minute

**Communication:**

- Frontend-Backend: REST API over HTTP
- Webhooks for payment gateway
- Async queues for notifications

### Frontend Architecture

**State Management:**

- TanStack Query for server state (products, cart, orders)
- Zustand for UI state (modals, filters, theme)
- React Context for auth state

**Routing:**

- React Router v7 with lazy loading
- Protected routes for authenticated flows

**Performance:**

- Code splitting by route
- Image optimization with lazy loading
- Prefetching for likely navigation

### Infrastructure & Deployment

**Hosting:**

- Frontend: Vercel or static hosting with CDN
- Backend: Railway/Render/VPS
- Database: Supabase managed PostgreSQL

**CI/CD:**

- GitHub Actions for test and deploy (monorepo-aware)
- Environment promotion: dev → staging → production

**Monitoring:**

- Application logs (structured JSON)
- Error tracking
- Uptime monitoring

### Decision Impact Analysis

**Implementation Sequence:**

1. Initialize monorepo with pnpm workspaces
2. Set up database and Prisma schema
3. Implement authentication
4. Build product catalog
5. Build cart and checkout
6. Integrate payments (SSLCOMMERZ)
7. Order management
8. Edge case handling

**Key Dependencies:** Auth module → All protected routes | Cart → Inventory (real-time stock checks) | Payment → Order creation (idempotent)

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 7 areas where AI agents could make different choices

### Naming Patterns

**Database Naming Conventions:**

- Tables: snake_case, plural (e.g., `users`, `products`, `orders`)
- Columns: snake_case (e.g., `user_id`, `created_at`, `order_number`)
- Foreign keys: `_{table}_id` suffix (e.g., `user_uuid`, `product_uuid`)
- Indexes: `idx_{table}_{column}` format

**API Naming Conventions:**

- Endpoints: plural resources (`/api/v1/users`, `/api/v1/products`)
- Route parameters: colon notation (`:id`, `:uuid`)
- Query parameters: snake_case (`user_id`, `sort_by`)
- Response wrapper: `{ success: boolean, data: T, metadata?: object }`

**Code Naming Conventions:**

- Components: PascalCase (e.g., `UserCard`, `ProductDetail`)
- Files: kebab-case (e.g., `user-card.tsx`, `api-client.ts`)
- Functions: camelCase with verb prefix (e.g., `getUserData`, `createOrder`)
- Constants: UPPER_SNAKE_CASE

### Structure Patterns

> **Note:** Full monorepo directory structure is defined in the "Project Structure & Boundaries" section below.

**File Structure Patterns:**

- Config: `.env` at root, `config.ts` for validated settings
- Tests: co-located `*.test.ts` next to source files

### Format Patterns

**API Response Formats:**

Success Example:

```json
{
  "success": true,
  "data": { ... },
  "metadata": { "page": 1, "total": 100 }
}
```

Error Example:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": { "field": "email" }
  }
}
```

**Data Exchange Formats:**

- JSON fields: snake_case
- Dates: ISO 8601 strings (`2026-04-27T10:00:00Z`)
- UUIDs: canonical format (`550e8400-e29b-41d4-a716-446655440000`)
- Boolean: `true`/`false` (not 1/0)

### Communication Patterns

**Event System Patterns:**

- Event naming: dot notation (`order.created`, `payment.success`)
- Payloads: include `event`, `timestamp`, `data`

**State Management Patterns:**

- TanStack Query: `useQuery` / `useMutation` hooks
- Loading states: `isLoading`, `isFetching`
- Error states: `isError` with error message access

### Process Patterns

**Error Handling Patterns:**

- Try-catch with structured errors
- Zod validation with formatted error responses
- Error codes for localization
- Logging: JSON structured format

**Loading State Patterns:**

- Prefix `is` for boolean states (`isLoading`, `isSubmitting`)
- Optimistic updates for better UX
- Skeleton loaders for content

### Enforcement Guidelines

**All AI Agents MUST:**

- Follow Prisma snake_case conventions
- Use API response wrapper format
- Implement error codes (not just messages)
- Co-locate tests with source files
- Use feature-based organization
- Use pnpm for all package management

**Pattern Enforcement:**

- ESLint rules for naming
- Prettier for formatting
- TypeScript strict mode
- CI lint checks

**Good Examples:**

- `const { data: users } = await getUsers()` (TanStack Query)
- `POST /api/v1/orders` (REST plural)
- `{ success: true, data: order }` (API format)

**Anti-Patterns:**

- Single endpoint `/user/:id` (should be plural)
- Returning raw database objects (should use response wrapper)
- Mixed naming conventions

## Project Structure & Boundaries

### Monorepo Directory Structure

```plaintext
aurea/                            # Root - pnpm workspace
├── package.json                   # Root package.json
├── pnpm-workspace.yaml          # pnpm workspaces config
│
├── .env                          # Root environment (shared)
├── .env.example
├── .github/
│   └── workflows/
│       └── ci.yml               # CI pipeline
│
├── docker-compose.yml            # Local development
├── README.md
│
└── packages/
    ├── web/                    # React 19 + TypeScript + Vite
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── vite.config.ts
    │   ├── tailwind.config.js
    │   ├── postcss.config.js
    │   ├── index.html
    │   │
    │   ├── public/
    │   │   └── assets/
    │   │       ├── images/
    │   │       │   ├── products/
    │   │       │   └── branding/
    │   │       └── icons/
    │   │
    │   └── src/
    │       ├── main.tsx
    │       ├── App.tsx
    │       └── index.css
    │       │
    │       ├── components/      # Shared UI components
    │       │   ├── ui/       # shadcn/ui components
    │       │   │   ├── button.tsx
    │       │   │   ├── input.tsx
    │       │   │   ├── card.tsx
    │       │   │   ├── dialog.tsx
    │       │   │   └── ...
    │       │   ├── layout/     # Layout components
    │       │   │   ├── header.tsx
    │       │   │   ├── footer.tsx
    │       │   │   └── sidebar.tsx
    │       │   └── forms/    # Form components
    │       │       ├── login-form.tsx
    │       │       ├── register-form.tsx
    │       │       └── checkout-form.tsx
    │       │
    │       ├── features/       # Feature-based modules
    │       │   ├── auth/    # Authentication
    │       │   │   ├── components/
    │       │   │   ├── login-form.tsx
    │       │   │   └── register-form.tsx
    │       │   │   ├── hooks/
    │       │   │   │   ├── use-login.ts
    │       │   │   │   └── use-register.ts
    │       │   │   └── types/
    │       │   │       └── index.ts
    │       │   ├── products/ # Product catalog
    │       │   │   ├── components/
    │       │   │   │   ├── product-card.tsx
    │       │   │   │   ├── product-grid.tsx
    │       │   │   │   ├── product-detail.tsx
    │       │   │   │   └── variant-selector.tsx
    │       │   │   ├── hooks/
    │       │   │   │   ├── use-products.ts
    │       │   │   │   └── use-product.ts
    │       │   │   └── types/
    │       │   │       └── index.ts
    │       │   ├── cart/     # Shopping cart
    │       │   │   ├── components/
    │       │   │   │   ├── cart-item.tsx
    │       │   │   │   ├── cart-summary.tsx
    │       │   │   │   └── cart-notification.tsx
    │       │   │   ├── hooks/
    │       │   │   │   ├── use-cart.ts
    │       │   │   │   └── use-cart-notification.ts
    │       │   │   └── types/
    │       │   │       └── index.ts
    │       │   ├── checkout/ # Checkout flow
    │       │   │   ├── components/
    │       │   │   │   ├── address-form.tsx
    │       │   │   │   ├── delivery-selector.tsx
    │       │   │   │   ├── payment-selector.tsx
    │       │   │   │   └── order-review.tsx
    │       │   │   ├── hooks/
    │       │   │   │   └── use-checkout.ts
    │       │   │   └── types/
    │       │   │       └── index.ts
    │       │   ├── orders/   # Order management
    │       │   │   ├── components/
    │       │   │   │   ├── order-card.tsx
    │       │   │   │   ├── order-detail.tsx
    │       │   │   │   └── order-tracking.tsx
    │       │   │   ├── hooks/
    │       │   │   │   └── use-orders.ts
    │       │   │   └── types/
    │       │   │       └── index.ts
    │       │   ├── returns/ # Returns & refunds
    │       │   │   ├── components/
    │       │   │   │   ├── return-form.tsx
    │       │   │   │   └── refund-status.tsx
    │       │   │   └── hooks/
    │       │   │       └── use-return.ts
    │       │   └── account/ # User account
    │       │       ├── components/
    │       │       │   ├── profile-form.tsx
    │       │       │   ├── address-book.tsx
    │       │       │   └── password-form.tsx
    │       │       └── hooks/
    │       │           └── use-account.ts
    │       │
    │       ├── hooks/         # Shared hooks
    │       │   ├── use-api.ts
    │       │   └── use-auth.ts
    │       │
    │       ├── lib/          # Utilities
    │       │   ├── api-client.ts
    │       │   ├── validators.ts
    │       │   ├── formatters.ts
    │       │   └── constants.ts
    │       │
    │       ├── stores/       # Zustand stores
    │       │   ├── auth-store.ts
    │       │   ├── cart-store.ts
    │       │   └── ui-store.ts
    │       │
    │       ├── pages/       # Route pages
    │       │   ├── home.tsx
    │       │   ├── products/
    │       │   │   ├── index.tsx
    │       │   │   └── [slug].tsx
    │       │   ├── cart.tsx
    │       │   ├── checkout/
    │       │   │   ├── index.tsx
    │       │   │   ├── address.tsx
    │       │   │   ├── delivery.tsx
    │       │   │   ├── payment.tsx
    │       │   │   └── review.tsx
    │       │   ├── orders/
    │       │   │   ├── index.tsx
    │       │   │   └── [order-number].tsx
    │       │   └── account/
    │       │       ├── index.tsx
    │       │       ├── addresses.tsx
    │       │       └── settings.tsx
    │       │
    │       └── types/       # Shared types reference
    │           └── index.ts
    │
    ├── server/                  # Express + TypeScript + Prisma
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── .env
    │   ├── .env.example
    │   │
    │   ├── prisma/
    │   │   ├── schema.prisma
    │   │   └── migrations/
    │   │
    │   └── src/
    │       ├── main.ts
    │       ├── app.ts
    │       ├── config/
    │       │   └── index.ts
    │       │
    │       ├── controllers/
    │       │   ├── auth-controller.ts
    │       │   ├── product-controller.ts
    │       │   ├── cart-controller.ts
    │       │   ├── order-controller.ts
    │       │   ├── payment-controller.ts
    │       │   └── user-controller.ts
    │       │
    │       ├── services/
    │       │   ├── auth-service.ts
    │       │   ├── product-service.ts
    │       │   ├── cart-service.ts
    │       │   ├── order-service.ts
    │       │   ├── payment-service.ts
    │       │   └── user-service.ts
    │       │
    │       ├── repositories/
    │       │   ├── user-repository.ts
    │       │   ├── product-repository.ts
    │       │   ├── cart-repository.ts
    │       │   ├── order-repository.ts
    │       │   └── payment-repository.ts
    │       │
    │       ├── middleware/
    │       │   ├── auth.ts
    │       │   ├── validation.ts
    │       │   ├── rate-limit.ts
    │       │   └── error-handler.ts
    │       │
    │       ├── utils/
    │       │   ├── jwt.ts
    │       │   ├── passwords.ts
    │       │   ├── responses.ts
    │       │   └── sslcommerz.ts
    │       │
    │       ├── types/
    │       │   └── index.ts
    │       │
    │       └── routes/
    │           ├── auth-routes.ts
    │           ├── product-routes.ts
    │           ├── cart-routes.ts
    │           ├── order-routes.ts
    │           ├── payment-routes.ts
    │           └── user-routes.ts
    │
    └── shared/                  # Shared types and utilities
        ├── package.json
        ├── tsconfig.json
        │
        └── src/
            ├── types/
            │   ├── api.ts      # API response types
            │   ├── user.ts
            │   ├── product.ts
            │   ├── cart.ts
            │   ├── order.ts
            │   └── index.ts
            │
            └── utils/
                ├── validation.ts
                └── formatters.ts
```

### Architectural Boundaries

**API Boundaries:**

- Frontend (web) communicates to backend (server) via REST API at `/api/v1/`
- External integrations: SSLCOMMERZ for payments, logistics webhooks
- API versioned: `/api/v1/` prefix

**Component Boundaries:**

- `packages/web` - React frontend only
- `packages/server` - Express backend only
- `packages/shared` - Types and utilities shared between both
- No direct database access from web package

**Service Boundaries:**

- Controllers handle HTTP, validate input
- Services contain business logic
- Repositories handle database access only

**Data Boundaries:**

- Prisma schema is single source of truth in server package
- API responses use shared types
- Shared package provides TypeScript types to both

### Requirements to Structure Mapping

**User Account Management →** `packages/web/features/auth/` + `packages/server/src/controllers/auth*`

**Product Catalog →** `packages/web/features/products/` + `packages/server/src/controllers/product*`

**Shopping Cart →** `packages/web/features/cart/` + `packages/server/src/controllers/cart*`

**Checkout →** `packages/web/features/checkout/` + `packages/server/src/controllers/order*`

**Payment Processing →** `packages/server/src/services/payment-service.ts` (SSLCOMMERZ)

**Order Management →** `packages/web/features/orders/` + `packages/server/src/controllers/order*`

**Returns & Refunds →** `packages/web/features/returns/` + `packages/server/src/controllers/order*`

### Integration Points

**Internal Communication:**

- Web uses TanStack Query for fetching from server
- Zustand for client-side state
- React Context for auth state

**External Integrations:**

- SSLCOMMERZ payment gateway API
- Email service webhooks
- Logistics provider webhooks

**Data Flow:**
Web → REST API → Server Service → Repository → Prisma → PostgreSQL



### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions exactly as documented
- Use pnpm for all package management (no npm/yarn)
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions

**First Implementation Priority:**

```bash
# Monorepo initialization with pnpm
pnpm init

# Add pnpm-workspace.yaml
echo 'packages:\n  - "packages/*"' > pnpm-workspace.yaml

# Create web package
mkdir -p packages/web && cd packages/web
pnpm create vite@latest . --template react-ts

# Create server package
mkdir -p packages/server
cd packages/server
pnpm init -y
pnpm add express typescript @types/node @types/express prisma

# Create shared package
mkdir -p packages/shared
cd packages/shared
pnpm init -y
pnpm add typescript

# Install all dependencies from root
cd ..
pnpm install
```