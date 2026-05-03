# Story 4.6: Handle payment success and payment failures cleanly

**Status**: ready-for-dev  
**Story ID**: 4.6  
**Story Key**: 4-6-handle-payment-success-and-payment-failures-cleanly  
**Epic**: Epic 4 - Checkout, Delivery, and Payment  
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a shopper,**  
**I want payment outcomes to be clear,**  
**so that I know whether my order is placed.**

### Business Context

This story implements the payment outcome handling for Aurea, ensuring customers clearly understand whether their payment succeeded or failed and can take appropriate action. This is critical for trust and reducing cart abandonment.

Key business value: Clear payment outcomes reduce customer anxiety, prevent duplicate orders from retry attempts, preserve cart contents for retry scenarios, and build confidence in the checkout process.

This story builds directly on:
- Story 4.4 (SSLCOMMERZ payment) — handles the actual payment gateway integration
- Story 4.5 (COD) — alternative payment method with its own verification flow
- Story 4.3 (delivery options) — delivery selection before payment
- Story 4.2 (address validation) — address determines serviceability

Key dependencies:
- Payment gateway webhook handling for async success/failure
- Order creation after successful payment
- Cart preservation on payment failure
- Idempotency to prevent duplicate orders

### Acceptance Criteria

#### AC1: Payment Success - Order Created

**Given** the payment gateway confirms successful payment  
**When** the webhook or redirect is received  
**Then** the order is created immediately in the database  
**And** the order status is set to "confirmed"  
**And** inventory is decremented for ordered items

#### AC2: Payment Success - Confirmation Screen

**Given** payment succeeds  
**When** the customer is redirected to the confirmation page  
**Then** the order number is displayed prominently  
**And** the order summary shows items, total, and delivery details  
**And** a confirmation email is triggered  
**And** a "Track Order" link is provided

#### AC3: Payment Failure - Clear Error Message

**Given** payment fails at the gateway  
**When** the customer returns to checkout  
**Then** a clear error message explains what happened  
**And** the specific failure reason is shown (insufficient funds, card declined, timeout, etc.)  
**And** suggested actions are provided

#### AC4: Payment Failure - Cart Preservation

**Given** payment fails  
**When** the customer returns to checkout  
**Then** all cart items are preserved  
**And** the entered address and delivery preferences are preserved  
**And** the customer can retry payment without re-entering details

#### AC5: Payment Timeout Handling

**Given** payment gateway times out without a response  
**When** the customer returns to checkout  
**Then** the system checks payment status via API  
**And** if payment actually succeeded, the order is created  
**And** if payment failed or is unknown, the customer can retry

#### AC6: Duplicate Payment Prevention

**Given** a customer attempts to pay twice quickly  
**When** the second payment request arrives  
**Then** the idempotency key prevents duplicate order creation  
**And** the customer sees the existing order status

#### AC7: Payment Pending State

**Given** payment is in pending state (async processing)  
**When** the customer waits at the confirmation page  
**Then** a loading indicator shows payment is being processed  
**And** after 30 seconds without resolution, status check is triggered  
**And** the customer is informed of the current state

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR60 | Successful payment must create an order immediately and show confirmation |
| FR61 | Failed payment must show an error with retry options |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR6 | Payment processing must complete within 30 seconds for successful transactions |
| NFR9 | Customer data must be encrypted at rest and in transit |

---

## Technical Requirements

### Database Schema (Prisma)

This story extends the Payment and Order models to track payment outcomes.

```prisma
// Payment model - extended with outcome tracking
model Payment {
  id              String    @id @default(uuid())
  orderId         String    @unique @map("order_id")
  amount          Decimal   @map("amount")
  currency        String    @default("BDT") @map("currency")
  method          String    @map("method") // card, bkash, nagad, rocket, cod
  status          String    @default("pending") @map("status") 
  // pending, processing, success, failed, cancelled, refunded
  
  gateway         String    @map("gateway") // sslcommerz, cod
  transactionId   String?   @unique @map("transaction_id")
  idempotencyKey  String?   @unique @map("idempotency_key")
  
  // Outcome tracking
  failureReason   String?   @map("failure_reason") // declined, insufficient_funds, timeout, etc.
  gatewayResponse Json?     @map("gateway_response") // Raw gateway response
  
  // Timestamps
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  completedAt     DateTime? @map("completed_at")

  order           Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([transactionId])
  @@index([idempotencyKey])
  @@map("payments")
}

// Order model - extended with payment outcome
model Order {
  id              String    @id @default(uuid())
  orderNumber     String    @unique @map("order_number")
  status          String    @default("pending") @map("status")
  // pending, confirmed, processing, shipped, delivered, cancelled, refunded
  
  // Payment linkage
  paymentMethod   String    @default("card") @map("payment_method")
  paymentId       String?   @unique @map("payment_id")
  payment         Payment?  @relation(fields: [paymentId], references: [id])

  // ... existing fields

  @@map("orders")
}
```

### Payment Status Flow

```
pending → processing → success
              ↓
            failed

States:
- pending: Payment initiated, awaiting gateway response
- processing: Gateway is processing (for async methods)
- success: Payment confirmed, order created
- failed: Payment declined/errored
- cancelled: Payment cancelled by user or system
- refunded: Payment was refunded
```

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/payment/status/:orderId` | GET | Check payment status for an order |
| `/api/v1/payment/webhook/sslcommerz` | POST | SSLCOMMERZ webhook handler |
| `/api/v1/payment/retry/:orderId` | POST | Retry payment for failed order |
| `/api/v1/payment/check-pending` | POST | Check status of pending payments |

#### GET /api/v1/payment/status/:orderId

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "orderId": "order_123",
    "orderNumber": "AUR-2026-0500123",
    "paymentStatus": "success",
    "paymentMethod": "card",
    "transactionId": "TXN_abc123",
    "amount": 5500,
    "paidAt": "2026-05-03T14:30:00Z"
  },
  "metadata": {}
}
```

**Response (200 - Failed):**
```json
{
  "success": true,
  "data": {
    "orderId": "order_123",
    "paymentStatus": "failed",
    "failureReason": "insufficient_funds",
    "failureMessage": "Your card has insufficient funds",
    "canRetry": true
  },
  "metadata": {}
}
```

**Response (200 - Pending):**
```json
{
  "success": true,
  "data": {
    "orderId": "order_123",
    "paymentStatus": "pending",
    "message": "Payment is being processed",
    "checkAgainAfter": 10000
  },
  "metadata": {}
}
```

#### POST /api/v1/payment/webhook/sslcommerz

**Request:**
```json
{
  "tran_id": "order_123",
  "val_id": "verification_id",
  "status": "VALID",
  "tran_date": "2026-05-03 14:30:00",
  "amount": "5500.00",
  "card_type": "VISA-XXXX",
  "store_amount": "5350.00",
  "bank_tran_id": "bank_txn_123",
  "card_no": "XXXXXXXXXXXX1234",
  "card_brand": "VISA",
  "card_issuer": "BRAC Bank",
  "currency": "BDT"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "received": true
  },
  "metadata": {}
}
```

#### POST /api/v1/payment/retry/:orderId

**Request:**
```json
{
  "paymentMethod": "card"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "paymentUrl": "https://sslcommerz.com/pay/...",
    "sessionKey": "session_abc123"
  },
  "metadata": {}
}
```

### Idempotency Implementation

```typescript
// Backend - Idempotency key generation and validation
const createIdempotencyKey = (orderId: string, paymentMethod: string): string => {
  const data = `${orderId}:${paymentMethod}:${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
};

// Check idempotency before creating order
const checkIdempotency = async (idempotencyKey: string): Promise<Order | null> => {
  const existingPayment = await paymentRepository.findByIdempotencyKey(idempotencyKey);
  if (existingPayment?.orderId) {
    const order = await orderRepository.findById(existingPayment.orderId);
    return order;
  }
  return null;
};

// Store idempotency key with payment
const storePaymentWithIdempotency = async (
  orderId: string,
  idempotencyKey: string,
  paymentData: PaymentData
): Promise<Payment> => {
  return paymentRepository.create({
    orderId,
    idempotencyKey,
    ...paymentData
  });
};
```

### Payment Status Check (for timeouts)

```typescript
// Backend - Check payment status from gateway
const checkPaymentStatus = async (orderId: string): Promise<PaymentStatus> => {
  const payment = await paymentRepository.findByOrderId(orderId);
  
  if (!payment) {
    return { status: 'not_found' };
  }
  
  // If already completed, return status
  if (payment.status === 'success' || payment.status === 'failed') {
    return { status: payment.status, payment };
  }
  
  // For pending, check with gateway
  if (payment.gateway === 'sslcommerz') {
    const gatewayStatus = await sslcommerz.checkTransactionStatus(payment.transactionId);
    
    if (gatewayStatus.status === 'SUCCESS') {
      await paymentRepository.update(payment.id, {
        status: 'success',
        completedAt: new Date()
      });
      return { status: 'success', payment };
    }
    
    if (gatewayStatus.status === 'FAILED') {
      await paymentRepository.update(payment.id, {
        status: 'failed',
        failureReason: gatewayStatus.failureReason
      });
      return { status: 'failed', payment };
    }
  }
  
  return { status: 'pending', payment };
};
```

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (payments, orders)
4. **API Versioning**: All endpoints under `/api/v1/`
5. **Idempotency**: Use idempotency keys to prevent duplicate orders
6. **Cart Preservation**: Don't clear cart on payment failure
7. **Webhook Security**: Validate webhook signatures from SSLCOMMERZ

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── checkout/
│       │   │   ├── components/
│       │   │   │   ├── payment-success.tsx
│       │   │   │   ├── payment-failure.tsx
│       │   │   │   ├── payment-pending.tsx
│       │   │   │   └── order-confirmation.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── use-payment-status.ts
│       │   │   │   └── use-payment-retry.ts
│       │   │   └── types/
│       │   │       └── index.ts
│       │   └── payment/
│       │       └── components/
│       │           └── payment-status-banner.tsx
│       └── lib/
│           └── api-client.ts
│
├── server/
│   └── src/
│       ├── controllers/
│       │   └── payment-controller.ts
│       ├── services/
│       │   ├── payment-service.ts
│       │   └── webhook-service.ts
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

- **TanStack Query**: Check payment status, retry payment
- **Zustand**: Payment outcome state (success, failure, pending)
- **React Context**: Checkout flow state preservation

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| crypto | built-in | Idempotency key generation |

---

## Previous Story Intelligence

### From Story 4.5 (COD Payment)

**Key Learnings:**

1. **Payment Model**: Payment model tracks status (pending, success, failed)
2. **Verification Flow**: OTP verification before order completion
3. **Failure Handling**: Clear error messages for failed verification

**Reuse for Story 4.6:**
- Payment status tracking pattern
- Error message display patterns
- Order creation after payment confirmation

### From Story 4.4 (SSLCOMMERZ Payment)

**Key Learnings:**

1. **Payment Gateway**: SSLCOMMERZ integration for card and wallet
2. **Redirect Flow**: Customer redirected to gateway, returns with result
3. **Transaction ID**: Gateway provides transaction ID for tracking

**Reuse for Story 4.6:**
- SSLCOMMERZ webhook handling
- Transaction status checking
- Payment success/failure detection

### From Story 4.3 (Delivery Options)

**Key Learnings:**

1. **Checkout Flow**: Multi-step checkout (address → delivery → payment → review)
2. **Order Summary**: Shows all order details before payment

**Reuse for Story 4.6:**
- Order summary on confirmation page
- Delivery details in confirmation

### From Story 4.2 (Address Validation)

**Key Learnings:**

1. **Address Storage**: Multiple addresses stored per user
2. **Serviceability**: Address determines available options

**Reuse for Story 4.6:**
- Address preserved on payment failure

### From Story 4.1 (Checkout Foundation)

**Key Learnings:**

1. **Checkout State**: Multi-step checkout with state preservation
2. **Guest Checkout**: Works without account

**Reuse for Story 4.6:**
- Guest checkout payment handling
- Cart preservation across payment attempts

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
- API response wrapper pattern consistently used
- TanStack Query for data fetching
- Zustand for client state
- Redis already used for sessions

For this story, we need to:

- Handle payment success webhook/redirect
- Create order after successful payment
- Show confirmation screen with order details
- Handle payment failure with clear messages
- Preserve cart and checkout state on failure
- Handle payment timeout scenarios
- Implement idempotency to prevent duplicates
- Handle pending payment states
- Check payment status when returning from gateway

---

## Latest Tech Information

### Payment Webhook Best Practices (2026)

```typescript
// Secure webhook handling
interface WebhookConfig {
  signatureHeader: string;
  signatureAlgorithm: 'sha256' | 'sha512';
  secretKey: string;
}

const verifyWebhookSignature = (
  payload: string,
  signature: string,
  config: WebhookConfig
): boolean => {
  const expectedSignature = crypto
    .createHmac(config.signatureAlgorithm, config.secretKey)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

// Webhook handler with idempotency
const handlePaymentWebhook = async (payload: PaymentWebhookPayload) => {
  const { tran_id, status } = payload;
  
  // Check idempotency - don't process same transaction twice
  const existingPayment = await paymentRepository.findByTransactionId(payload.bank_tran_id);
  if (existingPayment && existingPayment.status === 'success') {
    return { received: true, processed: false, reason: 'duplicate' };
  }
  
  // Process based on status
  if (status === 'VALID' || status === 'SUCCESS') {
    await processSuccessfulPayment(tran_id, payload);
  } else if (status === 'FAILED') {
    await processFailedPayment(tran_id, payload);
  }
  
  return { received: true, processed: true };
};
```

### Payment Confirmation UI Pattern

```tsx
// Frontend - Payment success confirmation
const PaymentSuccessPage = ({ orderNumber, orderDetails }) => {
  return (
    <div className="confirmation-page">
      <div className="success-icon">
        <CheckCircleIcon />
      </div>
      <h1>Payment Successful!</h1>
      <p className="order-number">Order #{orderNumber}</p>
      
      <OrderSummary order={orderDetails} />
      
      <div className="confirmation-actions">
        <Button onClick={() => navigate(`/orders/${orderNumber}`)}>
          Track Order
        </Button>
        <Button variant="outline" onClick={() => navigate('/')}>
          Continue Shopping
        </Button>
      </div>
      
      <p className="email-notice">
        A confirmation email has been sent to your email address.
      </p>
    </div>
  );
};

// Frontend - Payment failure with retry
const PaymentFailurePage = ({ failureReason, canRetry, orderId }) => {
  const failureMessages = {
    insufficient_funds: 'Your card has insufficient funds. Please try a different payment method.',
    card_declined: 'Your card was declined. Please contact your bank or try a different card.',
    network_error: 'A network error occurred. Please check your connection and try again.',
    timeout: 'The payment request timed out. Please try again.',
    invalid_card: 'The card details appear to be invalid. Please check and try again.',
  };
  
  return (
    <div className="failure-page">
      <div className="failure-icon">
        <ErrorIcon />
      </div>
      <h1>Payment Failed</h1>
      <p className="failure-message">
        {failureMessages[failureReason] || 'An error occurred during payment. Please try again.'}
      </p>
      
      {canRetry && (
        <div className="retry-actions">
          <Button onClick={() => retryPayment(orderId)}>
            Try Again
          </Button>
          <Button variant="outline" onClick={() => navigate('/checkout/payment')}>
            Change Payment Method
          </Button>
        </div>
      )}
      
      <p className="support-note">
        If the problem persists, please contact our support team.
      </p>
    </div>
  );
};
```

### Cart Preservation Pattern

```typescript
// Frontend - Preserve checkout state on payment failure
const useCheckoutState = () => {
  const [checkoutState, setCheckoutState] = useState({
    address: null,
    deliveryOption: null,
    paymentMethod: null,
    cartItems: [],
  });
  
  // Save state before payment attempt
  const saveCheckoutState = () => {
    localStorage.setItem('checkout_state', JSON.stringify(checkoutState));
  };
  
  // Restore state on payment failure
  const restoreCheckoutState = () => {
    const saved = localStorage.getItem('checkout_state');
    if (saved) {
      setCheckoutState(JSON.parse(saved));
    }
  };
  
  return { checkoutState, setCheckoutState, saveCheckoutState, restoreCheckoutState };
};
```

---

## Implementation Checklist

### Backend Tasks

- [ ] Add failureReason and gatewayResponse fields to Payment model in Prisma schema
- [ ] Add status field to Order model (confirmed, etc.)
- [ ] Create database migration
- [ ] Implement GET /api/v1/payment/status/:orderId
- [ ] Implement POST /api/v1/payment/webhook/sslcommerz
- [ ] Implement POST /api/v1/payment/retry/:orderId
- [ ] Add idempotency key validation
- [ ] Add webhook signature verification
- [ ] Implement payment status check from gateway
- [ ] Add order creation on successful payment
- [ ] Add inventory decrement on order creation
- [ ] Add confirmation email trigger on success
- [ ] Handle timeout scenarios
- [ ] Test webhook handling
- [ ] Test idempotency

### Frontend Tasks

- [ ] Create payment-success.tsx component
- [ ] Create payment-failure.tsx component
- [ ] Create payment-pending.tsx component
- [ ] Create order-confirmation.tsx component
- [ ] Create use-payment-status.ts TanStack Query hook
- [ ] Create use-payment-retry.ts TanStack Query hook
- [ ] Add payment status banner component
- [ ] Handle redirect from payment gateway
- [ ] Show order number on success
- [ ] Show order summary on success
- [ ] Show clear error message on failure
- [ ] Add retry button on failure
- [ ] Add change payment method option
- [ ] Preserve checkout state on failure
- [ ] Restore checkout state on retry
- [ ] Handle pending state with polling

### UX/UI Tasks

- [ ] Clear success confirmation with order number
- [ ] Order summary on confirmation page
- [ ] Track order button on confirmation
- [ ] Email confirmation notice
- [ ] Clear failure message with reason
- [ ] Retry button prominently displayed
- [ ] Change payment method option
- [ ] Support contact information
- [ ] Loading state for pending payments
- [ ] Works on mobile devices

---

## Success Criteria

The payment outcome handling is complete when:

1. **Success Detection**: Payment success detected via webhook or redirect
2. **Order Creation**: Order created immediately on successful payment
3. **Confirmation Screen**: Order number and summary displayed
4. **Email Trigger**: Confirmation email sent automatically
5. **Failure Detection**: Payment failure detected and categorized
6. **Clear Error**: Failure reason shown with actionable message
7. **Cart Preservation**: Cart and checkout state preserved on failure
8. **Retry Capability**: Customer can retry without re-entering details
9. **Timeout Handling**: Payment status checked when timeout occurs
10. **Idempotency**: Duplicate payment attempts don't create duplicate orders
11. **Pending State**: Pending payments show appropriate status
12. **Mobile**: Works on mobile devices

---

## Integration Points

### With Story 4.4 (SSLCOMMERZ Payment)

- Webhook handler processes SSLCOMMERZ responses
- Transaction status checking for timeouts
- Payment retry uses same gateway

### With Story 4.5 (COD Payment)

- COD success follows same pattern
- COD failure handled similarly
- Payment status unified across methods

### With Story 4.3 (Delivery Options)

- Delivery details shown in confirmation
- Order summary includes delivery info

### With Epic 3 (Cart Management)

- Cart preserved on payment failure
- Cart cleared on successful payment

### With Epic 5 (Order Management)

- Order status updates after payment
- Order tracking available from confirmation

---

## Edge Cases to Handle

1. **Webhook Received Before Redirect**: Process webhook, show success on return
2. **Redirect Received Before Webhook**: Check status on return, create order if needed
3. **Duplicate Webhook**: Idempotency prevents duplicate processing
4. **Invalid Webhook Signature**: Reject, log for investigation
5. **Gateway Timeout**: Check status via API, create order if succeeded
6. **Customer Closes Browser During Payment**: Check status on next visit
7. **Network Error During Redirect**: Show pending state, check status
8. **Partial Payment (Split Payment)**: Handle each method's status independently
9. **Refund After Success**: Handle refund status in order tracking
10. **Multiple Payment Methods**: Track each payment's status separately

---

## Notes

- Consider adding payment success analytics
- Consider adding failed payment recovery flow
- Consider adding "contact support" for persistent failures
- Consider adding payment method suggestions based on failure history

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created