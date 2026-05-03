# Story 4.1: Complete checkout as guest or returning customer

**Status**: ready-for-dev
**Story ID**: 4.1
**Story Key**: 4-1-complete-checkout-as-guest-or-returning-customer
**Epic**: Epic 4 - Checkout, Delivery, and Payment
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a shopper,**
**I want to check out with or without an account,**
**so that I can buy with minimal friction.**

### Business Context

This story implements the core checkout flow — the critical conversion point where cart becomes order. It builds on Epic 3 (cart management) where customers add items and manage their cart. The checkout must support both guest users (no account) and returning customers (with stored information), providing a seamless path to purchase.

Key business value: Checkout is where transactions happen. A frictionless checkout directly impacts conversion rate and revenue. This story also lays the foundation for Story 4.2 (address validation), Story 4.3 (delivery options), Story 4.4 (payment via SSLCOMMERZ), Story 4.5 (COD), Story 4.6 (payment handling), and Story 4.7 (guest order lookup).

### Acceptance Criteria

#### AC1: Guest Checkout Without Account

**Given** I am a guest
**When** I start checkout
**Then** I can continue without creating an account
**And** I provide email, mobile, and shipping information

#### AC2: Returning Customer Checkout

**Given** I am a returning customer
**When** I start checkout
**Then** stored information is pre-populated where available

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR12 | Guests must be able to complete checkout without account creation |
| FR13 | Guest checkout must capture email, mobile number, shipping address, and payment information |
| FR44 | Checkout must support guest users and returning customers |
| FR45 | Checkout must include address, delivery options, payment, and review steps |
| FR46 | Returning customers must have stored information pre-populated in checkout |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR5 | Returning customer checkout must complete within 5 minutes |
| NFR6 | Payment processing must complete within 30 seconds for successful transactions |

---

## Technical Requirements

### Database Schema (Prisma)

This story requires Order, OrderItem, Address, and GuestOrder models. The checkout flow creates orders from cart items.

```prisma
model Order {
  id              String        @id @default(uuid())
  orderNumber     String        @unique @map("order_number")
  userId          String?       @map("user_id") // NULL for guest orders
  guestEmail      String?       @map("guest_email")
  guestToken      String?       @map("guest_token")
  status          OrderStatus  @default(PENDING)
  subtotal        Decimal       @map("subtotal")
  shippingCost    Decimal       @map("shipping_cost") @default(0)
  tax             Decimal       @map("tax") @default(0)
  discount        Decimal       @map("discount") @default(0)
  total           Decimal       @map("total")
  currency        String        @default("BDT") @map("currency")
  
  shippingAddress Json          @map("shipping_address") // Structured address
  billingAddress  Json?         @map("billing_address")
  
  deliveryMethod  String?       @map("delivery_method") // standard, express
  deliverySlot    Json?         @map("delivery_slot")
  
  notes           String?      @map("notes")
  termsAccepted   Boolean      @default(false) @map("terms_accepted")
  
  items           OrderItem[]
  payments        Payment[]
  
  user            User?        @relation(fields: [userId], references: [id])
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  @@index([userId])
  @@index([guestEmail])
  @@index([orderNumber])
  @@map("orders")
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

model OrderItem {
  id            String   @id @default(uuid())
  orderId       String   @map("order_id")
  productId     String   @map("product_id")
  variantId     String?  @map("variant_id")
  productName   String   @map("product_name")
  variantName   String?  @map("variant_name")
  sku           String?  @map("sku")
  quantity      Int      @map("quantity")
  unitPrice     Decimal  @map("unit_price")
  totalPrice    Decimal  @map("total_price")
  imageUrl      String?  @map("image_url")
  
  order         Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product       Product  @relation(fields: [productId], references: [id])
  variant       Variant? @relation(fields: [variantId], references: [id])

  @@map("order_items")
}

model Address {
  id            String      @id @default(uuid())
  userId        String      @map("user_id")
  name          String      @map("name")
  street        String      @map("street")
  area          String      @map("area")
  city          String      @map("city")
  district      String      @map("district")
  division      String?     @map("division")
  postalCode    String?     @map("postal_code")
  country       String      @default("Bangladesh") @map("country")
  phone         String      @map("phone")
  isDefault     Boolean     @default(false) @map("is_default")
  addressType   AddressType @default(SHIPPING) @map("address_type")
  
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  @@index([userId])
  @@map("addresses")
}

enum AddressType {
  SHIPPING
  BILLING
  BOTH
}

model GuestOrder {
  id            String   @id @default(uuid())
  orderNumber   String   @unique @map("order_number")
  email         String   @map("email")
  phone         String?  @map("phone")
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([email])
  @@index([orderNumber])
  @@map("guest_orders")
}
```

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/checkout/initiate` | POST | Start checkout, validate cart, get order summary |
| `/api/v1/checkout/address` | POST | Save shipping address |
| `/api/v1/checkout/delivery` | POST | Select delivery option |
| `/api/v1/checkout/review` | GET | Get order review data |
| `/api/v1/checkout/complete` | POST | Finalize order (triggers payment) |
| `/api/v1/addresses` | GET | Get user's saved addresses |
| `/api/v1/addresses` | POST | Save new address |
| `/api/v1/addresses/:id` | PUT | Update address |
| `/api/v1/addresses/:id` | DELETE | Delete address |
| `/api/v1/guest/order/:orderNumber` | GET | Guest order lookup |

#### POST /api/v1/checkout/initiate

**Request:**
```json
{
  "cartId": "cart_123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "checkoutId": "checkout_abc",
    "cart": {
      "items": [...],
      "subtotal": 8200,
      "itemCount": 3
    },
    "customer": {
      "type": "returning" | "guest",
      "email": "user@example.com",
      "name": "John Doe",
      "savedAddresses": [...]
    },
    "steps": {
      "address": "pending",
      "delivery": "pending",
      "payment": "pending",
      "review": "pending"
    }
  },
  "metadata": { "expiresAt": "2026-05-03T11:00:00Z" }
}
```

#### POST /api/v1/checkout/address

**Request:**
```json
{
  "checkoutId": "checkout_abc",
  "address": {
    "name": "John Doe",
    "street": "123 Main Street",
    "area": "Gulshan",
    "city": "Dhaka",
    "district": "Dhaka",
    "division": "Dhaka",
    "postalCode": "1212",
    "phone": "+8801XXXXXXXXX"
  },
  "saveAddress": true,
  "useExistingAddressId": "addr_123" // optional, for returning customers
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "addressValidated": true,
    "serviceable": true,
    "deliveryEstimate": "7-10 business days"
  },
  "metadata": {}
}
```

#### POST /api/v1/checkout/complete

**Request:**
```json
{
  "checkoutId": "checkout_abc",
  "paymentMethod": "card" | "mobile_wallet" | "cod",
  "paymentDetails": {
    // For card/mobile wallet - payment gateway will handle
  },
  "termsAccepted": true
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "orderId": "order_xyz",
    "orderNumber": "AUREA-20260503-0001",
    "status": "PENDING",
    "total": 8700,
    "paymentRequired": true,
    "paymentUrl": "https://sslcommerz/pay/..." // for card/wallet
  },
  "metadata": {}
}
```

#### GET /api/v1/guest/order/:orderNumber

**Request:** Query param `?email=guest@example.com`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orderNumber": "AUREA-20260503-0001",
    "status": "PROCESSING",
    "items": [...],
    "total": 8700,
    "createdAt": "2026-05-03T10:00:00Z"
  },
  "metadata": {}
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| checkoutId | Must be valid and not expired | CHECKOUT_EXPIRED, CHECKOUT_INVALID |
| email | Valid format, required for guest | INVALID_EMAIL, EMAIL_REQUIRED |
| phone | Bangladesh format (+8801XXXXXXXX) | INVALID_PHONE |
| address.street | Required, max 200 chars | ADDRESS_REQUIRED |
| address.area | Required | AREA_REQUIRED |
| address.city | Required | CITY_REQUIRED |
| address.district | Required | DISTRICT_REQUIRED |
| address.phone | Required, valid format | PHONE_REQUIRED, INVALID_PHONE |
| termsAccepted | Must be true | TERMS_REQUIRED |
| paymentMethod | Must be valid option | INVALID_PAYMENT_METHOD |

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (orders, order_items, addresses)
4. **API Versioning**: All endpoints under `/api/v1/`
5. **Checkout Session**: 30-minute expiry, store in Redis
6. **Guest Order**: Store email + order number for lookup
7. **Address Serviceability**: Validate against Bangladesh service areas
8. **Terms Acceptance**: Required before payment step

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── checkout/
│       │   │   ├── components/
│       │   │   │   ├── checkout-flow.tsx (main container)
│       │   │   │   ├── checkout-steps.tsx (progress indicator)
│       │   │   │   ├── address-form.tsx
│       │   │   │   ├── address-selector.tsx (saved addresses)
│       │   │   │   ├── delivery-options.tsx
│       │   │   │   ├── payment-selector.tsx
│       │   │   │   ├── order-summary.tsx
│       │   │   │   ├── guest-login-prompt.tsx
│       │   │   │   └── terms-checkbox.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── use-checkout.ts
│       │   │   │   ├── use-checkout-address.ts
│       │   │   │   ├── use-checkout-delivery.ts
│       │   │   │   └── use-checkout-complete.ts
│       │   │   ├── types/
│       │   │   │   └── index.ts
│       │   │   └── stores/
│       │   │       └── checkout-store.ts
│       │   └── orders/
│       │       └── components/
│       │           └── guest-order-lookup.tsx
│       ├── pages/
│       │   └── checkout/
│       │       ├── index.tsx (main checkout page)
│       │       ├── success.tsx (order confirmation)
│       │       └── failure.tsx (payment failed)
│       └── lib/
│           └── api-client.ts (extend with checkout endpoints)
│
├── server/
│   └── src/
│       ├── controllers/
│       │   ├── checkout-controller.ts
│       │   ├── address-controller.ts
│       │   └── guest-order-controller.ts
│       ├── services/
│       │   ├── checkout-service.ts
│       │   ├── address-service.ts
│       │   ├── order-service.ts
│       │   └── delivery-service.ts
│       ├── repositories/
│       │   ├── order-repository.ts
│       │   ├── address-repository.ts
│       │   └── cart-repository.ts
│       ├── middleware/
│       │   ├── checkout-validator.ts
│       │   └── address-serviceability.ts
│       └── routes/
│           ├── checkout-routes.ts
│           ├── address-routes.ts
│           └── guest-order-routes.ts
│
└── shared/
    └── src/
        └── types/
            ├── checkout.ts
            ├── order.ts
            └── address.ts
```

### State Management

- **TanStack Query**: Fetch checkout session, save address, complete checkout
- **Zustand**: Checkout flow state (current step, selected options)
- **React Context**: Auth state for returning customer detection
- **URL State**: Track checkout step in URL for refresh resilience

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @tanstack/react-query | ^5.x | Checkout data fetching |
| zustand | ^4.x | Checkout UI state |
| react-hook-form | ^7.x | Address form handling |
| zod | ^3.x | Form validation |
| @hookform/resolvers | ^3.x | Zod + React Hook Form |

---

## Previous Story Intelligence

### From Epic 3 (Stories 3.1 - 3.5)

**Key Learnings:**

1. **Cart Data Structure**: Cart items already have product data needed for order creation
2. **Guest Cart Pattern**: Guest token handling established in Story 3.1
3. **Price Storage**: Cart stores price at time of adding — use for order
4. **Low Stock Warnings**: Already handled in cart — check before checkout
5. **Inventory Sync**: Story 3.5 ensures stock is current

**Files Created in Epic 3:**

- `packages/web/src/features/cart/components/cart-button.tsx`
- `packages/web/src/features/cart/hooks/use-cart.ts`
- `packages/server/src/services/cart-service.ts`
- `packages/server/src/repositories/cart-repository.ts`

**Reuse these for Story 4.1:**

- Cart data for order summary
- Guest token for guest checkout
- Cart item prices for order line items

### From Epic 1 (Stories 1.1 - 1.5)

**Key Learnings:**

1. **Authentication Flow**: User vs guest identification pattern established
2. **Address Model**: Already have address structure from user accounts
3. **Session Management**: JWT and session handling in place
4. **Validation**: Zod validation patterns established

**Reuse for Story 4.1:**

- User identification for returning customer
- Address validation patterns
- Form validation with Zod

---

## Git Intelligence Summary

From Epic 1, Epic 2, and Epic 3, the codebase has:

- Monorepo structure with pnpm workspaces (Story 1.1)
- User authentication with JWT and Redis sessions (Epic 1)
- Product, Category, Brand, Variant, Cart, CartItem models in Prisma (Epics 2, 3)
- Cart functionality with guest support (Epic 3)
- API response wrapper pattern consistently used
- TanStack Query for data fetching
- Zustand for client state
- Zod validation patterns

For this story, we need to:

- Add Order, OrderItem, Address, GuestOrder models to Prisma
- Create checkout API endpoints (initiate, address, delivery, review, complete)
- Create address management endpoints (CRUD)
- Create guest order lookup endpoint
- Implement checkout flow UI (multi-step form)
- Handle returning customer pre-population
- Implement guest checkout without account
- Add terms acceptance requirement

---

## Latest Tech Information

### Multi-Step Checkout UX (2026)

```tsx
const CheckoutFlow = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = ['Address', 'Delivery', 'Payment', 'Review'];

  return (
    <div>
      <CheckoutSteps current={currentStep} steps={steps} />
      {currentStep === 0 && <AddressForm />}
      {currentStep === 1 && <DeliveryOptions />}
      {currentStep === 2 && <PaymentSelector />}
      {currentStep === 3 && <OrderReview />}
    </div>
  );
};
```

### Address Autocomplete for Bangladesh

```typescript
// Bangladesh address structure
interface BangladeshAddress {
  name: string;
  street: string;
  area: string; // e.g., Gulshan, Banani, Dhanmondi
  city: string; // e.g., Dhaka, Chattogram
  district: string;
  division: string; // e.g., Dhaka, Chattogram, Sylhet
  postalCode?: string;
  phone: string;
}

// Serviceability check
const checkServiceability = async (address: BangladeshAddress) => {
  const serviceableAreas = ['dhaka', 'chattogram', 'sylhet', 'khulna'];
  return serviceableAreas.includes(address.city.toLowerCase());
};
```

### Guest Checkout Flow

```typescript
// Guest checkout detection
const determineCheckoutType = (user: User | null, guestToken: string | null) => {
  if (user) {
    return { type: 'returning', userId: user.id };
  }
  if (guestToken) {
    return { type: 'guest', guestToken };
  }
  return { type: 'new_guest' };
};
```

---

## Implementation Checklist

### Backend Tasks

- [ ] Add Order model to Prisma schema
- [ ] Add OrderItem model to Prisma schema
- [ ] Add Address model to Prisma schema
- [ ] Add GuestOrder model to Prisma schema
- [ ] Create database migration
- [ ] Create order-repository with CRUD operations
- [ ] Create address-repository with CRUD operations
- [ ] Create checkout-service with business logic
- [ ] Create POST /api/v1/checkout/initiate endpoint
- [ ] Create POST /api/v1/checkout/address endpoint
- [ ] Create POST /api/v1/checkout/delivery endpoint
- [ ] Create GET /api/v1/checkout/review endpoint
- [ ] Create POST /api/v1/checkout/complete endpoint
- [ ] Create GET /api/v1/addresses endpoint
- [ ] Create POST /api/v1/addresses endpoint
- [ ] Create PUT /api/v1/addresses/:id endpoint
- [ ] Create DELETE /api/v1/addresses/:id endpoint
- [ ] Create GET /api/v1/guest/order/:orderNumber endpoint
- [ ] Implement address serviceability validation
- [ ] Implement checkout session management (30 min expiry)
- [ ] Implement order number generation
- [ ] Test guest checkout flow
- [ ] Test returning customer checkout flow

### Frontend Tasks

- [ ] Create checkout-flow.tsx (main container)
- [ ] Create checkout-steps.tsx (progress indicator)
- [ ] Create address-form.tsx component
- [ ] Create address-selector.tsx (saved addresses)
- [ ] Create delivery-options.tsx component
- [ ] Create payment-selector.tsx component
- [ ] Create order-summary.tsx component
- [ ] Create guest-login-prompt.tsx component
- [ ] Create terms-checkbox.tsx component
- [ ] Create use-checkout.ts TanStack Query hook
- [ ] Create use-checkout-address.ts mutation hook
- [ ] Create use-checkout-complete.ts mutation hook
- [ ] Create checkout-store.ts (Zustand for flow state)
- [ ] Create guest-order-lookup.tsx component
- [ ] Extend api-client.ts with checkout endpoints
- [ ] Integrate checkout with cart page
- [ ] Handle returning customer pre-population
- [ ] Implement checkout step navigation
- [ ] Add checkout success page
- [ ] Add checkout failure page

### UX/UI Tasks

- [ ] Checkout shows progress steps
- [ ] Address form validates Bangladesh format
- [ ] Saved addresses show for returning customers
- [ ] Delivery options show based on address
- [ ] Order summary shows all costs
- [ ] Terms checkbox required before payment
- [ ] Guest users can complete without login
- [ ] Returning customers see pre-populated data
- [ ] Checkout works on mobile
- [ ] Loading states for each step
- [ ] Error states with clear messages

---

## Success Criteria

The checkout feature is complete when:

1. **Guest Checkout**: Guest users can complete checkout without account
2. **Returning Customer**: Logged-in users see pre-populated information
3. **Address Form**: Captures all required Bangladesh address fields
4. **Address Validation**: Serviceability check runs and blocks invalid addresses
5. **Saved Addresses**: Returning customers can use saved addresses
6. **Delivery Options**: Shows standard/express based on address
7. **Order Summary**: Shows items, subtotal, shipping, total
8. **Terms Required**: Must accept terms before payment
9. **Order Created**: Complete checkout creates order
10. **Guest Lookup**: Guest can find order by number + email
11. **Performance**: Checkout completes within 5 minutes
12. **Mobile**: Works on mobile devices

---

## Integration Points

### With Epic 3 (Cart Management)

- Cart page has "Proceed to Checkout" button
- Cart items become order items
- Cart subtotal used for order subtotal
- Cart validates stock before checkout

### With Epic 1 (Authentication)

- User identified by JWT token
- Returning customer detected via auth
- Saved addresses from user profile
- Guest token for guest checkout

### With Story 4.2 (Address Validation)

- Address form reused
- Serviceability check enhanced
- Multiple address support

### With Story 4.3 (Delivery Options)

- Delivery options component added
- Shipping cost calculation
- Delivery slot selection

### With Story 4.4 (Payment via SSLCOMMERZ)

- Payment selector integrated
- Payment initiation on checkout complete
- Payment redirect handling

### With Story 4.5 (COD)

- COD option in payment selector
- COD fee calculation
- OTP verification flow

### With Story 4.6 (Payment Handling)

- Success/failure handling
- Order status update
- Confirmation page

### With Story 4.7 (Guest Order Lookup)

- Guest order lookup page
- Post-purchase account creation offer

---

## Edge Cases to Handle

1. **Address Serviceability**: Address not in serviceable area — show error, suggest alternatives
2. **Cart Conflict**: Items removed/price changed during checkout — show updated info, allow re-add
3. **Session Timeout**: Checkout session expires — preserve entered data, allow resume
4. **Minimum Order**: Cart below minimum — show warning, suggest add more
5. **Guest Email Exists**: Guest email matches existing account — prompt to login or continue as guest
6. **Stock Changes**: Item out of stock during checkout — show error, remove from cart
7. **Duplicate Order**: Double-click on complete — idempotency check, prevent duplicate
8. **Payment Failure**: Payment fails — preserve checkout, allow retry
9. **Guest Order Lookup**: Wrong email/order number — show clear error, allow retry
10. **Terms Not Accepted**: User tries to proceed without accepting — block with message

---

## Notes

- Consider express checkout (one-click) for returning customers (future enhancement)
- Consider saved payment methods for returning customers (future Story 4.4)
- Consider order notes/special instructions field
- Track checkout abandonment for analytics
- Consider abandoned checkout email recovery

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created