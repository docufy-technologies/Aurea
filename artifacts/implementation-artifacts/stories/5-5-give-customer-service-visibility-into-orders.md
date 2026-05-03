# Story 5.5: Give customer service visibility into orders

**Status**: ready-for-dev
**Story ID**: 5.5
**Story Key**: 5-5-give-customer-service-visibility-into-orders
**Epic**: Epic 5 - Orders, Tracking, Returns, and Recovery
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a customer service agent,**
**I want order visibility and escalation support,**
**so that I can resolve customer issues quickly.**

### Business Context

This story implements the customer service visibility feature — the critical post-purchase support capability that gives customer service agents comprehensive order information to resolve issues without asking customers to repeat information. It builds on Stories 5.1 (order confirmation), 5.2 (live order status), 5.3 (modify/cancel), and 5.4 (refunds/returns) where all order management capabilities exist.

Key business value: Customer service visibility reduces call handling time, improves first-call resolution, and reduces customer frustration. Agents can see the complete order context including status history, payment details, shipping information, and any existing return/refund requests. This story satisfies FR78 while contributing to customer satisfaction targets (NFR14).

### Acceptance Criteria

#### AC1: Customer Service Order View

**Given** I am a customer service agent with appropriate permissions
**When** I open a customer order in support tools
**Then** I can see complete order details including status, history, payment, and shipping

#### AC2: Escalation Data Access

**Given** I need to escalate an issue
**When** I review the order
**Then** I can see relevant escalation data (modification history, refund requests, dispute status)
**And** I can act without asking the customer for basic order context again

#### AC3: Action Capabilities

**Given** I am reviewing a customer issue
**When** permissions allow
**Then** I can perform common support actions (cancel order, initiate refund, update address, process exchange)

#### AC4: Audit Trail

**Given** I take an action on behalf of a customer
**When** the action is recorded
**Then** the audit trail shows who acted, when, and the reason

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR78 | Customer service teams must have order visibility and escalation support |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR14 | Customer satisfaction should target 85% or higher |
| NFR10 | Access control must follow least-privilege principles |

---

## Technical Requirements

### Database Schema (Prisma)

This story extends the Order, Return, and related models from Stories 5.1-5.4 with customer service-specific fields and adds an audit trail.

```prisma
// Customer Service - extends Order from Stories 5.1-5.4
// Add customer service notes and internal flags

model Order {
  id              String        @id @default(uuid())
  orderNumber     String        @unique @map("order_number")
  userId          String?       @map("user_id") // NULL for guest orders
  guestEmail      String?       @map("guest_email")
  guestToken      String?       @map("guest_token")
  status          OrderStatus  @default(PENDING)
  
  // ... existing fields from Stories 5.1-5.4 ...
  
  // Customer service fields
  priority        Priority      @default(NORMAL) @map("priority")
  assignedAgent  String?       @map("assigned_agent")
  customerNote   String?       @map("customer_note")
  internalNote   String?      @map("internal_note")
  escalatedAt    DateTime?    @map("escalated_at")
  resolutionAt   DateTime?   @map("resolution_at")
  
  // Audit
  createdBy       String?       @map("created_by")
  updatedBy      String?       @map("updated_by")
  
  // Relations
  returns         Return[]
  csAuditTrail    CsAuditTrail[]
  
  // ... existing indexes and relations ...
  
  @@map("orders")
}

enum Priority {
  LOW
  NORMAL
  HIGH
  URGENT
  CRITICAL
}

model CsAuditTrail {
  id            String      @id @default(uuid())
  orderId       String      @map("order_id")
  action        CsAction    @map("action")
  description   String      @map("description")
  
  // Actor
  agentId       String      @map("agent_id")
  agentName     String      @map("agent_name")
  agentEmail    String      @map("agent_email")
  
  // Context
  previousValue String?     @map("previous_value")
  newValue      String?     @map("new_value")
  reason       String?     @map("reason")
  
  // Relations
  order         Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime    @default(now()) @map("created_at")
  
  @@index([orderId])
  @@index([agentId])
  @@index([createdAt])
  @@map("cs_audit_trail")
}

enum CsAction {
  ORDER_VIEWED
  ORDER_UPDATED
  ADDRESS_CHANGED
  ORDER_CANCELLED
  REFUND_INITIATED
  REFUND_PROCESSED
  RETURN_APPROVED
  RETURN_REJECTED
  EXCHANGE_PROCESSED
  PRIORITY_CHANGED
  ESCALATION_CREATED
  ESCALATION_RESOLVED
  NOTE_ADDED
  STATUS_OVERRIDE
  MANUAL_STATUS_UPDATE
}
```

### API Requirements

This story does not add new customer-facing APIs. Instead, it creates a separate customer service API with elevated permissions.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/cs/orders/:orderNumber` | GET | Get order for customer service |
| `/api/v1/cs/orders/:orderNumber/actions` | GET | Get available actions for agent |
| `/api/v1/cs/orders/:orderNumber/cancel` | POST | Cancel order (agent) |
| `/api/v1/cs/orders/:orderNumber/update-address` | POST | Update shipping address (agent) |
| `/api/v1/cs/orders/:orderNumber/initiate-refund` | POST | Initiate refund (agent) |
| `/api/v1/cs/orders/:orderNumber/notes` | POST | Add internal note |
| `/api/v1/cs/orders/:orderNumber/audit` | GET | Get audit trail |
| `/api/v1/cs/dashboard/stats` | GET | Get CS dashboard statistics |

#### Authentication

The customer service API requires elevated authentication:

```typescript
// Middleware requirements
const csAuthMiddleware = [
  // CS-specific JWT with agent role
  verifyCsToken,           // Validates CS agent JWT
  verifyCsRole,            // Verifies 'customer_service' role
  verifyCsPermissions,    // Verifies specific action permissions
  logCsAccess              // Logs access for audit
];
```

#### GET /api/v1/cs/orders/:orderNumber

**Request:** CS auth header required

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orderNumber": "AUREA-20260503-0001",
    "status": "PROCESSING",
    "priority": "HIGH",
    "escalatedAt": "2026-05-04T08:30:00Z",
    "assignedAgent": "agent-uuid-1",
    "customer": {
      "userId": "user-uuid-1",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+8801XXXXXXXXX",
      "accountAge": "2 years",
      "totalOrders": 15,
      "lifetimeValue": 187500
    },
    "items": [
      {
        "productName": "Chanel No. 5",
        "variantName": "100ml",
        "quantity": 1,
        "unitPrice": 12500,
        "totalPrice": 12500
      }
    ],
    "financials": {
      "subtotal": 12500,
      "shipping": 150,
      "discount": 0,
      "total": 12650,
      "paid": 12650,
      "refunded": 0,
      "pendingRefund": 0
    },
    "timeline": [
      {
        "status": "PENDING",
        "timestamp": "2026-05-03T10:25:00Z",
        "note": "Payment pending"
      },
      {
        "status": "CONFIRMED",
        "timestamp": "2026-05-03T10:30:00Z",
        "note": "Order confirmed"
      },
      {
        "status": "PROCESSING",
        "timestamp": "2026-05-03T14:00:00Z",
        "note": "Being prepared"
      }
    ],
    "payment": {
      "method": "card",
      "last4": "1234",
      "gateway": "SSLCOMMERZ",
      "transactionId": "TXN-20260503-0001"
    },
    "shipping": {
      "address": {
        "name": "John Doe",
        "street": "123 Main Street",
        "area": "Gulshan",
        "city": "Dhaka",
        "district": "Dhaka",
        "phone": "+8801XXXXXXXXX"
      },
      "method": "standard",
      "slot": "2026-05-10 Morning",
      "trackingNumber": "AUREA-TRK-0001"
    },
    "related": {
      "activeReturn": null,
      "pendingRefund": null,
      "previousOrders": 2
    },
    "actions": [
      {
        "action": "cancel_order",
        "allowed": true,
        "reason": "Customer request"
      },
      {
        "action": "update_address",
        "allowed": true,
        "reason": "Within modification window"
      },
      {
        "action": "initiate_refund",
        "allowed": true,
        "reason": null
      }
    ]
  },
  "metadata": {}
}
```

#### POST /api/v1/cs/orders/:orderNumber/cancel

**Request:** CS auth header required

**Body:**
```json
{
  "reason": "Customer requested cancellation",
  "reasonCategory": "CUSTOMER_REQUEST",
  "refundMethod": "original_payment",
  "notifyCustomer": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orderNumber": "AUREA-20260503-0001",
    "status": "CANCELLED",
    "refundStatus": "INITIATED",
    "refundAmount": 12650,
    "estimatedRefund": "2026-05-17T23:59:59Z",
    "auditId": "audit-uuid-1"
  },
  "metadata": {}
}
```

#### GET /api/v1/cs/orders/:orderNumber/audit

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orderNumber": "AUREA-20260503-0001",
    "auditTrail": [
      {
        "action": "ORDER_VIEWED",
        "description": "Order viewed by agent",
        "agentName": "Support Agent",
        "agentEmail": "agent@aurea.com",
        "timestamp": "2026-05-04T09:00:00Z"
      },
      {
        "action": "PRIORITY_CHANGED",
        "description": "Priority changed from NORMAL to HIGH",
        "agentName": "Support Lead",
        "agentEmail": "lead@aurea.com",
        "previousValue": "NORMAL",
        "newValue": "HIGH",
        "reason": "Customer escalation",
        "timestamp": "2026-05-04T08:30:00Z"
      },
      {
        "action": "ORDER_CREATED",
        "description": "Order placed",
        "agentName": "System",
        "agentEmail": "system@aurea.com",
        "timestamp": "2026-05-03T10:30:00Z"
      }
    ]
  },
  "metadata": {}
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| orderNumber | Must exist | ORDER_NOT_FOUND |
| agent | Must have CS role and permissions | INSUFFICIENT_PERMISSIONS |
| cancel reason | Required, max 500 characters | REASON_REQUIRED |
| action | Must be allowed for current order state | ACTION_NOT_ALLOWED |

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (orders, cs_audit_trail)
4. **API Versioning**: All endpoints under `/api/v1/cs/` (distinct from customer API)
5. **Authentication**: CS-specific JWT with agent role verification
6. **Authorization**: Least-privilege permissions per action
7. **Audit Trail**: All CS actions logged with who, when, what, why
8. **Separation**: CS API separated from customer API for security

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── orders/
│       │   │   ├── components/
│       │   │   │   ├── cs-order-detail.tsx
│       │   │   │   ├── cs-order-list.tsx
│       │   │   │   ├── cs-actions-panel.tsx
│       │   │   │   ├── cs-audit-trail.tsx
│       │   │   │   └── cs-customer-summary.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── use-cs-order.ts
│       │   │   │   └── use-cs-actions.ts
│       │   │   └── pages/
│       │   │       └── cs-order-detail.tsx
│       │   └── checkout/
│       │       └── pages/
│       │           └── success.tsx (extend with CS link)
│       └── lib/
│           └── api-client.ts (extend with CS endpoints)
│
├── server/
│   └── src/
│       ├── controllers/
│       │   ├── cs-order-controller.ts
│       │   └── cs-audit-controller.ts
│       ├── services/
│       │   ├── cs-order-service.ts
│       │   ├── cs-action-service.ts
│       │   └── cs-audit-service.ts
│       ├── repositories/
│       │   ├── cs-order-repository.ts
│       │   └── cs-audit-repository.ts
│       ├── routes/
│       │   └── cs-routes.ts
│       └── middleware/
│           ├── cs-auth.ts
│           └── cs-permissions.ts
│
└── shared/
    └── src/
        └── types/
            ├── cs-order.ts
            └── cs-audit.ts
```

### State Management

- **TanStack Query**: CS order data, audit trail
- **Zustand**: CS session, selected actions
- **URL State**: Order number in URL for direct linking

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @tanstack/react-query | ^5.x | CS order data fetching |
| date-fns | ^3.x | Timeline and audit date handling |
| zustand | ^4.x | CS UI state |

---

## Previous Story Intelligence

### From Story 5.4 (Handle refunds, partial returns, and exchanges)

**Key Learnings:**

1. **Return Model**: Return and ReturnItem models created with status tracking
2. **Refund Status**: Clear timeline from request to completion
3. **Partial Returns**: Item-level calculation implemented
4. **Exchange Flow**: Exchange vs refund decision handling
5. **Guest Orders**: Return request pattern established

**Files Created in Story 5.4:**

- Return, ReturnItem models in Prisma schema
- Return controller, refund controller
- Return request form components
- Refund status display

**Reuse for Story 5.5:**

- Extend CS order view to show return information
- Reuse refund processing for agent-initiated refunds
- Reuse customer lookup for order association

### From Story 5.3 (Modify or Cancel Eligible Orders)

**Key Learnings:**

1. **Order Modification**: Modification window fields added
2. **Cancellation**: Customer-initiated cancellation flow
3. **Address Updates**: Address change validation
4. **Refund Processing**: Established refund timeline rules

**Files Created in Story 5.3:**

- Modification window fields in Order
- Cancellation controller
- Address update endpoint
- Modification banner

**Reuse for Story 5.5:**

- Agents can modify orders within same windows
- Extend address update for CS context
- Reuse refund processing for CS-initiated actions

### From Story 5.2 (Live Order Status)

**Key Learnings:**

1. **Order Status Timeline**: Timeline tracking implemented
2. **SMS Notifications**: Status change notifications
3. **Order Number Format**: AUREA-YYYYMMDD-XXXX

**Files Created in Story 5.2:**

- Order status timeline
- useOrderStatus hook
- Notification service

**Reuse for Story 5.5:**

- Extend timeline for CS audit trail
- Reuse notification service for CS actions
- Order number format consistent

### From Story 5.1 (Order Confirmation and Tracking)

**Key Learnings:**

1. **Order Model**: Complete order model exists
2. **Order Retrieval**: Order endpoints established
3. **Guest Lookup**: Guest order pattern
4. **Tracking**: Tracking number generation

**Files Created in Story 5.1:**

- Order, OrderItem, OrderStatusHistory models
- Order controller, service, repository
- Order detail pages

**Reuse for Story 5.5:**

- Extend order retrieval for CS viewing
- Include customer data in CS view
- Reuse guest lookup pattern

### From Epic 4 (Checkout and Payment)

**Key Learnings:**

1. **Payment Integration**: SSLCOMMERZ refund API
2. **Order Totals**: Subtotal, shipping, discount breakdown
3. **COD Handling**: COD verification and fee rules

**Reuse for Story 5.5:**

- Agents can view payment details
- Agents can process refunds
- COD information visible

---

## Git Intelligence Summary

From previous epics, the codebase has:

- Monorepo structure with pnpm workspaces (Story 1.1)
- User authentication with JWT (Epic 1)
- Product, Category, Brand, Variant, Cart, CartItem models (Epics 2, 3)
- Order, OrderItem, OrderStatusHistory models (Stories 4.x, 5.1-5.4)
- Return and ReturnItem models (Story 5.4)
- Address validation and serviceability checks (Story 4.2)
- Payment integration with SSLCOMMERZ (Epic 4)
- Order confirmation and tracking (Stories 5.1, 5.2)
- Live order status with SMS notifications (Story 5.2)
- Order modification and cancellation (Story 5.3)
- Refunds, partial returns, exchanges (Story 5.4)
- API response wrapper pattern consistently used
- TanStack Query for data fetching
- Zustand for client state

For this story, we need to:

- Create CS-specific API endpoints under `/api/v1/cs/`
- Implement CS authentication with agent role
- Add CS audit trail model and logging
- Add customer service fields to Order (priority, notes, escalation)
- Create CS order detail view
- Create CS action capabilities (cancel, refund, address update)
- Add audit trail recording for all CS actions
- Implement least-privilege permission checks
- Create CS dashboard statistics endpoint

---

## Latest Tech Information

### Customer Service Order View UX (2026)

```tsx
const CsOrderDetail = ({ orderNumber }) => {
  const { data: order, isLoading } = useCsOrder(orderNumber);
  const { data: auditTrail } = useCsAuditTrail(orderNumber);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="cs-order-detail">
      <div className="cs-header">
        <h1>Order {order.orderNumber}</h1>
        <PriorityBadge priority={order.priority} />
        <StatusIndicator status={order.status} />
      </div>

      <div className="cs-customer-summary">
        <CustomerCard customer={order.customer} />
      </div>

      <div className="cs-items">
        <OrderItems items={order.items} />
      </div>

      <div className="cs-financials">
        <FinancialBreakdown financials={order.financials} />
      </div>

      <div className="cs-timeline">
        <OrderTimeline timeline={order.timeline} />
      </div>

      <div className="cs-actions">
        <CsActionsPanel
          order={order}
          availableActions={order.actions}
          onAction={handleAction}
        />
      </div>

      <div className="cs-audit">
        <CsAuditTrail auditTrail={auditTrail} />
      </div>
    </div>
  );
};
```

### CS Actions Panel UX

```tsx
const CsActionsPanel = ({ order, availableActions, onAction }) => {
  const [confirmDialog, setConfirmDialog] = useState(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="actions-grid">
          {availableActions.map((action) => (
            <Button
              key={action.action}
              variant={action.allowed ? "default" : "secondary"}
              disabled={!action.allowed}
              onClick={() => setConfirmDialog(action)}
            >
              {formatActionLabel(action.action)}
              {!action.allowed && (
                <span className="reason">{action.reason}</span>
              )}
            </Button>
          ))}
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmDialog !== null}
        action={confirmDialog}
        onConfirm={onAction}
        onCancel={() => setConfirmDialog(null)}
      />
    </Card>
  );
};
```

### Audit Trail Display

```tsx
const CsAuditTrail = ({ auditTrail }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Trail</CardTitle>
      </CardHeader>
      <CardContent>
        <Timeline>
          {auditTrail.map((entry) => (
            <TimelineItem key={entry.id}>
              <TimelineIcon
                icon={getActionIcon(entry.action)}
                variant={getActionVariant(entry.action)}
              />
              <TimelineContent>
                <div className="entry-header">
                  <span className="action">{entry.description}</span>
                  <span className="timestamp">
                    {formatDate(entry.timestamp)}
                  </span>
                </div>
                <div className="entry-detail">
                  <span className="agent">{entry.agentName}</span>
                  {entry.reason && (
                    <span className="reason">{entry.reason}</span>
                  )}
                </div>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </CardContent>
    </Card>
  );
};
```

---

## Implementation Checklist

### Backend Tasks

- [ ] Add priority field to Order model
- [ ] Add customer service fields to Order model
- [ ] Create CsAuditTrail model
- [ ] Create database migration
- [ ] Create cs-auth middleware
- [ ] Create cs-permissions middleware
- [ ] Create cs-order-repository
- [ ] Create cs-order-service
- [ ] Create cs-action-service
- [ ] Create cs-audit-service
- [ ] Create GET /api/v1/cs/orders/:orderNumber endpoint
- [ ] Create GET /api/v1/cs/orders/:orderNumber/actions endpoint
- [ ] Create POST /api/v1/cs/orders/:orderNumber/cancel endpoint
- [ ] Create POST /api/v1/cs/orders/:orderNumber/update-address endpoint
- [ ] Create POST /api/v1/cs/orders/:orderNumber/initiate-refund endpoint
- [ ] Create POST /api/v1/cs/orders/:orderNumber/notes endpoint
- [ ] Create GET /api/v1/cs/orders/:orderNumber/audit endpoint
- [ ] Create GET /api/v1/cs/dashboard/stats endpoint
- [ ] Implement CS role verification
- [ ] Implement permission checks per action
- [ ] Record all CS actions in audit trail
- [ ] Add internal notes to order
- [ ] Create priority handling
- [ ] Add escalation handling
- [ ] Test CS authentication
- [ ] Test permission checks
- [ ] Test audit trail recording
- [ ] Test CS order retrieval only

### Frontend Tasks

- [ ] Create cs-order-detail.tsx page
- [ ] Create cs-order-list.tsx page
- [ ] Create cs-actions-panel.tsx component
- [ ] Create cs-audit-trail.tsx component
- [ ] Create cs-customer-summary.tsx component
- [ ] Create use-cs-order.ts hook
- [ ] Create use-cs-actions.ts hook
- [ ] Create use-cs-audit.ts hook
- [ ] Extend api-client.ts with CS endpoints
- [ ] Create CS dashboard
- [ ] Add action confirmation dialogs
- [ ] Handle action outcomes
- [ ] Show audit trail viewer
- [ ] Add internal notes editor
- [ ] Handle priority changes
- [ ] Test on mobile devices

### UX/UI Tasks

- [ ] CS order view shows all relevant data
- [ ] Customer history visible
- [ ] Financial breakdown clear
- [ ] Actions clearly labeled
- [ ] Disabled actions show reason
- [ ] Audit trail chronological
- [ ] Internal notes secure
- [ ] Priority clearly indicated
- [ ] Escalation status visible
- [ ] Works on desktop admin panels
- [ ] Loading states for API calls
- [ ] Error states for permission failures

---

## Success Criteria

The customer service visibility feature is complete when:

1. **CS Order View**: Agents can see complete order details
2. **Customer Context**: Customer history visible (account age, lifetime value, orders)
3. **Actions Available**: Common actions (cancel, refund, address update) accessible
4. **Audit Trail**: All actions logged with who, when, what, why
5. **Permissions**: Least-privilege access control enforced
6. **Internal Notes**: Agents can add internal notes
7. **Priority**: Priority levels can be set and viewed
8. **Escalation**: Escalation status visible
9. **Dashboard**: CS dashboard shows statistics
10. **Security**: CS API separated with elevated auth

---

## Integration Points

### With Stories 5.1-5.4

- Extend order retrieval to include all previous story data
- Include return status in CS view
- Include refund status in CS view
- Include modification history

### With Epic 4

- View payment details
- Process refunds through SSLCOMMERZ
- Update shipping address

### With Epic 1

- CS agent authentication
- Role-based access control
- Agent audit trail

---

## Edge Cases to Handle

1. **Expired Token**: CS token expired — redirect to re-authentication
2. **Permission Denied**: Specific action not allowed — show clear message
3. **Order Not Found**: Invalid order number — show error with suggestions
4. **Customer Data Missing**: Incomplete customer info — flag for review
5. **Concurrent Modifications**: Order modified during view — show latest
6. **Refund Failure**: Payment gateway refund fails — show retry option
7. **Audit Trail Gap**: Missing audit entry — investigate and log
8. **Sensitive Data**: Payment full details — mask for agents without permission
9. **Guest Order**: Guest order CS view — show limited data with flag
10. **Agent Turnover**: Agent deactivated — reassign escalated orders

---

## Notes

- Consider adding CS live chat integration
- Consider adding order prediction/suggestions for agents
- Track CS agent performance metrics
- Add customer satisfaction follow-up tracking
- Consider AI-assisted response suggestions
- Add knowledge base integration for common issues
- TrackFirst call resolution rate
- Consider CS agent gamification

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created