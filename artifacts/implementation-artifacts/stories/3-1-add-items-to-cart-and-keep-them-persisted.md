# Story 3.1: Add items to cart and keep them persisted

**Status**: ready-for-dev
**Story ID**: 3.1
**Story Key**: 3-1-add-items-to-cart-and-keep-them-persisted
**Epic**: Epic 3 - Cart, Waitlist, and Purchase Readiness
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a shopper,**
**I want to add products to my cart and keep them saved,**
**so that I can continue later without losing my selections.**

### Business Context

This story implements the core cart functionality — the foundation for the entire purchase flow. It builds on Epic 2 (product browsing, search, and product details) where customers discover products and navigate to product pages. The cart must provide immediate feedback when adding items, persist across sessions for 30 days, and show low-stock warnings to prevent checkout friction.

Key business value: Cart is the bridge between product discovery and checkout. A smooth cart experience reduces abandonment and increases conversion. This story also lays the foundation for Story 3.2 (edit cart quantities), Story 3.3 (empty cart prompts), Story 3.4 (pre-orders and waitlists), and Story 3.5 (inventory sync).

### Acceptance Criteria

#### AC1: Add to Cart with Immediate Feedback

**Given** I click add to cart
**When** the item is accepted
**Then** the cart icon updates immediately
**And** the cart is saved across sessions for 30 days

#### AC2: Low Stock Warning in Cart

**Given** the item becomes low stock
**When** it is in my cart
**Then** I see a low-stock warning before checkout

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR37 | Add-to-cart must give immediate visual feedback and update the cart icon |
| FR40 | Shopping cart must persist across browser sessions for 30 days |
| FR41 | Cart must display low-stock warnings |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR4 | Add-to-cart must complete within 1 second |
| NFR12 | Cart persistence must survive browser close and remain available for at least 30 days |

---

## Technical Requirements

### Database Schema (Prisma)

This story requires Cart and CartItem models. The cart should support both authenticated users and guest users (identified by session ID).

```prisma
model Cart {
  id            String      @id @default(uuid())
  userId        String?     @map("user_id") // NULL for guest carts
  guestToken    String?     @map("guest_token") // For guest cart identification
  status        CartStatus  @default(ACTIVE)
  expiresAt     DateTime    @map("expires_at") // 30 days from last activity
  
  items         CartItem[]
  
  user          User?       @relation(fields: [userId], references: [id])
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  @@index([userId])
  @@index([guestToken])
  @@map("carts")
}

enum CartStatus {
  ACTIVE
  MERGED
  CHECKED_OUT
  EXPIRED
}

model CartItem {
  id            String   @id @default(uuid())
  cartId        String   @map("cart_id")
  productId     String   @map("product_id")
  variantId     String?  @map("variant_id")
  quantity      Int      @default(1)
  price         Decimal  // Price at time of adding (for price volatility edge case)
  addedAt       DateTime @default(now()) @map("added_at")
  
  cart          Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product       Product  @relation(fields: [productId], references: [id])
  variant       Variant? @relation(fields: [variantId], references: [id])

  @@unique([cartId, productId, variantId]) // One entry per product/variant combo
  @@map("cart_items")
}
```

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/cart` | GET | Get current cart (user or guest) |
| `/api/v1/cart/items` | POST | Add item to cart |
| `/api/v1/cart/items/:itemId` | DELETE | Remove item from cart |
| `/api/v1/cart/sync` | POST | Merge guest cart to user cart on login |

#### GET /api/v1/cart

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "cart_123",
    "userId": "user_456",
    "guestToken": null,
    "status": "ACTIVE",
    "expiresAt": "2026-06-02T10:00:00Z",
    "items": [
      {
        "id": "item_1",
        "productId": "prod_789",
        "variantId": "var_101",
        "product": {
          "id": "prod_789",
          "name": "Gucci Guilty",
          "slug": "gucci-guilty",
          "brand": "Gucci",
          "image": "https://cdn.aurea.com/products/gucci-guilty-50ml.jpg"
        },
        "variant": {
          "id": "var_101",
          "name": "50ml",
          "sku": "GUCCI-GUILTY-50ML"
        },
        "quantity": 2,
        "price": 2500,
        "addedAt": "2026-05-03T08:30:00Z",
        "lowStockWarning": false
      },
      {
        "id": "item_2",
        "productId": "prod_102",
        "variantId": null,
        "product": {
          "id": "prod_102",
          "name": "Dior Sauvage",
          "slug": "dior-sauvage",
          "brand": "Dior",
          "image": "https://cdn.aurea.com/products/dior-sauvage.jpg"
        },
        "variant": null,
        "quantity": 1,
        "price": 3200,
        "addedAt": "2026-05-03T09:15:00Z",
        "lowStockWarning": true
      }
    ],
    "itemCount": 3,
    "subtotal": 8200,
    "lowStockItems": ["item_2"]
  },
  "metadata": { "generated": "2026-05-03T10:00:00Z" }
}
```

#### POST /api/v1/cart/items

**Request:**
```json
{
  "productId": "prod_789",
  "variantId": "var_101",
  "quantity": 2
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "item_1",
    "cartId": "cart_123",
    "productId": "prod_789",
    "variantId": "var_101",
    "quantity": 2,
    "price": 2500,
    "addedAt": "2026-05-03T10:00:00Z"
  },
  "metadata": { "message": "Item added to cart" }
}
```

#### POST /api/v1/cart/sync

**Request:**
```json
{
  "guestToken": "guest_token_from_cookie"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "merged": true,
    "mergedItemsCount": 3,
    "cartId": "cart_123"
  }
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| productId | Must exist and be available | PRODUCT_NOT_FOUND, PRODUCT_UNAVAILABLE |
| variantId | Must belong to product | INVALID_VARIANT |
| quantity | Must be >= 1 and <= stock | INVALID_QUANTITY, INSUFFICIENT_STOCK |
| guestToken | Must be valid if provided | INVALID_GUEST_TOKEN |

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (carts, cart_items)
4. **API Versioning**: All endpoints under `/api/v1/`
5. **Cart Expiry**: 30 days from last update, auto-cleanup job
6. **Guest Cart**: Use secure HTTP-only cookie for guest token
7. **Price Volatility**: Store price at time of adding (FR40 edge case)

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── cart/
│       │   │   ├── components/
│       │   │   │   ├── cart-button.tsx (header cart icon with count)
│       │   │   │   ├── add-to-cart-button.tsx (on product page)
│       │   │   │   ├── cart-dropdown.tsx (mini cart on hover)
│       │   │   │   ├── cart-notification.tsx (toast on add)
│       │   │   │   └── low-stock-badge.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── use-cart.ts
│       │   │   │   ├── use-add-to-cart.ts
│       │   │   │   └── use-cart-notification.ts
│       │   │   ├── types/
│       │   │   │   └── index.ts
│       │   │   └── stores/
│       │   │       └── cart-store.ts (Zustand for UI state)
│       │   └── products/
│       │       └── components/
│       │           └── add-to-cart-button.tsx (integrate with cart feature)
│       ├── lib/
│       │   └── api-client.ts (extend with cart endpoints)
│       └── stores/
│           └── ui-store.ts (extend with cart notification state)
│
├── server/
│   └── src/
│       ├── controllers/
│       │   └── cart-controller.ts
│       ├── services/
│       │   ├── cart-service.ts
│       │   └── inventory-service.ts (for stock checks)
│       ├── repositories/
│       │   └── cart-repository.ts
│       ├── middleware/
│       │   └── cart-auth.ts (handle user/guest)
│       └── routes/
│           └── cart-routes.ts
│
└── shared/
    └── src/
        └── types/
            └── cart.ts
```

### State Management

- **TanStack Query**: Fetch cart, add/remove items, sync cart on login
- **Zustand**: Cart UI state (open/close dropdown, notification)
- **React Context**: Auth state for user cart vs guest cart
- **Cookies**: Guest cart token (HTTP-only, secure)

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @tanstack/react-query | ^5.x | Cart data fetching |
| zustand | ^4.x | Cart UI state |
| react-hot-toast | ^2.x | Cart notification toasts |
| js-cookie | ^3.x | Guest cart token management |

---

## Previous Story Intelligence

### From Epic 2 (Stories 2.1, 2.2, 2.3)

**Key Learnings:**

1. **API Response Format**: Wrapper pattern established — continue using `{ success, data, metadata }`
2. **Product Data Shape**: Product pages already have product data needed for cart
3. **TanStack Query**: Continue using same fetching hooks pattern
4. **Zustand Store**: Reuse pattern for UI state management
5. **Error Handling**: Use error codes consistently (PRODUCT_NOT_FOUND, etc.)

**Files Created in Epic 2:**

- `packages/web/src/features/products/components/product-card.tsx`
- `packages/web/src/features/products/hooks/use-products.ts`
- `packages/server/src/services/product-service.ts`
- `packages/server/src/repositories/product-repository.ts`

**Reuse these for Story 3.1:**

- Product data structure for cart item display
- Loading/error states from product hooks
- Stock status component from product detail page

### From Epic 1 (Stories 1.1 - 1.5)

**Key Learnings:**

1. **Authentication Flow**: User vs guest identification pattern established
2. **Session Management**: JWT and session handling in place
3. **Cookie Handling**: Secure cookie patterns available

**Reuse for Story 3.1:**

- Auth middleware for user cart identification
- Guest token handling from login flow

---

## Git Intelligence Summary

From Epic 1 and Epic 2, the codebase has:

- Monorepo structure with pnpm workspaces (Story 1.1)
- User authentication with JWT and Redis sessions (Epic 1)
- Product, Category, Brand, Variant models in Prisma (Epic 2)
- Search and product detail functionality (Epic 2)
- API response wrapper pattern consistently used
- TanStack Query for data fetching
- Zustand for client state

For this story, we need to:

- Add Cart and CartItem models to Prisma
- Create cart API endpoints (GET, POST, DELETE, SYNC)
- Implement cart persistence (30 days expiry)
- Create cart UI components (button, dropdown, notification)
- Handle guest cart vs user cart logic
- Implement low-stock warning display
- Handle price volatility (store price at add time)

---

## Latest Tech Information

### Cart Persistence Implementation (2026)

**Client-side Storage Options:**

1. **Local Storage** (recommended for guest cart)
   - Persists across sessions
   - 30-day expiry logic needed
   - Sync to server on login

2. **Session Storage**
   - Lost on browser close
   - Not suitable for 30-day requirement

3. **Cookies** (for guest token)
   - Store guest token
   - Server looks up cart from token
   - HTTP-only, secure for token

**Server-side Cart:**

```typescript
// Cart expiry calculation
const CART_EXPIRY_DAYS = 30;

const calculateExpiry = (): Date => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + CART_EXPIRY_DAYS);
  return expiry;
};

// Cleanup expired carts (run daily)
const cleanupExpiredCarts = async () => {
  await prisma.cart.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  });
};
```

### Add to Cart UX Patterns

```tsx
const AddToCartButton = ({ product, variant }) => {
  const { mutate: addToCart, isPending } = useAddToCart();
  const { showNotification } = useCartNotification();

  const handleAddToCart = () => {
    addToCart(
      { productId: product.id, variantId: variant?.id },
      {
        onSuccess: () => {
          showNotification(`${product.name} added to cart`);
        }
      }
    );
  };

  return (
    <Button onClick={handleAddToCart} disabled={isPending}>
      {isPending ? 'Adding...' : 'Add to Cart'}
    </Button>
  );
};
```

### Low Stock Warning Display

| Stock Level | Display | Threshold |
|-------------|---------|-----------|
| Normal | No warning | > 5 items |
| Low Stock | "Only X left" | 1-5 items |
| Very Low | "Almost gone" | 1-2 items |

---

## Implementation Checklist

### Backend Tasks

- [ ] Add Cart model to Prisma schema
- [ ] Add CartItem model to Prisma schema
- [ ] Create database migration
- [ ] Create cart-repository with CRUD operations
- [ ] Create cart-service with business logic
- [ ] Create GET /api/v1/cart endpoint
- [ ] Create POST /api/v1/cart/items endpoint
- [ ] Create DELETE /api/v1/cart/items/:itemId endpoint
- [ ] Create POST /api/v1/cart/sync endpoint (merge guest to user)
- [ ] Implement cart expiry logic (30 days)
- [ ] Implement price storage at add time (price volatility)
- [ ] Implement low-stock threshold check
- [ ] Add guest token validation middleware
- [ ] Test cart persistence across sessions

### Frontend Tasks

- [ ] Create cart-button.tsx (header icon with count badge)
- [ ] Create add-to-cart-button.tsx (integrate with product page)
- [ ] Create cart-dropdown.tsx (mini cart on hover/click)
- [ ] Create cart-notification.tsx (toast on successful add)
- [ ] Create low-stock-badge.tsx component
- [ ] Create use-cart.ts TanStack Query hook
- [ ] Create use-add-to-cart.ts mutation hook
- [ ] Create use-cart-notification.ts hook
- [ ] Create cart-store.ts (Zustand for UI state)
- [ ] Extend api-client.ts with cart endpoints
- [ ] Integrate add-to-cart with product detail page
- [ ] Implement cart count in header
- [ ] Handle guest cart token in cookies

### UX/UI Tasks

- [ ] Cart icon shows item count badge
- [ ] Add to cart shows loading state
- [ ] Success notification appears on add
- [ ] Mini cart shows on hover/click with item preview
- [ ] Low stock warning displays for < 5 items
- [ ] Cart persists after page refresh
- [ ] Cart persists after browser close (30 days)
- [ ] Mobile: Cart icon accessible, mini cart works
- [ ] Animation on cart count update

---

## Success Criteria

The cart feature is complete when:

1. **Add to Cart**: Clicking adds item and shows immediate feedback
2. **Cart Count**: Header icon shows correct item count
3. **Persistence**: Cart survives browser close and lasts 30 days
4. **Guest Support**: Guest users can add items without login
5. **User Cart**: Logged-in users have their own cart
6. **Cart Sync**: Guest cart merges to user cart on login
7. **Low Stock Warning**: Shows warning for items with < 5 stock
8. **Price Display**: Shows price at time of adding
9. **Performance**: Add to cart completes within 1 second
10. **Mobile**: Works on mobile devices

---

## Integration Points

### With Epic 2 (Product Browse)

- Product detail page has "Add to Cart" button
- Product card has quick add option
- Product data passed to cart item

### With Epic 1 (Authentication)

- User cart identified by userId
- Guest cart identified by guestToken
- Cart sync on login (merge guest to user)
- Session expiry affects cart expiry

### With Story 3.2 (Edit cart quantities)

- Cart page reuses cart data structure
- Quantity update uses same cart API
- Totals calculation extended

### With Story 3.3 (Empty cart)

- Empty cart shows when no items
- Browse prompts link to product pages

### With Story 3.4 (Pre-orders and waitlists)

- Pre-order items in cart show different status
- Waitlist button on out-of-stock items

### With Story 3.5 (Inventory sync)

- Cart checks inventory on load
- Stock changes reflected in cart

---

## Edge Cases to Handle

1. **Cart Conflict**: Price changes while item in cart — show updated price, note it changed
2. **Stock Phantom**: Item out of stock when adding — show error, suggest alternatives
3. **Session Timeout**: Cart persists without session — guest token keeps cart alive
4. **Guest to User Merge**: Login with items in guest cart — merge to user cart
5. **Duplicate Items**: Adding same product again — increment quantity instead of new entry
6. **Minimum Order**: Cart below minimum — show warning (future Story 3.2)
7. **Last Item Race**: Last item sells during checkout — show out of stock, suggest alternatives
8. **Cross-Device Cart**: Cart on different devices — sync via user account (Story 3.5)
9. **Cart Expiry**: 30 days passed — cart expires, show empty cart
10. **Invalid Variant**: Selected variant no longer available — show error, update selection

---

## Notes

- Consider "Save for later" feature (future enhancement)
- Consider "Cart note" for special instructions
- Consider "Cart abandoned" email trigger
- Track cart abandonment for analytics

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created