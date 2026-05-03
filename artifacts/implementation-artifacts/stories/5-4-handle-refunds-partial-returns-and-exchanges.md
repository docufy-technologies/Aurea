# Story 5.4: Handle refunds, partial returns, and exchanges

**Status**: ready-for-dev
**Story ID**: 5.4
**Story Key**: 5-4-handle-refunds-partial-returns-and-exchanges
**Epic**: Epic 5 - Orders, Tracking, Returns, and Recovery
**Generated**: 2026-05-04

---

## Story Requirements

### User Story Statement

**As a customer,**
**I want refunds and returns to be transparent,**
**so that I understand exactly what happens after a return request.**

### Business Context

This story implements the refund, partial return, and exchange capabilities — the critical post-purchase recovery features that provide customers with clear expectations when returning products. It builds on Stories 5.1 (order confirmation), 5.2 (live order status), and 5.3 (modification and cancellation) where customers can track orders and cancel before processing begins.

Key business value: Transparent refund processes reduce customer support inquiries and build trust. Partial return handling allows customers to return part of an order (e.g., some items from a combo). Exchange vs refund options handle scenarios where replacement stock is unavailable. This story satisfies FR72, FR73, and FR74 while contributing to overall customer satisfaction targets (NFR14).

### Acceptance Criteria

#### AC1: Refund Request with Clear Breakdown

**Given** I request a refund for my entire order
**When** the system calculates the outcome
**Then** I see the refund breakdown including items, shipping, discounts, and any fees
**And** the timeline shows when I will receive my refund

#### AC2: Partial Return Calculation

**Given** I return only some items from my order (combo, bundle, or multipack)
**When** the system calculates the refund
**Then** I see the exact refund amount for each returned item
**And** I understand any restocking fees or shipping deductions

#### AC3: Refund Method Tracking

**Given** my refund is processed
**When** I view my refund status
**Then** I can see the transaction ID and expected completion date
**And** the refund follows the original payment method where applicable

#### AC4: Exchange vs Refund Decision

**Given** replacement stock is unavailable for my return
**When** I choose exchange or refund
**Then** I can pick the available recovery path
**And** the experience explains the next steps for my choice

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR72 | Refund status must be visible to customers with timelines and transaction IDs |
| FR73 | Partial returns must support combo and offer breakdowns with exact refund calculations |
| FR74 | Exchange vs refund flows must be supported when replacement stock is unavailable |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR14 | Customer satisfaction should target 85% or higher |
| NFR15 | Refunds to the original payment method should complete within 14 business days |

---

## Technical Requirements

### Database Schema (Prisma)

```prisma
// Returns and Refunds - extending Order from Stories 5.1-5.3
model Return {
  id              String        @id @default(uuid())
  orderId         String        @map("order_id")
  orderNumber    String        @map("order_number")
  userId          String?       @map("user_id")
  guestEmail     String?       @map("guest_email")
  
  // Return details
  returnType     ReturnType   @map("return_type") @default(FULL)
  status         ReturnStatus @default(PENDING_APPROVAL)
  reason         String       @map("reason")
  reasonCategory ReasonCategory @map("reason_category")
  
  // Financial
  refundAmount   Float        @default(0) @map("refund_amount")
  refundStatus   RefundStatus @default(PENDING) @map("refund_status")
  refundMethod   RefundMethod @map("refund_method")
  transactionId  String?      @map("transaction_id")
  processedAt    DateTime?    @map("processed_at")
  
  // Timeline
  requestedAt     DateTime     @default(now()) @map("requested_at")
  approvedAt     DateTime?   @map("approved_at")
  shippedAt      DateTime?    @map("shipped_at")
  receivedAt     DateTime?   @map("received_at")
  refundInitiatedAt DateTime? @map("refund_initiated_at")
  completedAt    DateTime?   @map("completed_at")
  
  // Notes
  customerNote   String?     @map("customer_note")
  adminNote      String?     @map("admin_note")
  
  items          ReturnItem[]
  
  // Relations
  order          Order        @relation(fields: [orderId], references: [id])
  user          User?        @relation(fields: [userId], references: [id])
  
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")
  
  @@index([orderId])
  @@index([orderNumber])
  @@index([userId])
  @@map("returns")
}

model ReturnItem {
  id              String      @id @default(uuid())
  returnId        String      @map("return_id")
  orderItemId     String      @map("order_item_id")
  productId       String      @map("product_id")
  variantId       String?    @map("variant_id")
  
  // Quantity being returned
  quantity        Int         @default(1)
  
  // Item prices at time of order
  unitPrice       Float       @map("unit_price") @map("unit_price")
  totalPrice     Float       @map("total_price")
  
  // Condition
  condition      ItemCondition @map("condition") @default(UNOPENED)
  
  // Refund calculation
  refundAmount    Float       @default(0) @map("refund_amount")
  restockingFee  Float       @default(0) @map("restocking_fee")
  
  // Relations
  return         Return       @relation(fields: [returnId], references: [id], onDelete: Cascade)
  orderItem     OrderItem   @relation(fields: [orderItemId], references: [id])
  product       Product     @relation(fields: [productId], references: [id])
  variant       Variant?    @relation(fields: [variantId], references: [id])
  
  createdAt     DateTime    @default(now()) @map("created_at")
  
  @@index([returnId])
  @@map("return_items")
}

enum ReturnType {
  FULL           // Full order return
  PARTIAL        // Partial return (some items)
  EXCHANGE       // Exchange for different item(s)
  REPLACEMENT    // Defective item replacement
}

enum ReturnStatus {
  PENDING_APPROVAL
  APPROVED
  REJECTED
  PENDING_PICKUP
  PICKED_UP
  IN_TRANSIT
  RECEIVED
  QUALITY_CHECK
  PROCESSING_REFUND
  REFUND_COMPLETE
  EXCHANGE_PREPARING
  EXCHANGE_SHIPPED
  COMPLETED
  CANCELLED
}

enum RefundStatus {
  PENDING
  INITIATED
  PROCESSING
  COMPLETED
  FAILED
}

enum RefundMethod {
  ORIGINAL_PAYMENT  // Back to original payment method
  STORE_CREDIT      // Store credit for faster refund
  BANK_TRANSFER     // Direct bank transfer (if original failed)
}

enum ReasonCategory {
  DAMAGED
  DEFECTIVE
  WRONG_ITEM
  NOT_AS_DESCRIBED
  CHANGED_MIND
  BETTER_PRICE_FOUND
  OTHER
}

enum ItemCondition {
  UNOPENED
  OPENED
  USED
  DAMAGED
}
```

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/returns` | GET | List my returns |
| `/api/v1/returns` | POST | Create a return request |
| `/api/v1/returns/:id` | GET | Get return details |
| `/api/v1/returns/:id/cancel` | POST | Cancel return request |
| `/api/v1/returns/:id/refund-status` | GET | Get refund status |
| `/api/v1/orders/:orderNumber/eligible-items` | GET | Get return-eligible items |

#### POST /api/v1/returns

**Request:** Auth header required

**Body:**
```json
{
  "orderNumber": "AUREA-20260503-0001",
  "returnType": "PARTIAL",
  "reason": "Wrong size ordered",
  "reasonCategory": "CHANGED_MIND",
  "items": [
    {
      "orderItemId": "item-uuid-1",
      "quantity": 1,
      "condition": "UNOPENED"
    }
  ],
  "customerNote": "Would like to exchange for larger size"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "returnId": "return-uuid",
    "returnNumber": "RET-20260503-0001",
    "orderNumber": "AUREA-20260503-0001",
    "returnType": "PARTIAL",
    "status": "PENDING_APPROVAL",
    "estimatedRefund": 2500,
    "refundMethod": "original_payment",
    "timeline": {
      "requestedAt": "2026-05-03T10:00:00Z",
      "estimatedApproval": "2026-05-03T18:00:00Z",
      "estimatedRefund": "2026-05-17T23:59:59Z"
    },
    "instructions": [
      "Pack item(s) in original packaging",
      "Attach the prepaid shipping label",
      "Drop off at any courier location"
    ]
  },
  "metadata": {}
}
```

**Response (400 - Not eligible):**
```json
{
  "success": false,
  "error": {
    "code": "RETURN_NOT_ELIGIBLE",
    "message": "This item is no longer eligible for return.",
    "details": {
      "reason": "return_window_expired",
      "returnWindowEnded": "2026-04-19T10:00:00Z"
    }
  }
}
```

#### GET /api/v1/returns/:id/refund-status

**Response (200):**
```json
{
  "success": true,
  "data": {
    "returnNumber": "RET-20260503-0001",
    "orderNumber": "AUREA-20260503-0001",
    "status": "REFUND_COMPLETE",
    "refundStatus": "COMPLETED",
    "refundAmount": 2500,
    "refundMethod": "original_payment",
    "transactionId": "TXN-REF-20260503-0001",
    "timeline": [
      {
        "stage": "RETURN_REQUESTED",
        "timestamp": "2026-05-03T10:00:00Z",
        "completed": true
      },
      {
        "stage": "RETURN_APPROVED",
        "timestamp": "2026-05-03T14:00:00Z",
        "completed": true
      },
      {
        "stage": "ITEM_RECEIVED",
        "timestamp": "2026-05-05T09:00:00Z",
        "completed": true
      },
      {
        "stage": "REFUND_PROCESSED",
        "timestamp": "2026-05-06T10:00:00Z",
        "completed": true,
        "note": "Transaction ID: TXN-REF-20260503-0001"
      }
    ],
    "estimatedCompletion": "2026-05-06T23:59:59Z",
    "completedAt": "2026-05-06T10:00:00Z"
  },
  "metadata": {}
}
```

#### GET /api/v1/orders/:orderNumber/eligible-items

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orderNumber": "AUREA-20260503-0001",
    "returnWindow": {
      "ends": "2026-05-17T10:00:00Z",
      "daysRemaining": 14
    },
    "eligibleItems": [
      {
        "orderItemId": "item-uuid-1",
        "productName": "Luxury Perfume - 50ml",
        "variant": "Rose Gold",
        "quantity": 1,
        "unitPrice": 2500,
        "totalPrice": 2500,
        "eligibleQuantity": 1,
        "isOpen": false
      },
      {
        "orderItemId": "item-uuid-2",
        "productName": "Gift Set - Deluxe",
        "variant": null,
        "quantity": 2,
        "unitPrice": 1500,
        "totalPrice": 3000,
        "eligibleQuantity": 0,
        "isOpen": true,
        "ineligibleReason": "item_opened"
      }
    ],
    "refundBreakdown": {
      "subtotal": 5500,
      "shipping": 150,
      "discount": -500,
      "restockingFee": 0,
      "refundableAmount": 5150
    }
  },
  "metadata": {}
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| orderNumber | Must exist and belong to user | ORDER_NOT_FOUND |
| returnType | Must be valid enum | INVALID_RETURN_TYPE |
| items | Required for PARTIAL return | ITEMS_REQUIRED |
| items[].quantity | Cannot exceed ordered quantity | INVALID_QUANTITY |
| reasonCategory | Required for return request | REASON_REQUIRED |
| reason | Required, max 500 characters | REASON_REQUIRED |
| condition | Required for each item | CONDITION_REQUIRED |

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (returns, return_items)
4. **API Versioning**: All endpoints under `/api/v1/`
5. **Return Window**: 14 days from delivery (configurable)
6. **Refund Timeline**: Process within 14 business days per NFR15
7. **Original Payment Method**: Default refund to original payment
8. **Partial Return Logic**: Calculate per-item refund with pro-rated shipping
9. **Restocking Fee**: Apply for opened items (configurable percentage)
10. **Status History**: Record all return status transitions

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── orders/
│       │   │   ├── components/
│       │   │   │   ├── return-request-form.tsx
│       │   │   │   ├── return-item-row.tsx
│       │   │   │   ├── refund-status-card.tsx
│       │   │   │   ├── exchange-option.tsx
│       │   │   │   ├── partial-return-calculator.tsx
│       │   │   │   └── return-timeline.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── use-return-request.ts
│       │   │   │   ├── use-refund-status.ts
│       │   │   │   └── use-return-eligible-items.ts
│       │   │   └── pages/
│       │   │       └── return-detail.tsx (extend from Story 5.1)
│       │   └── checkout/
│       │       └── pages/
│       │           └── success.tsx (extend with return link)
│       └── lib/
│           └── api-client.ts (extend with return endpoints)
│
├── server/
│   └── src/
│       ├── controllers/
│       │   ├── return-controller.ts
│       │   └── refund-controller.ts
│       ├── services/
│       │   ├── return-service.ts
│       │   ├── refund-service.ts
│       │   └── exchange-service.ts
│       ├── repositories/
│       │   ├── return-repository.ts
│       │   └── refund-repository.ts
│       ├── routes/
│       │   ├── return-routes.ts
│       │   └── refund-routes.ts
│       └── utils/
│           ├── refund-calculator.ts
│           └── restocking-fee.ts
│
└── shared/
    └── src/
        └── types/
            ├── return.ts
            └── refund.ts
```

### State Management

- **TanStack Query**: Fetch returns, refund status, eligible items
- **Zustand**: Return form state, item selection state
- **URL State**: Return number in URL for direct linking

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @tanstack/react-query | ^5.x | Return data fetching |
| date-fns | ^3.x | Timeline calculations |
| zustand | ^4.x | Return UI state |

---

## Previous Story Intelligence

### From Story 5.3 (Modify or Cancel Eligible Orders)

**Key Learnings:**

1. **Order Model**: Extended with modification window fields (modificationWindowEnds, canModify, canCancel)
2. **Cancellation**: Established refund timeline rules (14 business days)
3. **Order Status**: CANCELLED status in OrderStatus enum
4. **Guest Orders**: Guest order lookup pattern established
5. **Refund Processing**: Created refund-service with SSLCOMMERZ integration

**Files Created in Story 5.3:**

- Prisma: modification window fields added to Order
- Return controller, refund controller created
- Modification banner, cancellation dialog components

**Reuse for Story 5.4:**

- Extend RefundService for return-based refunds vs cancellation refunds
- Reuse order lookup logic (user vs guest)
- Reuse notification service for return status emails
- Reuse order-status-timeline for return timeline display

### From Story 5.2 (Live Order Status)

**Key Learnings:**

1. **Order Status History**: Timeline tracking already implemented
2. **SMS Notifications**: Status change notifications already exist
3. **Order Number**: Format already established (AUREA-YYYYMMDD-XXXX)

**Files Created in Story 5.2:**

- Order status timeline components
- useOrderStatus hook

**Reuse for Story 5.4:**

- Extend timeline to show return-specific stages
- Reuse SMS notification service for return updates
- Reuse guest order lookup for return requests

### From Epic 4 (Checkout and Payment)

**Key Learnings:**

1. **Payment Processing**: SSLCOMMERZ refund API available
2. **Order Totals**: Subtotal, shipping, discount breakdown exists

**Reuse for Story 5.4:**

- Reuse refund processing through SSLCOMMERZ
- Reuse refund calculation logic from checkout totals

---

## Git Intelligence Summary

From previous epics, the codebase has:

- Monorepo structure with pnpm workspaces (Story 1.1)
- User authentication with JWT (Epic 1)
- Product, Category, Brand, Variant, Cart, CartItem models (Epics 2, 3)
- Order, OrderItem, OrderStatusHistory models (Stories 4.x, 5.1-5.3)
- Address validation and serviceability checks (Story 4.2)
- Payment integration with SSLCOMMERZ (Epic 4)
- Order confirmation and tracking (Stories 5.1, 5.2)
- Live order status with SMS notifications (Story 5.2)
- Order modification and cancellation (Story 5.3)
- API response wrapper pattern consistently used
- TanStack Query for data fetching
- Zustand for client state

For this story, we need to:

- Create Return and ReturnItem models in Prisma schema
- Implement return request workflow
- Calculate partial return refunds with pro-rated amounts
- Handle restocking fees for opened items
- Create return status timeline (PENDING_APPROVAL → APPROVED → RECEIVED → REFUND_COMPLETE)
- Create refund status tracking with transaction IDs
- Implement exchange vs refund decision flow when stock unavailable
- Create POST /api/v1/returns endpoint
- Create GET /api/v1/returns/:id/refund-status endpoint
- Create GET /api/v1/orders/:orderNumber/eligible-items endpoint
- Integrate with SSLCOMMERZ refund API
- Create frontend return request form
- Create refund status display component
- Create return timeline component

---

## Latest Tech Information

### Return Request UX (2026)

```tsx
const ReturnRequestForm = ({ order, items, onSubmit }) => {
  const [returnType, setReturnType] = useState('PARTIAL');
  const [selectedItems, setSelectedItems] = useState([]);
  const [reason, setReason] = useState('');
  const [condition, setCondition] = useState('UNOPENED');

  const eligibleRefund = calculateRefund(order, selectedItems, condition);

  return (
    <Form>
      <FormField label="Return Type">
        <RadioGroup value={returnType} onValueChange={setReturnType}>
          <Radio value="FULL">Full Order Return</Radio>
          <Radio value="PARTIAL">Partial Return</Radio>
          <Radio value="EXCHANGE">Exchange</Radio>
        </RadioGroup>
      </FormField>

      {returnType === 'PARTIAL' && (
        <FormField label="Select Items">
          {items.map((item) => (
            <ReturnItemRow
              key={item.orderItemId}
              item={item}
              selected={selectedItems.includes(item.orderItemId)}
              onSelect={() => toggleItem(item.orderItemId)}
            />
          ))}
        </FormField>
      )}

      <FormField label="Reason">
        <Select value={reason} onValueChange={setReason}>
          <SelectItem value="CHANGED_MIND">Changed my mind</SelectItem>
          <SelectItem value="DAMAGED">Item damaged</SelectItem>
          <SelectItem value="WRONG_ITEM">Wrong item received</SelectItem>
          <SelectItem value="NOT_AS_DESCRIBED">Not as described</SelectItem>
        </Select>
      </FormField>

      {selectedItems.length > 0 && (
        <RefundBreakdown order={order} items={selectedItems} condition={condition} />
      )}

      <Button onClick={handleSubmit} disabled={!isValid}>
        Submit Return Request
      </Button>
    </Form>
  );
};
```

### Refund Status Display UX

```tsx
const RefundStatusCard = ({ refund }) => {
  const stages = [
    { key: 'RETURN_REQUESTED', label: 'Return Requested' },
    { key: 'APPROVED', label: 'Return Approved' },
    { key: 'RECEIVED', label: 'Item Received' },
    { key: 'REFUND_PROCESSED', label: 'Refund Processed' },
    { key: 'COMPLETED', label: 'Refund Complete' }
  ];

  const currentStage = stages.findIndex(s => s.key === refund.status);
  const isComplete = refund.refundStatus === 'COMPLETED';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Refund Status</CardTitle>
        <CardDescription>Return #{refund.returnNumber}</CardDescription>
      </CardHeader>

      <CardContent>
        <Timeline stages={stages} currentStage={currentStage} />

        {isComplete && (
          <div className="refund-complete">
            <CheckCircleIcon />
            <p>Refund of {formatCurrency(refund.refundAmount)} completed</p>
            <p className="method">
              Refunded to {refund.refundMethod === 'ORIGINAL_PAYMENT' 
                ? `Card ending in ${refund.last4}` 
                : refund.refundMethod}
            </p>
            <p className="transaction">
              Transaction ID: {refund.transactionId}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

### Partial Return Calculation

```typescript
const calculatePartialRefund = async (orderId, returnItems, condition) => {
  const order = await getOrder(orderId);
  const returnWindowDays = 14;
  
  // Calculate item-level refund
  let itemRefund = 0;
  let restockingFee = 0;
  
  for (const returnItem of returnItems) {
    const orderItem = order.items.find(i => i.id === returnItem.orderItemId);
    const itemTotal = orderItem.unitPrice * returnItem.quantity;
    itemRefund += itemTotal;
    
    // Restocking fee for opened items
    if (returnItem.condition === 'OPENED' || returnItem.condition === 'USED') {
      restockingFee += itemTotal * 0.10; // 10% restocking fee
    }
  }
  
  // Pro-rated shipping refund (only if full return)
  const isFullReturn = returnItems.length === order.items.length;
  const shippingRefund = isFullReturn ? order.shippingCost : 0;
  
  // Pro-rated discount adjustment
  const discountRatio = itemRefund / order.subtotal;
  const discountRefund = order.discount * discountRatio;
  
  const totalRefund = itemRefund + shippingRefund + discountRefund - restockingFee;
  
  return {
    itemRefund,
    shippingRefund,
    discountRefund,
    restockingFee,
    totalRefund: Math.max(0, totalRefund),
    timeline: processWithin14Days()
  };
};
```

---

## Implementation Checklist

### Backend Tasks

- [ ] Add Return and ReturnItem models to Prisma schema
- [ ] Create database migration
- [ ] Create return-repository with queries
- [ ] Create return-service with business logic
- [ ] Create refund-service (extend from Story 5.3)
- [ ] Create exchange-service for exchange flow
- [ ] Create POST /api/v1/returns endpoint
- [ ] Create GET /api/v1/returns/:id endpoint
- [ ] Create GET /api/v1/returns/:id/refund-status endpoint
- [ ] Create GET /api/v1/orders/:orderNumber/eligible-items endpoint
- [ ] Implement return window check (14 days from delivery)
- [ ] Implement eligibility validation (condition, window)
- [ ] Implement partial return calculation with pro-rated amounts
- [ ] Implement restocking fee logic
- [ ] Refund status tracking with transaction IDs
- [ ] Integrate with SSLCOMMERZ refund API
- [ ] Create return status timeline (PENDING_APPROVAL → APPROVED → RECEIVED → REFUND_COMPLETE)
- [ ] Send return confirmation email
- [ ] Send refund processed email/SMS
- [ ] Record status history in return timeline
- [ ] Test return request API
- [ ] Test partial return calculation
- [ ] Test refund status tracking
- [ ] Test exchange flow

### Frontend Tasks

- [ ] Create return-request-form.tsx component
- [ ] Create return-item-row.tsx component
- [ ] Create refund-status-card.tsx component
- [ ] Create exchange-option.tsx component
- [ ] Create partial-return-calculator.tsx component
- [ ] Create return-timeline.tsx component
- [ ] Create use-return-request.ts hook
- [ ] Create use-refund-status.ts hook
- [ ] Create use-return-eligible-items.ts hook
- [ ] Extend order-detail.tsx with return link
- [ ] Add return request button to order detail
- [ ] Handle return type selection
- [ ] Handle item selection for partial returns
- [ ] Handle reason and condition selection
- [ ] Show refund breakdown preview
- [ ] Handle exchange vs refund choice
- [ ] Show refund status timeline
- [ ] Show transaction ID when complete
- [ ] Test on mobile devices

### UX/UI Tasks

- [ ] Return request form accessible from order detail
- [ ] Clear return type selection (full/partial/exchange)
- [ ] Item selection easy for partial returns
- [ ] Reason categories clearly explained
- [ ] Condition impact on refund shown
- [ ] Refund breakdown clearly displayed
- [ ] Restocking fee explained if applicable
- [ ] Return timeline shows all stages
- [ ] Transaction ID visible when complete
- [ ] Works on mobile
- [ ] Loading states during API calls
- [ ] Error states for failed requests

---

## Success Criteria

The refund, partial return, and exchange feature is complete when:

1. **Return Request**: Customers can request returns for eligible items
2. **Partial Returns**: Partial returns show exact item-level refund calculations
3. **Restocking Fees**: Opened items show fee impact before confirming
4. **Refund Status**: Transaction ID and timeline visible throughout
5. **Timeline**: All return stages visible (requested → approved → received → refunded → complete)
6. **Notifications**: Email/SMS at each stage transition
7. **Original Payment**: Refunds go to original payment method
8. **Exchange Option**: Exchange choice when replacement stock unavailable
9. **Guest Support**: Guests can request returns
10. **Mobile**: Works on mobile devices

---

## Integration Points

### With Story 5.3 (Modify or Cancel)

- Cancellation and return are different flows (cancel = before processing, return = after delivery)
- Refund timeline rules already established (14 business days)
- RefundService reuse for processing refunds

### With Story 5.2 (Live Order Status)

- Return timeline integrates with order status
- SMS notifications extended for return updates
- Guest order lookup reused

### With Story 5.1 (Order Confirmation)

- Confirmation page links to return request
- Delivery date used for return window calculation

### With Epic 4 (Checkout and Payment)

- SSLCOMMERZ refund API integration
- Order totals calculation for partial prorating
- Original payment method stored

### With Epic 1 (Authentication)

- User identified by JWT token
- Authenticated users can request returns
- Guest users use order number + email lookup

---

## Edge Cases to Handle

1. **Return Window Expired**: Show clear message with deadline passed
2. **Item Not Eligible**: Specific items may have different return windows
3. **Opened Items**: Show restocking fee before confirming
4. **Missing Receipt**: Handle returns without original receipt
5. **Exchange Stock Unavailable**: Show timeline for restock or refund alternative
6. **Refund Failure**: Handle payment gateway refund failures
7. **Partial Refund Calculation**: Pro-rated shipping and discounts correctly
8. **Guest Return**: Verify email before allowing return
9. **Multiple Returns**: Handle multiple returns on same order
10. ** Damaged Item Claim**: Route to quality review for fraud prevention

---

## Notes

- Consider adding "return quality score" for supplier evaluation
- Track return reasons for product/supplier analytics
- Consider adding "instant exchange" for in-stock replacements
- Monitor refund dispute rate for fraud detection
- Consider pre-paid return labels for easier returns
- Work with logistics to include return labels in original packaging

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created