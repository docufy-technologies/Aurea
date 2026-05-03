# Story 3.3: Show helpful empty cart and browsing prompts

**Status**: ready-for-dev
**Story ID**: 3.3
**Story Key**: 3-3-show-helpful-empty-cart-and-browsing-prompts
**Epic**: Epic 3 - Cart, Waitlist, and Purchase Readiness
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a shopper,**
**I want the empty cart to guide me back to products,**
**so that I can continue shopping easily.**

### Business Context

This story handles the empty cart experience — a critical touchpoint for recovery. When customers arrive at an empty cart, they should not hit a dead end. Instead, the empty cart becomes a discovery opportunity.

Key business value:
- Reduces bounce rate from empty cart
- Increases product discovery and cross-sell opportunities
- Creates engagement even when purchase intent is interrupted
- Transforms "no items" into "browse options"

This story depends on Story 3.1 (cart data structure) and Story 3.2 (cart page infrastructure).

### Acceptance Criteria

#### AC1: Empty Cart Display

**Given** my cart is empty
**When** I open the cart page
**Then** I see featured collections or browse prompts
**And** the page does not feel like a dead end

#### AC2: Featured Collections

**Given** my cart is empty
**When** the page loads
**Then** featured collections are displayed
**And** clicking takes me to product browsing

#### AC3: Continue Shopping CTA

**Given** I am on an empty cart
**When** I look for next actions
**Then** clear "Continue Shopping" CTAs are visible
**And** they guide to product categories

#### AC4: Personalized Recommendations (If Logged In)

**Given** I am logged in with purchase history
**When** my cart is empty
**Then** "Recently Viewed" or recommended products appear
**And** past purchase interests are reflected

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR40 | Empty cart must show featured collections |
| FR41 | Empty cart must provide clear continue shopping paths |
| FR43 | Cart page must never feel like a dead end |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR4 | Empty cart load must complete within 1 second |

---

## Technical Requirements

### Database Schema (Prisma)

This story does not require new database models. It leverages:
- Existing Product model for featured collections
- Existing User model for personalization (if logged in)

No Prisma changes needed — this is a frontend experience story.

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/products/featured` | GET | Get featured collections for empty cart |
| `/api/v1/products/recommended` | GET | Get personalized recommendations (auth required) |
| `/api/v1/products/recently-viewed` | GET | Get recently viewed (auth required) |

#### GET /api/v1/products/featured

**Response (200):**
```json
{
  "success": true,
  "data": {
    "collections": [
      {
        "id": "col_1",
        "name": "New Arrivals",
        "slug": "new-arrivals",
        "description": "Latest fragrances added",
        "products": [
          { "id": "prod_1", "name": "Gucci Guilty", "price": 2500, "image": "..." },
          { "id": "prod_2", "name": "Dior Sauvage", "price": 3200, "image": "..." }
        ]
      },
      {
        "id": "col_2",
        "name": "Best Sellers",
        "slug": "best-sellers",
        "description": "Customer favorites",
        "products": [...]
      }
    ]
  }
}
```

#### GET /api/v1/products/recommended (Authenticated)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "recommended": [
      { "id": "prod_3", "name": "Givenchy Gentleman", "price": 2800, "image": "..." }
    ],
    "reason": "Based on your previous purchases"
  }
}
```

#### GET /api/v1/products/recently-viewed (Authenticated)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "recentlyViewed": [
      { "id": "prod_5", "name": "Versace Eros", "price": 2600, "image": "...", "viewedAt": "2026-05-02T14:30:00Z" }
    ]
  }
}
```

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Continue using `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names
4. **API Versioning**: All endpoints under `/api/v1/`
5. **Caching**: Featured collections cached for 5 minutes

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── cart/
│       │   │   ├── components/
│       │   │   │   ├── empty-cart.tsx (new - empty state container)
│       │   │   │   ├── featured-collection-card.tsx (new - collection display)
│       │   │   │   ├── recommended-products.tsx (new - personalization)
│       │   │   │   ├── continue-shopping-cta.tsx (new - CTA buttons)
│       │   │   │   └── recently-viewed.tsx (new - recent history)
│       │   │   ├── hooks/
│       │   │   │   ├── use-featured-collections.ts (new)
│       │   │   │   └── use-recommendations.ts (new)
│       │   │   └── types/
│       │   │       └── index.ts (extend with empty cart types)
│       │   └── products/
│       │       └── components/
│       │           └── product-card.tsx (reused)
│       └── pages/
│           └── cart.tsx (update - check for empty state)
│
├── server/
│   └── src/
│       ├── controllers/
│       │   └── product-controller.ts (extend with featured endpoints)
│       ├── services/
│       │   ├── product-service.ts (extend with featured logic)
│       │   └── recommendation-service.ts (new - personalization logic)
│       ├── repositories/
│       │   └── product-repository.ts (extend with featured queries)
│       └── routes/
│           └── product-routes.ts (extend with new endpoints)
│
└── shared/
    └── src/
        └── types/
            └── product.ts (extend with collection types)
```

### State Management

- **TanStack Query**: Featured collections with 5-minute stale time
- **TanStack Query**: Recommendations with user context
- **React Context**: Auth state for personalization

---

## Previous Story Intelligence

### From Story 3.2 (Edit cart quantities)

**Key Learnings:**

1. **TanStack Query Pattern**: useQuery with proper stale times
2. **Error Handling**: Error codes with user-friendly messages
3. **Component Structure**: Feature-based with hooks
4. **API Response Format**: Success wrapper with metadata
5. **Loading States**: Skeleton loaders for better UX

**Files Created in Story 3.2:**

- `packages/web/src/features/cart/components/cart-page.tsx`
- `packages/web/src/features/cart/components/cart-item-row.tsx`
- `packages/web/src/features/cart/components/cart-totals.tsx`
- `packages/server/src/services/cart-service.ts`

**Reuse for Story 3.3:**

- Cart page structure as base for empty cart design
- Skeleton loaders for featured collections
- Error handling patterns
- Product card component from Epic 2

### From Epic 2 (Browse and Search)

**Key Learnings:**

1. **Product Cards**: Reusable product display component
2. **Collection Display**: Grid layout patterns
3. **Category Navigation**: Category links needed for CTAs

**Reuse for Story 3.3:**

- Product card component
- Category browse infrastructure
- Grid layout patterns

---

## Implementation Checklist

### Backend Tasks

- [ ] Implement GET /api/v1/products/featured endpoint
- [ ] Implement GET /api/v1/products/recommended endpoint (auth required)
- [ ] Implement GET /api/v1/products/recently-viewed endpoint (auth required)
- [ ] Add featured collection logic to product-service.ts
- [ ] Create recommendation-service.ts for personalization
- [ ] Cache featured collections for 5 minutes
- [ ] Handle logged-in vs logged-out states

### Frontend Tasks

- [ ] Create empty-cart.tsx (empty state container)
- [ ] Create featured-collection-card.tsx
- [ ] Create recommended-products.tsx
- [ ] Create continue-shopping-cta.tsx
- [ ] Create recently-viewed.tsx
- [ ] Create use-featured-collections.ts hook
- [ ] Create use-recommendations.ts hook
- [ ] Update cart-page.tsx to show empty state
- [ ] Integrate product card from Epic 2

### UX/UI Tasks

- [ ] Empty cart shows featured collections
- [ ] Continue Shopping buttons prominent
- [ ] Logged-in users see personalized section
- [ ] Recently Viewed section if available
- [ ] Product cards clickable to product pages
- [ ] Category CTAs work correctly
- [ ] Loading state shows skeletons
- [ ] Mobile: Responsive layout works
- [ ] Animation: Smooth transitions
- [ ] No dead-end feeling — engaging design

---

## Success Criteria

The empty cart feature is complete when:

1. **Empty Display**: Cart shows collections when empty
2. **Featured Sections**: At least 2 featured collections shown
3. **Personalization**: Logged-in users see recommendations
4. **Recently Viewed**: Shows recently viewed if available
5. **CTAs Work**: Continue Shopping buttons lead to products
6. **Mobile**: Works on mobile devices
7. **Performance**: Loads within 1 second
8. **Engaging**: Page feels alive, not abandoned
9. **Error Handling**: Graceful error states
10. **Navigation**: All links work correctly

---

## Integration Points

### With Epic 1 (Authentication)

- User login state determines personalization
- Logged-in users see recommendations

### With Epic 2 (Product Catalog)

- Uses product cards for collections
- Links to category browse pages
- Uses product data from catalog

### With Story 3.1 (Cart persistence)

- Cart state triggers empty vs populated view
- Uses cart data structure

### With Story 3.2 (Quantity edit)

- Empty cart shows after all items removed
- Same page, different state

### With Epic 4 (Checkout)

- Continue Shopping leads to checkout after adding items

---

## Edge Cases to Handle

1. **API Failure**: Show cached content or manual recommendations
2. **No Featured Collections**: Show generic "Browse All" CTA
3. **Not Logged In**: Skip personalization sections
4. **No Recently Viewed**: Hide that section
5. **Slow Network**: Skeleton loaders, not blank page
6. **Empty Product Catalog**: Show "Coming Soon" message
7. **Mobile View**: Stack collections vertically
8. **Multiple Removed Items**: Still triggers empty state
9. **Session Timeout**: Clear empty cart gracefully
10. **Error Recovery**: Retry button for failed loads

---

## Notes

- Empty cart is a recovery opportunity, not a failure state
- Consider analytics for empty cart → conversion rate
- Track "Continue Shopping" clicks for funnel optimization
- Test different collection arrangements
- A/B test headline copy

- **Status**: ready-for-dev
- **Story Context**: Full implementation context created - ready for dev agent execution