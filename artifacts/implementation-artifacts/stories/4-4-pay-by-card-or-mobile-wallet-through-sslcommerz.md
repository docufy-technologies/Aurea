# Story 4.4: Pay by card or mobile wallet through SSLCOMMERZ

**Status**: ready-for-dev
**Story ID**: 4.4
**Story Key**: 4-4-pay-by-card-or-mobile-wallet-through-sslcommerz
**Epic**: Epic 4 - Checkout, Delivery, and Payment
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a shopper,**
**I want to pay using supported digital methods,**
**so that I can complete my purchase securely.**

### Business Context

This story implements the payment processing component of the checkout flow via SSLCOMMERZ, Bangladesh's leading payment gateway. It builds directly on Story 4.3 (delivery options and order review) where the order is validated and ready for payment. This is the critical conversion point where the customer completes their purchase.

Key business value: Seamless, secure payment processing is essential for conversion. SSLCOMMERZ supports the payment methods Bangladeshi customers trust — Visa, Mastercard, and mobile wallets (bKash, Nagad, Rocket). 3D Secure adds an extra layer of security for card payments, building trust and reducing fraud.

This story directly supports:
- Story 4.3 (order review) — payment receives the validated order total
- Story 4.5 (COD) — alternative payment method if digital payment fails
- Story 4.6 (payment handling) — success/failure handling
- Story 4.7 (guest order lookup) — order lookup after successful payment

### Acceptance Criteria

#### AC1: Card Payment Support

**Given** I select card payment
**When** I proceed through SSLCOMMERZ
**Then** Visa, Mastercard, and supported Bangladesh banks are accepted
**And** 3D Secure verification is supported

#### AC2: Mobile Wallet Support

**Given** I select a mobile wallet
**When** I choose bKash, Nagad, or Rocket
**Then** the payment method is displayed with the correct logo
**And** the flow proceeds through the gateway

#### AC3: Payment Method Display

**Given** I am on the payment step
**When** payment options load
**Then** all available methods are shown with their logos
**And** the selected method is clearly indicated

#### AC4: Payment Processing

**Given** I submit payment details
**When** the payment is processing
**Then** a loading state is shown
**And** the submit button is disabled to prevent double submission

#### AC5: Payment Success

**Given** payment succeeds
**When** SSLCOMMERZ confirms the transaction
**Then** the order is created immediately
**And** I am redirected to the confirmation page

#### AC6: Payment Failure

**Given** payment fails or is declined
**When** SSLCOMMERZ returns an error
**Then** a clear error message explains what happened
**And** I can retry without losing my cart or entered details

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR56 | SSLCOMMERZ must support card payments for Visa, Mastercard, and major Bangladesh banks |
| FR57 | Payment must support 3D Secure verification for cards |
| FR58 | Payment must support bKash, Nagad, and Rocket |
| FR59 | Payment forms must display supported payment methods with logos |
| FR60 | Successful payment must create an order immediately and show confirmation |
| FR61 | Failed payment must show an error with retry options |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR6 | Payment processing must complete within 30 seconds for successful transactions |
| NFR8 | Payment handling must be PCI DSS compliant |
| NFR9 | Customer data must be encrypted at rest and in transit |

---

## Technical Requirements

### Database Schema (Prisma)

This story extends the Order model from previous checkout stories and adds payment tracking.

```prisma
// Extended from checkout stories - Payment model
model Payment {
  id              String    @id @default(uuid())
  orderId         String    @unique @map("order_id")
  amount          Decimal   @map("amount")
  currency        String    @default("BDT") @map("currency")
  method          String    @map("method") // card, bkash, nagad, rocket
  status          String    @default("pending") @map("status") // pending, processing, success, failed, cancelled, refunded
  gateway         String    @default("sslcommerz") @map("gateway")
  gatewayOrderId  String?   @map("gateway_order_id") // SSLCOMMERZ transaction ID
  gatewayRefId    String?   @map("gateway_ref_id") // SSLCOMMERZ bank reference
  cardType        String?   @map("card_type") // Visa, Mastercard
  cardLast4       String?   @map("card_last4")
  walletNumber    String?   @map("wallet_number") // Masked mobile number
  transactionId   String?   @unique @map("transaction_id") // Our internal transaction ID
  idempotencyKey  String?   @unique @map("idempotency_key") // Prevent duplicate charges
  failureReason   String?   @map("failure_reason")
  failureCode     String?   @map("failure_code")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  completedAt     DateTime? @map("completed_at")

  order           Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([transactionId])
  @@index([idempotencyKey])
  @@map("payments")
}

// Order model extended with payment reference
model Order {
  id              String    @id @default(uuid())
  orderNumber     String    @unique @map("order_number")
  // ... existing fields from previous stories
  paymentId       String?   @unique @map("payment_id")
  payment         Payment?  @relation(fields: [paymentId], references: [id])

  @@map("orders")
}
```

### SSLCOMMERZ Integration

#### Payment Initialization

To initiate payment, the backend creates a payment session with SSLCOMMERZ:

```
POST to SSLCOMMERZ API
Endpoint: https://sandbox.sslcommerz.com/gwprocess/v4/api.php (sandbox)
Endpoint: https://securepay.sslcommerz.com/gwprocess/v4/api.php (production)

Required fields:
- store_id: Merchant store ID
- store_passwd: Merchant store password
- total_amount: Order total in BDT
- currency: BDT
- tran_id: Unique transaction ID (our internal)
- success_url: Redirect on success
- fail_url: Redirect on failure
- cancel_url: Redirect on cancel
- ipn_url: Webhook for payment status updates
- cus_name: Customer name
- cus_email: Customer email
- cus_add1: Shipping address
- cus_city: City
- cus_country: Bangladesh
- value_a: Custom field - order_id
- value_b: Custom field - idempotency_key
```

#### Payment Response

SSLCOMMERZ returns a payment URL that the customer is redirected to:

```json
{
  "status": "SUCCESS",
  "sessionkey": "unique_session_key",
  "GatewayPageURL": "https://sandbox.sslcommerz.com/gw/pay/{sessionkey}"
}
```

#### 3D Secure Flow

For card payments with 3D Secure:
1. Customer enters card details on SSLCOMMERZ hosted page
2. If 3D Secure enabled, bank authentication page appears
3. Customer completes authentication
4. Redirect back to success/fail URL with status

#### Webhook (IPN) Handling

SSLCOMMERZ sends webhook notifications for payment status updates:

```
POST to /api/v1/payment/webhook
```

Validation required:
1. Verify store_id and store_passwd match
2. Validate signature using store password
3. Update payment status in database
4. Trigger order creation on success

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/payment/initiate` | POST | Initialize payment session with SSLCOMMERZ |
| `/api/v1/payment/methods` | GET | Get available payment methods for the order |
| `/api/v1/payment/status/:transactionId` | GET | Get payment status |
| `/api/v1/payment/webhook` | POST | SSLCOMMERZ webhook handler |
| `/api/v1/payment/retry` | POST | Retry failed payment |
| `/api/v1/payment/cancel` | POST | Cancel pending payment |

#### POST /api/v1/payment/initiate

**Request:**
```json
{
  "orderId": "order_123",
  "method": "card", // card, bkash, nagad, rocket
  "idempotencyKey": "unique_key_123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transactionId": "txn_abc123",
    "paymentUrl": "https://sandbox.sslcommerz.com/gw/pay/session_key",
    "expiresAt": "2026-05-03T15:30:00Z"
  },
  "metadata": {}
}
```

**Response (400 - Validation Error):**
```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_VALIDATION_ERROR",
    "message": "Invalid payment method",
    "details": { "field": "method", "allowed": ["card", "bkash", "nagad", "rocket"] }
  }
}
```

#### GET /api/v1/payment/methods

**Query params:** `?order_id=order_123`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "methods": [
      {
        "id": "card",
        "name": "Credit/Debit Card",
        "type": "card",
        "logo": "/images/payment/visa.svg",
        "description": "Visa, Mastercard",
        "enabled": true
      },
      {
        "id": "bkash",
        "name": "bKash",
        "type": "wallet",
        "logo": "/images/payment/bkash.svg",
        "description": "Pay with bKash wallet",
        "enabled": true
      },
      {
        "id": "nagad",
        "name": "Nagad",
        "type": "wallet",
        "logo": "/images/payment/nagad.svg",
        "description": "Pay with Nagad wallet",
        "enabled": true
      },
      {
        "id": "rocket",
        "name": "Rocket",
        "type": "wallet",
        "logo": "/images/payment/rocket.svg",
        "description": "Pay with Rocket wallet",
        "enabled": true
      }
    ],
    "recommended": "card"
  },
  "metadata": {}
}
```

#### GET /api/v1/payment/status/:transactionId

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transactionId": "txn_abc123",
    "orderId": "order_123",
    "status": "success",
    "method": "card",
    "amount": 11400,
    "currency": "BDT",
    "cardLast4": "4242",
    "cardType": "Visa",
    "completedAt": "2026-05-03T14:25:00Z"
  },
  "metadata": {}
}
```

#### POST /api/v1/payment/webhook

**Request (from SSLCOMMERZ):**
```json
{
  "status": "VALID",
  "tran_id": "txn_abc123",
  "val_id": "valid_id_from_sslcommerz",
  "amount": "11400.00",
  "card_type": "VISA",
  "store_id": "aurea_test",
  "card_no": "4111111111111111",
  "card_brand": "VISA",
  "tran_date": "2026-05-03 14:25:30"
}
```

**Response (200):** Return "RECEIVED" to acknowledge

### Payment Method Configuration

#### Card Payments

| Card Type | Supported | 3D Secure |
|-----------|-----------|-----------|
| Visa | Yes | Yes (required) |
| Mastercard | Yes | Yes (required) |
| American Express | No | - |
| Diners Club | No | - |

#### Mobile Wallets

| Wallet | Supported | Notes |
|--------|-----------|-------|
| bKash | Yes | Personal and merchant accounts |
| Nagad | Yes | Digital and physical |
| Rocket | Yes | DBBL Rocket |

#### Payment Method Logos

Payment logos should be displayed in the payment selector:
- `/images/payment/visa.svg`
- `/images/payment/mastercard.svg`
- `/images/payment/bkash.svg`
- `/images/payment/nagad.svg`
- `/images/payment/rocket.svg`

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (payments)
4. **API Versioning**: All endpoints under `/api/v1/`
5. **Idempotency**: Use idempotency key to prevent duplicate charges
6. **PCI DSS**: Never store full card numbers; use SSLCOMMERZ hosted fields
7. **3D Secure**: Required for all card transactions
8. **Webhook Validation**: Validate all webhook signatures before processing

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── checkout/
│       │   │   ├── components/
│       │   │   │   ├── payment-selector.tsx
│       │   │   │   ├── card-payment-form.tsx
│       │   │   │   ├── wallet-payment-form.tsx
│       │   │   │   ├── payment-method-card.tsx
│       │   │   │   └── payment-status.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── use-payment-methods.ts
│       │   │   │   ├── use-initiate-payment.ts
│       │   │   │   └── use-payment-status.ts
│       │   │   └── types/
│       │   │       └── index.ts
│       │   └── order-confirmation/
│       │       └── components/
│       │           └── confirmation-page.tsx
│       └── lib/
│           └── api-client.ts
│
├── server/
│   └── src/
│       ├── controllers/
│       │   └── payment-controller.ts
│       ├── services/
│       │   ├── payment-service.ts
│       │   └── sslcommerz-service.ts
│       ├── repositories/
│       │   └── payment-repository.ts
│       ├── utils/
│       │   └── sslcommerz.ts
│       └── routes/
│           └── payment-routes.ts
│
└── shared/
    └── src/
        └── types/
            └── payment.ts
```

### State Management

- **TanStack Query**: Fetch payment methods, initiate payment, check status
- **Zustand**: Payment selection state (selected method, processing state)
- **React Context**: Checkout flow state (current step, completed steps)

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| axios | ^1.x | HTTP client for SSLCOMMERZ API |
| crypto | built-in | Generate idempotency keys |
| uuid | ^9.x | Generate unique transaction IDs |

---

## Previous Story Intelligence

### From Story 4.3 (Delivery Options and Order Review)

**Key Learnings:**

1. **Order Review**: Order summary includes all costs (subtotal, shipping, discounts, total)
2. **Terms Acceptance**: Required before payment proceeds
3. **Checkout Flow**: Payment is the final step after address → delivery → review

**Reuse for Story 4.4:**
- Order total from review step passed to payment
- Terms acceptance validated before payment initiation
- Checkout step tracking continues to payment

### From Story 4.2 (Address Validation)

**Key Learnings:**

1. **Serviceability**: Address determines available delivery options
2. **COD Eligibility**: Address + delivery determines COD availability
3. **Address Storage**: Saved addresses available for returning customers

**Reuse for Story 4.4:**
- Customer details (name, email, phone) from address used for payment
- Payment receipt sent to customer email

### From Story 4.1 (Checkout Foundation)

**Key Learnings:**

1. **Checkout Flow**: Multi-step checkout with address → delivery → payment → review
2. **Cart Integration**: Cart items loaded for checkout, validated for stock/price
3. **Guest Checkout**: Guest users can proceed without account

**Reuse for Story 4.4:**
- Guest checkout supports payment without account
- Cart items linked to order for confirmation

### From Epic 3 (Cart Management)

**Key Learnings:**

1. **Cart Persistence**: 30-day cart persistence established
2. **Cart Validation**: Stock and price validated before checkout
3. **Cart Totals**: Subtotal calculation pattern established

**Reuse for Story 4.4:**
- Cart total used for payment amount
- Price validation ensures no changes between cart and payment

---

## Git Intelligence Summary

From previous epics, the codebase has:

- Monorepo structure with pnpm workspaces (Story 1.1)
- User authentication with JWT and Redis sessions (Epic 1)
- Product catalog with variants (Epic 2)
- Cart with 30-day persistence (Epic 3)
- Checkout flow foundation (Story 4.1)
- Address validation with serviceability (Story 4.2)
- Delivery options and order review (Story 4.3)
- API response wrapper pattern consistently used
- TanStack Query for data fetching
- Zustand for client state
- Zod validation patterns

For this story, we need to:

- Add SSLCOMMERZ payment integration
- Create payment initiation flow
- Handle 3D Secure card payments
- Handle mobile wallet payments (bKash, Nagad, Rocket)
- Implement webhook handling for payment status
- Create payment retry flow for failed payments
- Add idempotency to prevent duplicate charges
- Create order confirmation page

---

## Latest Tech Information

### SSLCOMMERZ Integration Pattern (2026)

```typescript
// Backend - Payment initiation
interface SSLCOMMERZPaymentRequest {
  store_id: string;
  store_passwd: string;
  total_amount: number;
  currency: string;
  tran_id: string;
  success_url: string;
  fail_url: string;
  cancel_url: string;
  ipn_url: string;
  cus_name: string;
  cus_email: string;
  cus_add1: string;
  cus_city: string;
  cus_country: string;
  value_a: string; // order_id
  value_b: string; // idempotency_key
}

interface SSLCOMMERZPaymentResponse {
  status: 'SUCCESS' | 'FAIL' | 'MERCHANT_VALIDATION_ERROR';
  sessionkey?: string;
  GatewayPageURL?: string;
  failedreason?: string;
}
```

### Idempotency Key Pattern

```typescript
// Generate idempotency key
const generateIdempotencyKey = (): string => {
  return `idemp_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
};

// Check for duplicate before initiating payment
const existingPayment = await paymentRepository.findByIdempotencyKey(key);
if (existingPayment) {
  // Return existing payment status instead of creating new
  return existingPayment;
}
```

### Webhook Signature Validation

```typescript
// Validate SSLCOMMERZ webhook signature
const validateWebhookSignature = (data: any, signature: string): boolean => {
  const { store_id, store_passwd, ...rest } = data;
  const signatureData = Object.entries(rest)
    .filter(([key]) => key.startsWith('val_id') || key.startsWith('tran_id'))
    .map(([key, value]) => value)
    .join('');
  
  const expectedSignature = crypto
    .createHash('md5')
    .update(signatureData + store_passwd)
    .digest('hex');
  
  return signature === expectedSignature;
};
```

### Frontend Payment Flow

```tsx
// Frontend - Payment component
const PaymentStep = ({ orderTotal, onSuccess, onFailure }) => {
  const { data: methods } = usePaymentMethods();
  const { mutate: initiatePayment, isPending } = useInitiatePayment();
  const [selectedMethod, setSelectedMethod] = useState(null);

  const handlePayment = () => {
    initiatePayment({
      orderId: orderId,
      method: selectedMethod,
      idempotencyKey: generateIdempotencyKey()
    }, {
      onSuccess: (data) => {
        // Redirect to SSLCOMMERZ payment page
        window.location.href = data.paymentUrl;
      },
      onError: (error) => {
        // Show error, allow retry
        showError(error.message);
      }
    });
  };

  return (
    <div className="payment-step">
      <PaymentMethodSelector
        methods={methods}
        selected={selectedMethod}
        onSelect={setSelectedMethod}
      />
      
      {selectedMethod === 'card' && <CardPaymentForm />}
      {selectedMethod === 'bkash' && <WalletPaymentForm provider="bkash" />}
      {selectedMethod === 'nagad' && <WalletPaymentForm provider="nagad" />}
      {selectedMethod === 'rocket' && <WalletPaymentForm provider="rocket" />}
      
      <Button
        onClick={handlePayment}
        disabled={!selectedMethod || isPending}
      >
        {isPending ? 'Processing...' : `Pay BDT ${orderTotal.toLocaleString()}`}
      </Button>
    </div>
  );
};
```

---

## Implementation Checklist

### Backend Tasks

- [ ] Add Payment model to Prisma schema
- [ ] Add paymentId to Order model
- [ ] Create database migration
- [ ] Create payment-repository
- [ ] Create sslcommerz-service for API calls
- [ ] Implement POST /api/v1/payment/initiate
- [ ] Implement GET /api/v1/payment/methods
- [ ] Implement GET /api/v1/payment/status/:transactionId
- [ ] Implement POST /api/v1/payment/webhook
- [ ] Implement POST /api/v1/payment/retry
- [ ] Implement POST /api/v1/payment/cancel
- [ ] Add idempotency key validation
- [ ] Add webhook signature validation
- [ ] Add 3D Secure handling
- [ ] Add mobile wallet handling (bKash, Nagad, Rocket)
- [ ] Add payment timeout handling (30 seconds)
- [ ] Test payment initiation
- [ ] Test webhook handling
- [ ] Test payment retry

### Frontend Tasks

- [ ] Create payment-selector.tsx component
- [ ] Create card-payment-form.tsx component
- [ ] Create wallet-payment-form.tsx component
- [ ] Create payment-method-card.tsx component
- [ ] Create payment-status.tsx component
- [ ] Create use-payment-methods.ts TanStack Query hook
- [ ] Create use-initiate-payment.ts TanStack Query hook
- [ ] Create use-payment-status.ts TanStack Query hook
- [ ] Integrate payment into checkout flow
- [ ] Add loading state during payment processing
- [ ] Add disabled state to prevent double submission
- [ ] Add payment method logos
- [ ] Add error display for failed payments
- [ ] Add retry option for failed payments
- [ ] Create order confirmation page
- [ ] Add mobile-friendly payment forms

### UX/UI Tasks

- [ ] Payment methods displayed as selectable cards with logos
- [ ] Card and wallet sections clearly separated
- [ ] Selected method highlighted
- [ ] Loading spinner during payment processing
- [ ] Submit button disabled during processing
- [ ] Clear error messages for failed payments
- [ ] Retry button for failed payments
- [ ] Order confirmation shows payment method used
- [ ] Works on mobile devices

---

## Success Criteria

The payment via SSLCOMMERZ feature is complete when:

1. **Card Payments**: Visa and Mastercard accepted with 3D Secure
2. **Mobile Wallets**: bKash, Nagad, Rocket supported
3. **Payment Methods**: All methods displayed with logos
4. **Payment Processing**: Loading state shown, button disabled
5. **Payment Success**: Order created, confirmation page shown
6. **Payment Failure**: Clear error message, retry option available
7. **Idempotency**: Duplicate payment prevention works
8. **Webhook**: Payment status updates handled correctly
9. **Guest Checkout**: Works without account
10. **Mobile**: Works on mobile devices
11. **Performance**: Payment initiation within 5 seconds
12. **Security**: Webhook validation, no card data stored

---

## Integration Points

### With Story 4.3 (Order Review)

- Order total passed to payment
- Terms acceptance validated before payment
- Order items carried to confirmation

### With Story 4.1 (Checkout Foundation)

- Checkout step flow: address → delivery → payment → review
- Cart items linked to order
- Guest checkout support

### With Story 4.5 (COD)

- COD available as alternative if digital payment fails
- COD option shown if eligible

### With Story 4.6 (Payment Handling)

- Success/failure handling flows from this story
- Order creation on success
- Error display on failure

### With Epic 3 (Cart Management)

- Cart total used for payment amount
- Price validation ensures no changes

---

## Edge Cases to Handle

1. **Payment Timeout**: Payment takes too long — show timeout error, allow retry
2. **3D Secure Fails**: Customer fails authentication — show error, allow retry
3. **Card Declined**: Bank declines card — show decline reason, suggest alternative
4. **Insufficient Funds**: Wallet has insufficient balance — show error, suggest top-up
5. **Duplicate Payment**: Customer double-clicks — idempotency key prevents duplicate
6. **Webhook Failure**: Webhook doesn't reach server — provide order lookup
7. **Session Expired**: Payment session expires — allow restart without losing cart
8. **Gateway Down**: SSLCOMMERZ unavailable — show error, suggest COD alternative
9. **Invalid Card**: Card number invalid — show validation error
10. **Network Error**: Network fails during payment — show error, allow retry

---

## Notes

- Consider storing payment receipt in order history
- Consider sending SMS confirmation after payment success
- Consider payment method analytics for business insights
- Consider adding loyalty points for certain payment methods
- Consider saved payment methods for returning customers (tokenization)
- Consider installment/EMI options for high-value orders (future enhancement)

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created