# Story 4.7: Offer guest order lookup and post-purchase account creation

**Status**: ready-for-dev  
**Story ID**: 4.7  
**Story Key**: 4-7-offer-guest-order-lookup-and-post-purchase-account-creation  
**Epic**: Epic 4 - Checkout, Delivery, and Payment  
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a guest customer,**  
**I want to track my order and create an account later,**  
**so that I can keep access without forcing sign-up first.**

### Business Context

This story implements guest order lookup and post-purchase account creation for Aurea. After completing a purchase as a guest, customers should be able to track their order without creating an account, and be offered the option to create an account that links to their order history.

Key business value: Reduces friction in checkout (guest checkout increases conversion), enables order tracking for non-registered customers, and provides a path to convert guests into registered users for repeat purchases and better customer lifetime value.

This story builds directly on:
- Story 4.6 (Payment success/failure handling) — order is created after payment
- Story 4.1 (Guest checkout) — guest checkout flow already captures contact info
- Epic 5 (Order tracking) — will use the order status infrastructure

Key dependencies:
- Order exists after successful payment (from Story 4.6)
- Guest checkout captures email and mobile number
- Order number is generated and displayed
- Account creation flow from Epic 1

### Acceptance Criteria

#### AC1: Guest Order Lookup - Access

**Given** I am a guest customer with an order number and the email used during checkout  
**When** I access the order lookup page  
**Then** I can enter my order number and email to retrieve my order  
**And** I can view the order details without creating an account

#### AC2: Guest Order Lookup - Order Details

**Given** I successfully look up my order as a guest  
**When** the order details are displayed  
**Then** I can see the order status (confirmed, processing, shipped, delivered)  
**And** I can see the order items, quantities, and prices  
**And** I can see the delivery address and delivery method  
**And** I can see the payment method and total paid

#### AC3: Guest Order Lookup - Security

**Given** I enter an incorrect order number or email  
**When** I attempt to look up the order  
**Then** an error message indicates the combination is invalid  
**And** no order details are revealed

#### AC4: Post-Purchase Account Creation - Offer

**Given** I complete a purchase as a guest  
**When** I reach the order confirmation page  
**Then** I am offered the option to create an account  
**And** the offer explains benefits (track orders, faster checkout, order history)

#### AC5: Post-Purchase Account Creation - Linking

**Given** I choose to create an account after purchase  
**When** I register with the same email used for the guest order  
**Then** the guest order is linked to my new account  
**And** I can view the order in my account order history

#### AC6: Post-Purchase Account Creation - Different Email

**Given** I create an account with a different email than my guest order  
**When** I try to link the order  
**Then** the system explains the order cannot be linked  
**And** I can still create the account but the order remains guest

#### AC7: Order Lookup Page Accessibility

**Given** I am not logged in  
**When** I navigate to the order lookup page  
**Then** the page is accessible from the header navigation  
**And** the page is accessible from the order confirmation page

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR14 | Guest orders must be retrievable using order number and email |
| FR15 | Guest users must be offered account creation after purchase |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR9 | Customer data must be encrypted at rest and in transit |
| NFR10 | Access control must follow least-privilege principles |

---

## Technical Requirements

### Database Schema (Prisma)

This story extends the Order model to support guest order lookup and account linking.

```prisma
// Order model - extended with guest lookup support
model Order {
  id              String    @id @default(uuid())
  orderNumber     String    @unique @map("order_number")
  status          String    @default("pending") @map("status")
  // pending, confirmed, processing, shipped, delivered, cancelled, refunded

  // Customer identification
  isGuest         Boolean   @default(true) @map("is_guest")
  guestEmail      String?   @map("guest_email")  // Email used for guest checkout
  guestMobile     String?   @map("guest_mobile") // Mobile used for guest checkout

  // Account linking (for post-purchase account creation)
  userId          String?   @map("user_id") // Linked user account (if created after purchase)
  user            User?     @relation(fields: [userId], references: [id])

  // ... existing fields

  @@index([orderNumber])
  @@index([guestEmail])
  @@map("orders")
}

// User model - extended with order linking
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  mobile          String?   @unique
  // ... existing fields

  // Orders - including guest orders linked after account creation
  orders          Order[]

  @@map("users")
}
```

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/orders/lookup` | POST | Look up order by order number and email |
| `/api/v1/orders/:orderId/link-account` | POST | Link guest order to user account |
| `/api/v1/orders/:orderId/verify-email` | POST | Verify email matches order for lookup |

#### POST /api/v1/orders/lookup

**Request:**
```json
{
  "orderNumber": "AUR-2026-0500123",
  "email": "customer@example.com"
}
```

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "orderId": "order_123",
    "orderNumber": "AUR-2026-0500123",
    "status": "confirmed",
    "orderDate": "2026-05-03T14:30:00Z",
    "items": [
      {
        "productName": "Chanel No. 5",
        "variant": "100ml",
        "quantity": 1,
        "price": 8500
      }
    ],
    "delivery": {
      "address": "Flat 3B, House 45, Road 12, Dhanmondi",
      "city": "Dhaka",
      "method": "Express Delivery",
      "estimatedDelivery": "2026-05-06"
    },
    "payment": {
      "method": "Card",
      "total": 9000
    },
    "canCreateAccount": true
  },
  "metadata": {}
}
```

**Response (200 - Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "No order found with this order number and email combination"
  }
}
```

#### POST /api/v1/orders/:orderId/link-account

**Request:**
```json
{
  "userId": "user_456"
}
```

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "linked": true,
    "message": "Order successfully linked to your account"
  },
  "metadata": {}
}
```

**Response (200 - Email Mismatch):**
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_MISMATCH",
    "message": "This order was placed with a different email address and cannot be linked"
  }
}
```

### Guest Order Lookup Flow

```typescript
// Backend - Guest order lookup
const lookupGuestOrder = async (orderNumber: string, email: string): Promise<OrderLookupResult> => {
  // Find order by order number
  const order = await orderRepository.findByOrderNumber(orderNumber);
  
  if (!order) {
    throw new NotFoundError('ORDER_NOT_FOUND', 'No order found with this order number and email combination');
  }
  
  // Verify email matches (case-insensitive)
  if (order.guestEmail?.toLowerCase() !== email.toLowerCase()) {
    // Don't reveal if order exists - show generic error
    throw new NotFoundError('ORDER_NOT_FOUND', 'No order found with this order number and email combination');
  }
  
  // Return order details (excluding sensitive data)
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    orderDate: order.createdAt,
    items: order.items.map(item => ({
      productName: item.productName,
      variant: item.variant,
      quantity: item.quantity,
      price: item.price
    })),
    delivery: {
      address: order.shippingAddress,
      city: order.shippingCity,
      method: order.deliveryMethod,
      estimatedDelivery: order.estimatedDelivery
    },
    payment: {
      method: order.paymentMethod,
      total: order.total
    },
    canCreateAccount: order.isGuest && !order.userId
  };
};
```

### Post-Purchase Account Creation Flow

```typescript
// Backend - Link guest order to new account
const linkOrderToAccount = async (orderId: string, userId: string): Promise<LinkResult> => {
  const order = await orderRepository.findById(orderId);
  
  if (!order) {
    throw new NotFoundError('ORDER_NOT_FOUND', 'Order not found');
  }
  
  // Check if order is a guest order
  if (!order.isGuest) {
    throw new BadRequestError('NOT_GUEST_ORDER', 'This order is already linked to an account');
  }
  
  // Get user to compare email
  const user = await userRepository.findById(userId);
  
  // Check if email matches (case-insensitive)
  if (user.email.toLowerCase() !== order.guestEmail?.toLowerCase()) {
    return {
      success: false,
      error: {
        code: 'EMAIL_MISMATCH',
        message: 'This order was placed with a different email address and cannot be linked'
      }
    };
  }
  
  // Link the order to the user account
  await orderRepository.update(orderId, {
    userId: userId,
    isGuest: false
  });
  
  return {
    success: true,
    linked: true,
    message: 'Order successfully linked to your account'
  };
};
```

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (orders, users)
4. **API Versioning**: All endpoints under `/api/v1/`
5. **Security**: Don't reveal if order exists with different email (prevent enumeration)
6. **Email Comparison**: Case-insensitive email matching
7. **Account Linking**: Only link if emails match

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── orders/
│       │   │   ├── components/
│       │   │   │   ├── order-lookup-form.tsx
│       │   │   │   ├── guest-order-details.tsx
│       │   │   │   ├── account-creation-offer.tsx
│       │   │   │   └── order-success-banner.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── use-order-lookup.ts
│       │   │   │   └── use-link-order.ts
│       │   │   ├── pages/
│       │   │   │   └── order-lookup.tsx
│       │   │   └── types/
│       │   │       └── index.ts
│       │   └── checkout/
│       │       └── components/
│       │           └── post-purchase-account-offer.tsx
│       └── pages/
│           └── orders/
│               └── lookup.tsx
│
├── server/
│   └── src/
│       ├── controllers/
│       │   └── order-controller.ts
│       ├── services/
│       │   └── order-service.ts
│       ├── repositories/
│       │   └── order-repository.ts
│       └── routes/
│           └── order-routes.ts
│
└── shared/
    └── src/
        └── types/
            └── order.ts
```

### State Management

- **TanStack Query**: Order lookup, account linking
- **Zustand**: Order lookup form state
- **React Context**: Post-purchase offer visibility

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| crypto | built-in | Secure token generation for order access |

---

## Previous Story Intelligence

### From Story 4.6 (Payment Success/Failure)

**Key Learnings:**

1. **Order Creation**: Orders are created after successful payment
2. **Order Number**: Order number is generated and displayed (AUR-YYYY-XXXXXX format)
3. **Guest Checkout**: Guest checkout captures email and mobile

**Reuse for Story 4.7:**
- Order model already has guestEmail and guestMobile from checkout
- Order number format for lookup
- Payment and delivery details already stored with order

### From Story 4.1 (Checkout Foundation)

**Key Learnings:**

1. **Guest Checkout**: Captures email, mobile, shipping info
2. **Checkout State**: Multi-step flow with state preservation

**Reuse for Story 4.7:**
- Guest checkout already stores email for order
- Order lookup builds on guest checkout data

### From Epic 1 (Authentication)

**Key Learnings:**

1. **User Registration**: Email and mobile validation
2. **Password Requirements**: 8+ characters, mixed case, number

**Reuse for Story 4.7:**
- Account creation uses existing registration flow
- Email validation for linking

---

## Git Intelligence Summary

From previous epics and stories, the codebase has:

- Monorepo structure with pnpm workspaces (Story 1.1)
- User authentication with JWT and Redis sessions (Epic 1)
- Product catalog with variants (Epic 2)
- Cart with 30-day persistence (Epic 3)
- Checkout flow (Stories 4.1, 4.2, 4.3)
- SSLCOMMERZ payment integration (Story 4.4)
- COD payment with OTP verification (Story 4.5)
- Payment success/failure handling (Story 4.6)
- API response wrapper pattern consistently used
- TanStack Query for data fetching
- Zustand for client state
- Order model with status tracking

For this story, we need to:

- Create guest order lookup endpoint
- Add order number and email verification
- Build order lookup UI page
- Add post-purchase account creation offer
- Implement order-to-account linking
- Handle email mismatch scenarios
- Secure order lookup against enumeration

---

## Latest Tech Information

### Guest Order Lookup Best Practices (2026)

```typescript
// Secure order lookup - prevent enumeration
const lookupOrder = async (orderNumber: string, email: string) => {
  // Always use consistent timing - don't reveal if order exists
  const order = await orderRepository.findByOrderNumber(orderNumber);
  
  if (!order) {
    // Wait random time to prevent timing attacks
    await sleep(randomDelay());
    throw new NotFoundError('ORDER_NOT_FOUND', 'No order found');
  }
  
  // Case-insensitive email comparison
  const emailMatches = order.guestEmail?.toLowerCase() === email.toLowerCase();
  
  if (!emailMatches) {
    // Same timing - don't reveal order exists
    await sleep(randomDelay());
    throw new NotFoundError('ORDER_NOT_FOUND', 'No order found');
  }
  
  return order;
};

// Rate limiting for lookup attempts
const rateLimitOrderLookup = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 lookups per window
  message: 'Too many lookup attempts. Please try again later.'
});
```

### Post-Purchase Account Creation UI Pattern

```tsx
// Frontend - Post-purchase account offer
const PostPurchaseAccountOffer = ({ orderNumber, guestEmail, onCreateAccount, onSkip }) => {
  return (
    <div className="account-offer-banner">
      <div className="offer-content">
        <h3>Create an account to track your order</h3>
        <p>
          Create a free account to:
        </p>
        <ul>
          <li>Track your order status instantly</li>
          <li>View your complete order history</li>
          <li>Speed up your next checkout</li>
          <li>Get exclusive offers and updates</li>
        </ul>
      </div>
      
      <div className="offer-actions">
        <Button onClick={onCreateAccount}>
          Create Account
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Maybe Later
        </Button>
      </div>
      
      <p className="email-note">
        We'll use {guestEmail} for your account
      </p>
    </div>
  );
};

// Frontend - Order lookup page
const OrderLookupPage = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const { mutate: lookupOrder, data: order, isLoading, error } = useOrderLookup();
  
  const handleSubmit = (e) => {
    e.preventDefault();
    lookupOrder({ orderNumber, email });
  };
  
  return (
    <div className="order-lookup-page">
      <h1>Track Your Order</h1>
      
      {!order ? (
        <form onSubmit={handleSubmit}>
          <Input
            label="Order Number"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="AUR-2026-0500123"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
          />
          <Button type="submit" loading={isLoading}>
            Track Order
          </Button>
          
          {error && (
            <p className="error-message">
              {error.message}
            </p>
          )}
        </form>
      ) : (
        <GuestOrderDetails order={order} />
      )}
    </div>
  );
};
```

---

## Implementation Checklist

### Backend Tasks

- [ ] Add isGuest, guestEmail, guestMobile fields to Order model in Prisma schema
- [ ] Add userId field to Order model for account linking
- [ ] Create database migration
- [ ] Implement POST /api/v1/orders/lookup
- [ ] Add rate limiting for order lookup
- [ ] Add timing-safe error responses (prevent enumeration)
- [ ] Implement POST /api/v1/orders/:orderId/link-account
- [ ] Add email verification for linking
- [ ] Add order lookup index for performance
- [ ] Test guest order lookup
- [ ] Test account linking with matching email
- [ ] Test account linking with different email

### Frontend Tasks

- [ ] Create order-lookup.tsx page
- [ ] Create order-lookup-form.tsx component
- [ ] Create guest-order-details.tsx component
- [ ] Create use-order-lookup.ts TanStack Query hook
- [ ] Create use-link-order.ts TanStack Query hook
- [ ] Add order lookup link to header navigation
- [ ] Add order lookup link to order confirmation page
- [ ] Create post-purchase-account-offer.tsx component
- [ ] Add account creation offer to confirmation page
- [ ] Handle email mismatch UI
- [ ] Handle successful linking UI

### UX/UI Tasks

- [ ] Clear order lookup form with labels
- [ ] Order number format hint (AUR-YYYY-XXXXXX)
- [ ] Guest order details display
- [ ] Order status timeline
- [ ] Order items list
- [ ] Delivery information display
- [ ] Payment summary display
- [ ] Account creation offer on confirmation
- [ ] Benefits list for account creation
- [ ] Create account button
- [ ] Skip/later option
- [ ] Email mismatch error message
- [ ] Success message after linking
- [ ] Works on mobile devices

---

## Success Criteria

The guest order lookup and post-purchase account creation is complete when:

1. **Lookup Access**: Order can be looked up with order number and email
2. **Order Details**: Full order details shown (status, items, delivery, payment)
3. **Security**: Invalid combinations show generic error (no enumeration)
4. **Rate Limiting**: Lookup attempts are rate-limited
5. **Offer Display**: Account creation offer shown on confirmation page
6. **Offer Benefits**: Clear benefits listed for account creation
7. **Account Linking**: Guest order links to account when emails match
8. **Email Mismatch**: Clear message when emails don't match
9. **Navigation**: Order lookup accessible from header and confirmation
10. **Mobile**: Works on mobile devices

---

## Integration Points

### With Story 4.6 (Payment Success/Failure)

- Order created after successful payment
- Order number generated and displayed
- Guest email captured during checkout

### With Story 4.1 (Guest Checkout)

- Guest checkout captures email and mobile
- Order stores guest contact info

### With Epic 1 (Authentication)

- Account creation uses existing registration
- Email validation for linking

### With Epic 5 (Order Tracking)

- Order status shown in lookup
- Uses order status infrastructure

---

## Edge Cases to Handle

1. **Order Number Case**: Handle case-insensitive order number input
2. **Email Case**: Handle case-insensitive email comparison
3. **Whitespace**: Trim whitespace from inputs
4. **Special Characters**: Handle special characters in order number
5. **Rate Limiting**: Prevent brute-force order lookup
6. **Timing Attack**: Consistent response timing to prevent enumeration
7. **Linked Order**: Don't offer linking if order already linked
8. **Multiple Orders**: Handle multiple orders with same email
9. **Expired Orders**: Show appropriate message for very old orders
10. **Mobile View**: Ensure lookup works on mobile

---

## Notes

- Consider adding order lookup via SMS (send link to mobile)
- Consider adding order tracking without email (via SMS code)
- Consider adding "remember this order" feature (local storage)
- Consider adding order lookup analytics

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created