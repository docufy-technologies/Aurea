# Story 4.5: Pay by COD with verification and fee rules

**Status**: ready-for-dev  
**Story ID**: 4.5  
**Story Key**: 4-5-pay-by-cod-with-verification-and-fee-rules  
**Epic**: Epic 4 - Checkout, Delivery, and Payment  
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a shopper,**  
**I want to choose cash on delivery when eligible,**  
**so that I can pay at delivery if I prefer.**

### Business Context

This story implements the Cash on Delivery (COD) payment option for Aurea, providing an alternative payment method for customers who prefer to pay upon receiving their order. COD is particularly important in the Bangladesh market where digital payment adoption varies and many customers prefer to verify products before payment.

Key business value: COD expands the customer base to include those without bank accounts or mobile wallets, reduces cart abandonment for high-consideration purchases, and builds trust by allowing customers to pay only after receiving their items.

This story builds directly on:
- Story 4.4 (SSLCOMMERZ payment) — COD is an alternative payment method
- Story 4.3 (delivery options) — COD availability depends on delivery area
- Story 4.2 (address validation) — address determines COD serviceability

Key dependencies:
- COD limit: orders under BDT 50,000 are eligible
- COD fee: additional fee added to order total
- OTP verification: required before order is dispatched
- Area validation: not all areas support COD

### Acceptance Criteria

#### AC1: COD Eligibility

**Given** my order total is under the COD limit and my delivery area is supported  
**When** I reach the payment step  
**Then** COD is shown as an available payment option  
**And** the COD fee is displayed in the order summary

#### AC2: COD Ineligibility - Order Amount

**Given** my order total exceeds BDT 50,000  
**When** I attempt to select COD  
**Then** COD is not shown as an option  
**And** a clear message explains the limit

#### AC3: COD Ineligibility - Area

**Given** my delivery address is not in a COD-supported area  
**When** I reach the payment step  
**Then** COD is not shown as an option  
**And** digital payment methods are highlighted instead

#### AC4: OTP Verification Required

**Given** I select COD as my payment method  
**When** I proceed to confirm the order  
**Then** OTP verification is required before the order is placed  
**And** the OTP is sent to my registered mobile number

#### AC5: OTP Verification Flow

**Given** I selected COD and need to verify with OTP  
**When** the OTP is sent  
**Then** I have 3 attempts to enter the correct OTP  
**And** after 3 failed attempts, the order is cancelled and I must restart

#### AC6: COD Fee Display

**Given** I select COD  
**When** the order summary is shown  
**Then** the COD fee is clearly displayed as a separate line item  
**And** the total includes the COD fee

#### AC7: COD Success

**Given** COD verification succeeds  
**When** the order is confirmed  
**Then** the order is created with payment method "cod"  
**And** I see the order confirmation with COD marked as payment method

#### AC8: COD Failure

**Given** COD verification fails after 3 attempts  
**When** the order is cancelled  
**Then** I am returned to payment selection  
**And** I can choose a different payment method

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR62 | COD must be available for orders under BDT 50,000 |
| FR63 | COD verification must require OTP confirmation |
| FR64 | COD orders must include the COD fee and supported delivery-area checks |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR6 | Payment processing must complete within 30 seconds for successful transactions |
| NFR9 | Customer data must be encrypted at rest and in transit |

---

## Technical Requirements

### Database Schema (Prisma)

This story adds COD-specific fields to the Payment model and Order model.

```prisma
// Payment model extended with COD fields
model Payment {
  id              String    @id @default(uuid())
  orderId         String    @unique @map("order_id")
  amount          Decimal   @map("amount")
  currency        String    @default("BDT") @map("currency")
  method          String    @map("method") // card, bkash, nagad, rocket, cod
  status          String    @default("pending") @map("status") // pending, verified, failed, cancelled
  gateway         String    @default("cod") @map("gateway")
  
  // COD-specific fields
  codFee          Decimal?  @map("cod_fee") // COD fee amount
  otpSentTo       String?   @map("otp_sent_to") // Mobile number OTP sent to
  otpVerified    Boolean   @default(false) @map("otp_verified")
  otpAttempts    Int       @default(0) @map("otp_attempts")
  otpExpiresAt   DateTime? @map("otp_expires_at")
  
  // Standard payment fields
  transactionId   String?   @unique @map("transaction_id")
  idempotencyKey  String?   @unique @map("idempotency_key")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  completedAt     DateTime? @map("completed_at")

  order           Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([transactionId])
  @@map("payments")
}

// Order model - COD selection stored
model Order {
  id              String    @id @default(uuid())
  orderNumber     String    @unique @map("order_number")
  // ... existing fields from previous stories
  
  paymentMethod   String    @default("card") @map("payment_method") // card, bkash, nagad, rocket, cod
  paymentId       String?   @unique @map("payment_id")
  payment         Payment?  @relation(fields: [paymentId], references: [id])

  @@map("orders")
}
```

### COD Configuration

#### Eligibility Rules

| Rule | Value | Description |
|------|-------|-------------|
| COD Amount Limit | BDT 50,000 | Maximum order total for COD eligibility |
| COD Fee | BDT 50 | Flat fee added to COD orders |
| OTP Expiry | 5 minutes | Time window to verify OTP |
| OTP Attempts | 3 | Maximum failed OTP attempts |
| OTP Length | 6 digits | Numeric OTP |

#### Supported Areas (Initial)

COD is supported in these areas initially:
- Dhaka Metro
- Chattogram Metro
- Sylhet Metro
- Khulna Metro
- Barishal Metro

Areas will expand as logistics partnerships grow.

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/payment/cod/eligibility` | POST | Check COD eligibility for an order |
| `/api/v1/payment/cod/initiate` | POST | Initiate COD with OTP sending |
| `/api/v1/payment/cod/verify` | POST | Verify OTP for COD |
| `/api/v1/payment/cod/resend-otp` | POST | Resend OTP if expired or not received |

#### POST /api/v1/payment/cod/eligibility

**Request:**
```json
{
  "orderId": "order_123",
  "deliveryAddressId": "addr_456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "codFee": 50,
    "reason": null
  },
  "metadata": {}
}
```

**Response (400 - Not Eligible):**
```json
{
  "success": false,
  "error": {
    "code": "COD_INELIGIBLE",
    "message": "Cash on delivery is not available for orders above BDT 50,000",
    "details": { "reason": "amount_exceeded", "limit": 50000 }
  }
}
```

#### POST /api/v1/payment/cod/initiate

**Request:**
```json
{
  "orderId": "order_123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "codFee": 50,
    "otpSentTo": "0171******23",
    "otpExpiresAt": "2026-05-03T14:35:00Z",
    "attemptsRemaining": 3
  },
  "metadata": {}
}
```

#### POST /api/v1/payment/cod/verify

**Request:**
```json
{
  "orderId": "order_123",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "orderNumber": "AUR-2026-0500123"
  },
  "metadata": {}
}
```

**Response (400 - Invalid OTP):**
```json
{
  "success": false,
  "error": {
    "code": "OTP_INVALID",
    "message": "Invalid OTP entered",
    "details": { "attemptsRemaining": 2, "locked": false }
  }
}
```

**Response (400 - Locked):**
```json
{
  "success": false,
  "error": {
    "code": "OTP_LOCKED",
    "message": "Too many failed attempts. Please choose a different payment method.",
    "details": { "reason": "exceeded_attempts" }
  }
}
```

#### POST /api/v1/payment/cod/resend-otp

**Request:**
```json
{
  "orderId": "order_123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "otpSentTo": "0171******23",
    "otpExpiresAt": "2026-05-03T14:40:00Z",
    "attemptsRemaining": 3
  },
  "metadata": {}
}
```

**Response (400 - Rate Limited):**
```json
{
  "success": false,
  "error": {
    "code": "OTP_RATE_LIMITED",
    "message": "Please wait before requesting another OTP",
    "details": { "waitSeconds": 60 }
  }
}
```

### OTP Generation

```typescript
// Backend - OTP generation
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// OTP storage (Redis or database)
const storeOTP = async (orderId: string, otp: string, expiryMinutes: number = 5): Promise<void> {
  const key = `cod_otp:${orderId}`;
  await redis.setex(key, expiryMinutes * 60, otp);
};

// OTP validation
const validateOTP = async (orderId: string, inputOtp: string): Promise<boolean> {
  const key = `cod_otp:${orderId}`;
  const storedOtp = await redis.get(key);
  return storedOtp === inputOtp;
};
```

### COD Fee Calculation

```typescript
// Backend - COD fee calculation
const calculateCODFee = (orderTotal: number): number => {
  // Flat fee of BDT 50 for COD orders
  return 50;
};

// Order total with COD
const calculateOrderTotalWithCOD = (subtotal: number, shipping: number, discount: number = 0): number => {
  const codFee = 50; // Flat COD fee
  return subtotal + shipping + codFee - discount;
};
```

### COD Serviceability Check

```typescript
// Backend - COD area check
const checkCODServiceability = async (addressId: string): Promise<{ eligible: boolean; reason?: string }> => {
  const address = await addressRepository.findById(addressId);
  
  // Check if area is in supported list
  const supportedAreas = [
    'dhaka metro',
    'chattogram metro',
    'sylhet metro',
    'khulna metro',
    'barishal metro'
  ];
  
  const isSupported = supportedAreas.some(area => 
    address.city.toLowerCase().includes(area) || 
    address.area.toLowerCase().includes(area)
  );
  
  if (!isSupported) {
    return { 
      eligible: false, 
      reason: 'COD is not available in your delivery area. Please choose digital payment.' 
    };
  }
  
  return { eligible: true };
};
```

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (payments, orders)
4. **API Versioning**: All endpoints under `/api/v1/`
5. **OTP Security**: 6-digit numeric, 5-minute expiry, max 3 attempts
6. **Rate Limiting**: Prevent OTP abuse with rate limits
7. **COD Fee Clarity**: Display COD fee separately in order summary

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── checkout/
│       │   │   ├── components/
│       │   │   │   ├── cod-payment-section.tsx
│       │   │   │   ├── cod-otp-verification.tsx
│       │   │   │   ├── cod-summary.tsx
│       │   │   │   └── cod-ineligible-message.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── use-cod-eligibility.ts
│       │   │   │   ├── use-cod-initiate.ts
│       │   │   │   ├── use-cod-verify.ts
│       │   │   │   └── use-cod-resend.ts
│       │   │   └── types/
│       │   ��       └── index.ts
│       │   └── payment/
│       │       └── components/
│       │           └── cod-method-card.tsx
│       └── lib/
│           └── api-client.ts
│
├── server/
│   └── src/
│       ├── controllers/
│       │   └── cod-controller.ts
│       ├── services/
│       │   ├── cod-service.ts
│       │   └── otp-service.ts
│       ├── repositories/
│       │   └── cod-repository.ts
│       ├── utils/
│       │   └── otp.ts
│       └── routes/
│           └── cod-routes.ts
│
└── shared/
    └── src/
        └── types/
            └── cod.ts
```

### State Management

- **TanStack Query**: Check COD eligibility, verify OTP
- **Zustand**: COD selection state (selected, processing, verified)
- **React Context**: Checkout flow state (current step)

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| redis | ^5.x | OTP storage with expiry |
| otplib | ^4.x | OTP generation and validation |

---

## Previous Story Intelligence

### From Story 4.4 (SSLCOMMERZ Payment)

**Key Learnings:**

1. **Payment Flow**: Payment is step after delivery selection
2. **Payment Model**: Payment model supports multiple methods
3. **Idempotency**: Idempotency key pattern established
4. **API Response**: Wrapper pattern follows architecture

**Reuse for Story 4.5:**
- Payment model extended with COD fields
- Payment method selection builds on Story 4.4
- Order creation after payment verification
- Error handling patterns from Story 4.4

### From Story 4.3 (Delivery Options)

**Key Learnings:**

1. **Delivery Options**: Standard and express options available
2. **Area Serviceability**: Address determines available options
3. **Checkout Step**: Delivery → Payment is the flow

**Reuse for Story 4.5:**
- Delivery address determines COD serviceability
- COD area check similar to delivery area check

### From Story 4.2 (Address Validation)

**Key Learnings:**

1. **Address Storage**: Multiple addresses stored
2. **Serviceability**: Address determines delivery options
3. **Address Format**: Structured address form

**Reuse for Story 4.5:**
- Delivery address determines COD eligibility
- Customer mobile number needed for OTP

### From Story 4.1 (Checkout Foundation)

**Key Learnings:**

1. **Checkout Flow**: Multi-step checkout
2. **Guest Checkout**: Supported without account
3. **Cart Integration**: Cart items passed to order

**Reuse for Story 4.5:**
- COD works for guest checkout
- Order created after payment verification

---

## Git Intelligence Summary

From previous epics and stories, the codebase has:

- Monorepo structure with pnpm workspaces (Story 1.1)
- User authentication with JWT and Redis sessions (Epic 1)
- Product catalog with variants (Epic 2)
- Cart with 30-day persistence (Epic 3)
- Checkout flow (Stories 4.1, 4.2, 4.3)
- SSLCOMMERZ payment integration (Story 4.4)
- API response wrapper pattern consistently used
- TanStack Query for data fetching
- Zustand for client state
- Redis already used for sessions

For this story, we need to:

- Add COD eligibility check (amount and area)
- Create OTP generation and verification flow
- Add COD fee to order total
- Handle OTP expiry and resend
- Handle failed OTP attempts (lock after 3)
- Create COD verification UI
- Display COD in payment method selection

---

## Latest Tech Information

### OTP Best Practices (2026)

```typescript
// Secure OTP implementation
interface OTPConfig {
  length: 6;
  expiryMinutes: 5;
  maxAttempts: 3;
  rateLimitMs: 60000; // 1 minute between OTPs
}

// OTP generation
const generateSecureOTP = (): string => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

// Redis storage with expiry
const storeOTP = async (
  orderId: string, 
  otp: string, 
  config: OTPConfig
): Promise<void> => {
  const key = `cod:otp:${orderId}`;
  await redis.setex(key, config.expiryMinutes * 60, otp);
  
  // Store attempts counter
  const attemptsKey = `cod:attempts:${orderId}`;
  await redis.setex(attemptsKey, config.expiryMinutes * 60, '0');
};

// Validation with attempt tracking
const verifyOTP = async (
  orderId: string, 
  inputOtp: string,
  config: OTPConfig
): Promise<{ valid: boolean; locked: boolean; attemptsRemaining: number }> => {
  const otpKey = `cod:otp:${orderId}`;
  const attemptsKey = `cod:attempts:${orderId}`;
  
  const storedOtp = await redis.get(otpKey);
  const attempts = parseInt(await redis.get(attemptsKey) || '0');
  
  if (attempts >= config.maxAttempts) {
    return { valid: false, locked: true, attemptsRemaining: 0 };
  }
  
  if (storedOtp !== inputOtp) {
    await redis.incr(attemptsKey);
    return { 
      valid: false, 
      locked: false, 
      attemptsRemaining: config.maxAttempts - attempts - 1 
    };
  }
  
  return { valid: true, locked: false, attemptsRemaining: config.maxAttempts };
};
```

### COD Fee Display Pattern

```tsx
// Frontend - COD fee in order summary
const OrderSummaryWithCOD = ({ subtotal, shipping, discount, paymentMethod }) => {
  const codFee = paymentMethod === 'cod' ? 50 : 0;
  const total = subtotal + shipping - discount + codFee;
  
  return (
    <div className="order-summary">
      <div className="line-item">
        <span>Subtotal</span>
        <span>BDT {subtotal.toLocaleString()}</span>
      </div>
      <div className="line-item">
        <span>Shipping</span>
        <span>BDT {shipping.toLocaleString()}</span>
      </div>
      {discount > 0 && (
        <div className="line-item discount">
          <span>Discount</span>
          <span>-BDT {discount.toLocaleString()}</span>
        </div>
      )}
      {codFee > 0 && (
        <div className="line-item cod-fee">
          <span>Cash on Delivery Fee</span>
          <span>BDT {codFee.toLocaleString()}</span>
        </div>
      )}
      <div className="line-item total">
        <span>Total</span>
        <span>BDT {total.toLocaleString()}</span>
      </div>
    </div>
  );
};
```

### COD Payment Selection UI

```tsx
// Frontend - COD in payment method selection
const PaymentMethodSelector = ({ methods, selected, onSelect }) => {
  return (
    <div className="payment-methods">
      {methods.map(method => (
        <PaymentMethodCard
          key={method.id}
          method={method}
          selected={selected === method.id}
          onSelect={() => onSelect(method.id)}
        />
      ))}
    </div>
  );
};

// Method list includes COD when eligible:
// { id: "cod", name: "Cash on Delivery", type: "cod", 
//   logo: "/images/payment/cod.svg", description: "Pay when you receive your order",
//   enabled: true }
```

---

## Implementation Checklist

### Backend Tasks

- [ ] Add COD fields to Payment model in Prisma schema
- [ ] Add paymentMethod to Order model
- [ ] Create database migration
- [ ] Create cod-repository
- [ ] Create otp-service for OTP generation/validation
- [ ] Implement POST /api/v1/payment/cod/eligibility
- [ ] Implement POST /api/v1/payment/cod/initiate
- [ ] Implement POST /api/v1/payment/cod/verify
- [ ] Implement POST /api/v1/payment/cod/resend-otp
- [ ] Add Redis OTP storage with expiry
- [ ] Add OTP attempt tracking
- [ ] Add rate limiting for OTP requests
- [ ] Add COD area serviceability check
- [ ] Add COD fee calculation
- [ ] Integrate COD eligibility into payment flow
- [ ] Test OTP generation and validation
- [ ] Test eligibility check

### Frontend Tasks

- [ ] Create cod-payment-section.tsx component
- [ ] Create cod-otp-verification.tsx component
- [ ] Create cod-summary.tsx component
- [ ] Create cod-ineligible-message.tsx component
- [ ] Create cod-method-card.tsx component
- [ ] Create use-cod-eligibility.ts TanStack Query hook
- [ ] Create use-cod-initiate.ts TanStack Query hook
- [ ] Create use-cod-verify.ts TanStack Query hook
- [ ] Create use-cod-resend.ts TanStack Query hook
- [ ] Display COD in payment method list
- [ ] Show COD fee in order summary
- [ ] Add COD OTP input UI
- [ ] Add resend OTP button
- [ ] Add attempts remaining display
- [ ] Add lockout message for failed attempts
- [ ] Add mobile-friendly OTP input
- [ ] Add COD ineligible messaging

### UX/UI Tasks

- [ ] COD option shown only when eligible
- [ ] COD fee clearly displayed
- [ ] OTP input with 6-digit input
- [ ] Resend button with countdown
- [ ] Attempts remaining shown
- [ ] Clear lockout message
- [ ] Works on mobile devices
- [ ] Clear ineligible explanation

---

## Success Criteria

The COD payment feature is complete when:

1. **COD Eligibility**: Amount and area checks work correctly
2. **COD Option**: Shown only when eligible
3. **COD Fee**: Displayed as separate line item
4. **OTP Flow**: 6-digit OTP sent to mobile
5. **OTP Verification**: Successful verification creates order
6. **Failed OTP**: Lock after 3 attempts
7. **Resend OTP**: Available after expiry
8. **Rate Limiting**: Prevents OTP abuse
9. **Ineligible Message**: Clear explanation for ineligible
10. **Guest Checkout**: Works without account
11. **Mobile**: Works on mobile devices
12. **Error Handling**: Clear errors for all failure cases

---

## Integration Points

### With Story 4.4 (SSLCOMMERZ Payment)

- COD is alternative to digital payment
- Payment selector includes both
- COD uses Payment model
- Order created after verification

### With Story 4.3 (Delivery Options)

- Delivery area determines COD serviceability
- Delivery selection before payment step

### With Story 4.2 (Address Validation)

- Address determines COD area eligibility
- Customer mobile for OTP

### With Epic 3 (Cart Management)

- Cart total determines COD eligibility (BDT 50,000 limit)

---

## Edge Cases to Handle

1. **Amount Exceeds Limit**: COD hidden, other methods highlighted
2. **Area Not Supported**: COD hidden, explanation shown
3. **OTP Expired**: Allow resend, show expiry message
4. **Wrong OTP**: Show attempts remaining
5. **Locked After 3 Fails**: Block COD, suggest digital payment
6. **No Mobile Number**: Require mobile before COD option
7. **Rate Limited OTP**: Wait 60 seconds between requests
8. **Network Error**: Allow retry, don't lose order
9. **Cart Change After OTP**: Re-verify eligibility
10. **Guest OTP**: Send to guest-provided mobile

---

## Notes

- Consider COD success rate tracking
- Consider expanding COD areas over time
- Consider COD limit increases for trusted customers
- Consider COD partial payments (future enhancement)
- Consider integration with logistics for COD verification

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created