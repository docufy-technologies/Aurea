# Story 3.2: Edit cart quantities and see totals update

**Status**: ready-for-dev
**Story ID**: 3.2
**Story Key**: 3-2-edit-cart-quantities-and-see-totals-update
**Epic**: Epic 3 - Cart, Waitlist, and Purchase Readiness
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a shopper,**
**I want to update quantities and remove items from my cart,**
**so that I can refine my order before checkout.**

### Business Context

This story extends Story 3.1's cart functionality to enable quantity management and removal. This is critical for checkout readiness — customers frequently adjust quantities before paying. The immediate total update creates confidence in what they are paying for.

Key business value: Reduces checkout friction by allowing easy corrections. Immediate feedback prevents "sticker shock" at checkout. The removal flow with restore capability reduces accidental removals.

This story depends on Story 3.1 (cart persistence, cart data structure).

### Acceptance Criteria

#### AC1: Quantity Update with Immediate Totals

**Given** I change a quantity or remove an item
**When** the action completes
**Then** subtotal, shipping estimate, and total update immediately

#### AC2: Single Item Quantity Adjustment

**Given** I adjust quantity using +/- buttons
**When** the update succeeds
**Then** the quantity reflects the change
**And** totals recalculate in real-time

#### AC3: Remove Item with Session Restore

**Given** I remove an item from the cart
**When** the removal completes
**Then** the item is removed from the cart
**And** I can restore it within the session (undo)

#### AC4: Quantity Limits Validation

**Given** I try to set quantity beyond available stock
**When** validation runs
**Then** I see an error with the maximum available quantity

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR38 | Cart pages must allow quantity updates and item removal |
| FR39 | Cart totals must update immediately when quantity changes |
| FR42 | Cart must display subtotal, shipping estimate, and order total |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR4 | Add-to-cart must complete within 1 second (also applies to quantity updates) |

---

## Technical Requirements

### Database Schema (Prisma)

This story extends the Cart and CartItem models from Story 3.1. No new models needed — just new endpoints and frontend state.

The Story 3.1 schema already supports:
- CartItem with quantity field
- Cart with items relation

For this story, we add:
- Price recalculation on quantity change
- Remove timestamp for undo capability

```prisma
// Already defined in Story 3.1 - no changes needed for quantity handling
// The quantity field on CartItem supports increment/decrement
```

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/cart/items/:itemId` | PATCH | Update item quantity |
| `/api/v1/cart/items/:itemId` | DELETE | Remove item from cart |
| `/api/v1/cart/items/:itemId/restore` | POST | Restore removed item (undo) |
| `/api/v1/cart/totals` | GET | Get recalculated totals |

#### PATCH /api/v1/cart/items/:itemId

**Request:**
```json
{
  "quantity": 3
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "item_1",
    "cartId": "cart_123",
    "quantity": 3,
    "subtotal": 7500,
    "shippingEstimate": 150,
    "total": 7650
  }
}
```

#### DELETE /api/v1/cart/items/:itemId

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "item_1",
    "removed": true,
    "canRestoreUntil": "2026-05-03T10:30:00Z",
    "subtotal": 2500,
    "shippingEstimate": 150,
    "total": 2650
  }
}
```

#### POST /api/v1/cart/items/:itemId/restore

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "item_1",
    "restored": true,
    "quantity": 2,
    "subtotal": 8200,
    "shippingEstimate": 150,
    "total": 8350
  }
}
```

#### GET /api/v1/cart/totals

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subtotal": 8200,
    "shippingEstimate": 150,
    "discount": 0,
    "codFee": 0,
    "total": 8350,
    "itemCount": 3,
    "breakdown": [
      { "itemId": "item_1", "name": "Gucci Guilty 50ml", "quantity": 2, "unitPrice": 2500, "lineTotal": 5000 },
      { "itemId": "item_2", "name": "Dior Sauvage", "quantity": 1, "unitPrice": 3200, "lineTotal": 3200 }
    ]
  }
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| itemId | Must exist in cart | ITEM_NOT_FOUND |
| quantity | Must be >= 1 and <= stock | INVALID_QUANTITY, INSUFFICIENT_STOCK |
| quantity | Setting to 0 triggers removal | (auto-remove) |

### Shipping Estimate Calculation

| Order Value | Shipping |
|-------------|----------|
| Under BDT 1,000 | BDT 150 |
| BDT 1,000 - 5,000 | BDT 100 |
| Over BDT 5,000 | FREE |

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Continue using `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names
4. **API Versioning**: All endpoints under `/api/v1/`
5. **Real-time Updates**: Totals recalculate server-side for accuracy

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── cart/
│       │   │   ├── components/
│       │   │   │   ├── cart-page.tsx (full cart with quantity controls)
│       │   │   │   ├── cart-item-row.tsx (individual item with +/-)
│       │   │   │   ├── quantity-selector.tsx (+/- input component)
│       │   │   │   ├── remove-item-button.tsx
│       │   │   │   ├── cart-totals.tsx (subtotal, shipping, total)
│       │   │   │   │   └── removed-item-toast.tsx (undo prompt)
│       │   │   │   ├── hooks/
│       │   │   │   ├── use-update-cart-quantity.ts
│       │   │   │   ├── use-remove-from-cart.ts
│       │   │   │   └── use-restore-cart-item.ts
│       │   │   │   └── types/
│       │   │   │       └── index.ts (extend from 3.1)
│       │   │   └── stores/
│       │   │       └── cart-store.ts (extend with undo state)
│       │   └── products/
│       │       └── components/
│       │           └── product-card.tsx (extend with quick quantity)
│       └── lib/
│       │   └── api-client.ts (extend with PATCH, DELETE)
│
├── server/
│   └── src/
│       ├── controllers/
│       │   └── cart-controller.ts (extend with update endpoints)
│       ├── services/
│       │   ├── cart-service.ts (extend with quantity logic)
│       │   └── shipping-service.ts (for estimates)
│       ├── repositories/
│       │   └── cart-repository.ts (extend with update methods)
│       └── routes/
│           └── cart-routes.ts (extend with new endpoints)
│
└── shared/
    └── src/
        └── types/
            └── cart.ts (extend with totals types)
```

### State Management

- **TanStack Query**: Cart data with `invalidateQueries` on mutation success
- **Zustand**: Removed items state for undo capability
- **React Query mutations**: Update quantity, remove item, restore item

---

## Previous Story Intelligence

### From Story 3.1 (Add items to cart)

**Key Learnings:**

1. **Cart Data Structure**: Items array with product, variant, quantity, price
2. **Low Stock Warning**: Shows warning for < 5 items (reuse in quantity selector)
3. **TanStack Query Hooks**: useCart, useAddToCart pattern to extend
4. **API Response Format**: Success wrapper with metadata
5. **Error Handling**: Error codes (ITEM_NOT_FOUND, etc.)

**Files Created in Story 3.1:**

- `packages/web/src/features/cart/components/add-to-cart-button.tsx`
- `packages/web/src/features/cart/hooks/use-cart.ts`
- `packages/server/src/services/cart-service.ts`
- `packages/server/src/repositories/cart-repository.ts`

**Reuse for Story 3.2:**

- Cart data structure for item display
- TanStack Query hooks as base for mutations
- Error handling pattern
- Low stock warning component

---

## Latest Tech Information

### Quantity Selector Patterns (2026)

```tsx
const QuantitySelector = ({ item, onUpdate }) => {
  const [quantity, setQuantity] = useState(item.quantity);

  const handleDecrement = () => {
    if (quantity > 1) {
      onUpdate(item.id, quantity - 1);
    } else {
      // Trigger remove confirmation
      onRemove(item.id);
    }
  };

  const handleIncrement = () => {
    onUpdate(item.id, quantity + 1);
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleDecrement} disabled={quantity <= 1}>
        -
      </button>
      <input
        type="number"
        value={quantity}
        onChange={(e) => onUpdate(item.id, parseInt(e.target.value))}
        min={1}
        max={item.maxStock}
      />
      <button onClick={handleIncrement} disabled={quantity >= item.maxStock}>
        +
      </button>
    </div>
  );
};
```

### Remove with Undo Pattern

```tsx
const useRemoveWithUndo = () => {
  const { mutate: removeItem } = useRemoveFromCart();
  const [removedItem, setRemovedItem] = useState(null);

  const handleRemove = (item) => {
    removeItem(item.id, {
      onSuccess: (data) => {
        setRemovedItem({ ...item, canRestoreUntil: data.canRestoreUntil });
        // Show toast with undo option
        showToast(`${item.name} removed`, {
          action: {
            label: 'Undo',
            onClick: () => restoreItem(item.id)
          }
        });
      }
    });
  };

  return { handleRemove, removedItem, setRemovedItem };
};
```

### Real-time Totals Calculation

```typescript
// Server-side calculation
const calculateCartTotals = (cart: Cart): CartTotals => {
  const subtotal = cart.items.reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0
  );

  const shippingEstimate = subtotal < 1000 ? 150 :
                       subtotal < 5000 ? 100 : 0;

  const total = subtotal + shippingEstimate;

  return { subtotal, shippingEstimate, total };
};
```

---

## Implementation Checklist

### Backend Tasks

- [ ] Extend cart-repository with updateQuantity method
- [ ] Extend cart-repository with removeItem method
- [ ] Extend cart-repository with restoreItem method
- [ ] Extend cart-service with quantity update logic
- [ ] Extend cart-service with stock validation
- [ ] Implement PATCH /api/v1/cart/items/:itemId
- [ ] Implement DELETE /api/v1/cart/items/:itemId
- [ ] Implement POST /api/v1/cart/items/:itemId/restore
- [ ] Implement GET /api/v1/cart/totals
- [ ] Add shipping estimate calculation
- [ ] Add stock validation on quantity change
- [ ] Add removed item timestamp for undo window (15 min)

### Frontend Tasks

- [ ] Create cart-page.tsx (full cart layout)
- [ ] Create cart-item-row.tsx (item with quantity controls)
- [ ] Create quantity-selector.tsx (+/- component)
- [ ] Create remove-item-button.tsx
- [ ] Create cart-totals.tsx (breakdown display)
- [ ] Create removed-item-toast.tsx (undo prompt)
- [ ] Create use-update-cart-quantity.ts mutation hook
- [ ] Create use-remove-from-cart.ts mutation hook
- [ ] Create use-restore-cart-item.ts mutation hook
- [ ] Extend cart-store.ts with removed item state
- [ ] Extend api-client.ts with new endpoints
- [ ] Add quantity controls to cart dropdown
- [ ] Add quantity controls to product cards (quick view)

### UX/UI Tasks

- [ ] Quantity +/- buttons work smoothly
- [ ] Input allows direct number entry
- [ ] Loading state during quantity update
- [ ] Totals update immediately
- [ ] Remove shows undo toast for 15 seconds
- [ ] "Undo" button restores item
- [ ] Stock limit shown in quantity input
- [ ] Empty cart works (depends on Story 3.3)
- [ ] Mobile: Quantity controls accessible
- [ ] Animation on quantity change (subtle)
- [ ] Remove confirmation not needed (undo handles it)

---

## Success Criteria

The cart edit feature is complete when:

1. **Quantity Update**: Changing quantity updates immediately
2. **Totals Recalculate**: Subtotal and total update in real-time
3. **Remove Item**: Item removed from cart view
4. **Undo Capability**: Removed item can be restored within session
5. **Stock Validation**: Cannot exceed available stock
6. **Shipping Estimate**: Shows based on order value
7. **Low Stock Warning**: Shows at quantity selector
8. **Mobile**: Works on mobile devices
9. **Performance**: Updates complete within 1 second
10. **Error Handling**: Clear errors for failures

---

## Integration Points

### With Story 3.1 (Cart persistence)

- Uses existing cart data structure
- Extends cart mutations
- Inherits low stock warning pattern

### With Epic 2 (Product pages)

- Product cards show current cart quantity
- Quick add from category pages

### With Story 3.3 (Empty cart)

- Empty cart shows when all items removed
- Browse prompts link to products

### With Story 3.4 (Pre-orders)

- Pre-order quantity adjustments work
- Waitlist status shown in cart

### With Epic 4 (Checkout)

- Cart data flows to checkout
- Shipping estimate pre-calculated

---

## Edge Cases to Handle

1. **Quantity Exceeds Stock**: Show error with max available
2. **Zero Quantity**: Trigger remove flow (not error)
3. **Concurrent Edit**: Last write wins with notification
4. **Network Failure**: Optimistic update with rollback
5. **Item Out of Stock Mid-Edit**: Alert and remove from totals
6. **Price Change During Edit**: Show updated price, recalculate
7. **Undo Timeout**: Item permanently removed after 15 min
8. **Multiple Undos**: Last removed item restored only
9. **Cart Expired**: Clear with message (Story 3.1 handles)
10. **Minimum Order**: Cart below minimum shows warning (future)

---

## Notes

- Consider "Save for later" feature alongside remove
- Consider "Move to wishlist" from cart
- Track removal reason for analytics
- Consider bulk selection for remove (future)

- **Status**: ready-for-dev
- **Story Context**: Full implementation context created - ready for dev agent execution