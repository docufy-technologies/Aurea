# Story 4.3: Choose delivery options and review the order

**Status**: ready-for-dev
**Story ID**: 4.3
**Story Key**: 4-3-choose-delivery-options-and-review-the-order
**Epic**: Epic 4 - Checkout, Delivery, and Payment
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a shopper,**
**I want to choose delivery speed and review the full order,**
**so that I understand what I am paying for.**

### Business Context

This story implements the delivery options selection and order review component of the checkout flow. It builds directly on Story 4.2 (address validation) where the address is validated for serviceability. The delivery options available depend on the validated address — express delivery is only available in supported areas, and standard delivery is available throughout serviceable areas.

Key business value: Clear delivery options and transparent order review builds trust and reduces cart abandonment. Customers need to understand exactly what they are paying for before committing to payment. This is a critical conversion point in the checkout flow.

This story directly supports:
- Story 4.2 (address validation) — delivery options depend on validated address
- Story 4.4 (payment via SSLCOMMERZ) — order review must be complete before payment
- Story 4.5 (COD) — COD eligibility and fee depend on delivery option and address
- Story 4.6 (payment handling) — order summary carried through to payment

### Acceptance Criteria

#### AC1: Delivery Options Display

**Given** I select a delivery address
**When** delivery options load
**Then** standard and express options appear where supported
**And** available slots reflect logistics capacity

#### AC2: Delivery Slot Selection

**Given** I select a delivery option
**When** I choose a date or time slot
**Then** the selection is saved and reflected in the order total

#### AC3: Order Review Summary

**Given** I reach the review step
**When** the summary renders
**Then** items, quantities, shipping costs, discounts, and totals are shown clearly

#### AC4: Terms Acceptance

**Given** I review the order
**When** I proceed to payment
**Then** I must accept terms and conditions before payment

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR51 | Standard delivery must be available with Dhaka and secondary city estimates |
| FR52 | Express delivery must be available in supported areas |
| FR53 | Delivery date and slot selection must reflect logistics capacity |
| FR54 | Order review must show items, quantities, prices, shipping costs, discounts, and payment method breakdown |
| FR55 | Terms and conditions acceptance must be required before payment proceeds |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR5 | Returning customer checkout must complete within 5 minutes |
| NFR13 | Delivery SLA performance should target 95% on-time delivery |

---

## Technical Requirements

### Database Schema (Prisma)

The delivery options are derived from the ServiceableArea model established in Story 4.2. This story adds delivery slot management.

```prisma
// Extended from Story 4.2 - ServiceableArea model
model ServiceableArea {
  id          String   @id @default(uuid())
  city        String   @map("city")
  district    String   @map("district")
  division    String   @map("division")
  serviceType String   @map("service_type") // standard, express, both
  codEnabled  Boolean  @default(true) @map("cod_enabled")
  createdAt   DateTime @default(now()) @map("created_at")

  @@unique([city, district])
  @@map("serviceable_areas")
}

// New for Story 4.3 - Delivery slots
model DeliverySlot {
  id            String   @id @default(uuid())
  areaId        String   @map("area_id") // FK to ServiceableArea
  deliveryType  String   @map("delivery_type") // standard, express
  date          DateTime @map("date")
  timeSlot      String   @map("time_slot") // morning, afternoon, evening
  capacity      Int      @default(50) @map("capacity")
  available     Int      @default(50) @map("available")
  priceOverride Decimal? @map("price_override") // Optional override for standard price

  serviceableArea ServiceableArea @relation(fields: [areaId], references: [id])

  @@index([areaId, date])
  @@map("delivery_slots")
}

// Order delivery details (linked to Order)
model OrderDelivery {
  id              String    @id @default(uuid())
  orderId         String    @unique @map("order_id")
  deliveryType    String    @map("delivery_type") // standard, express
  scheduledDate   DateTime? @map("scheduled_date")
  timeSlot        String?   @map("time_slot")
  shippingCost   Decimal   @default(0) @map("shipping_cost")
  estimatedDays   Int       @default(7) @map("estimated_days")

  order           Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@map("order_delivery")
}
```

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/delivery/options` | GET | Get available delivery options for address |
| `/api/v1/delivery/slots` | GET | Get available delivery slots for selected option |
| `/api/v1/checkout/review` | GET | Get order review summary with all costs |
| `/api/v1/checkout/validate` | POST | Validate checkout can proceed (address + delivery selected) |

#### GET /api/v1/delivery/options

**Query params:** `?address_id=addr_123` or body with address fields

**Response (200):**
```json
{
  "success": true,
  "data": {
    "options": [
      {
        "type": "standard",
        "name": "Standard Delivery",
        "description": "7-10 business days",
        "price": 60,
        "estimatedDays": 7,
        "available": true,
        "codEnabled": true
      },
      {
        "type": "express",
        "name": "Express Delivery",
        "description": "2-3 business days",
        "price": 150,
        "estimatedDays": 2,
        "available": true,
        "codEnabled": true,
        "areas": ["Gulshan", "Banani", "Dhanmondi", "Baridhara", "Uttara", "Mirpur", "Chattogram city center"]
      }
    ],
    "defaultOption": "standard"
  },
  "metadata": {}
}
```

#### GET /api/v1/delivery/slots

**Query params:** `?area_id=area_123&type=express&date=2026-05-10`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "slots": [
      {
        "id": "slot_1",
        "date": "2026-05-10",
        "timeSlot": "morning",
        "timeLabel": "9 AM - 12 PM",
        "available": 15,
        "price": 0
      },
      {
        "id": "slot_2",
        "date": "2026-05-10",
        "timeSlot": "afternoon",
        "timeLabel": "2 PM - 5 PM",
        "available": 8,
        "price": 0
      },
      {
        "id": "slot_3",
        "date": "2026-05-10",
        "timeSlot": "evening",
        "timeLabel": "6 PM - 9 PM",
        "available": 0,
        "price": 0,
        "soldOut": true
      }
    ],
    "nextAvailable": "2026-05-11"
  },
  "metadata": {}
}
```

#### GET /api/v1/checkout/review

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "item_1",
        "productId": "prod_123",
        "name": "Chanel No. 5 Eau de Parfum",
        "variant": "100ml",
        "image": "/images/products/chanel-5.jpg",
        "quantity": 1,
        "unitPrice": 12500,
        "totalPrice": 12500
      }
    ],
    "subtotal": 12500,
    "shipping": {
      "type": "express",
      "cost": 150,
      "estimatedDelivery": "May 5-6, 2026"
    },
    "discounts": [
      {
        "code": "WELCOME10",
        "amount": 1250,
        "description": "Welcome discount - 10%"
      }
    ],
    "codFee": 0,
    "total": 11400,
    "currency": "BDT",
    "termsAccepted": false
  },
  "metadata": {}
}
```

#### POST /api/v1/checkout/validate

**Request:**
```json
{
  "addressId": "addr_123",
  "deliveryType": "express",
  "slotId": "slot_1"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "canProceed": true,
    "warnings": []
  },
  "metadata": {}
}
```

**Response (400 - Validation Failed):**
```json
{
  "success": false,
  "error": {
    "code": "CHECKOUT_VALIDATION_FAILED",
    "message": "Please complete all required checkout steps",
    "details": {
      "missing": ["address", "delivery"]
    }
  }
}
```

### Delivery Pricing

| Delivery Type | Dhaka | Chattogram | Other Cities |
|---------------|-------|------------|-------------|
| Standard | BDT 60 | BDT 80 | BDT 100-150 |
| Express | BDT 150 | BDT 200 | Not available |

### Delivery Estimates

**Standard Delivery:**
- Dhaka: 7-10 business days
- Chattogram: 8-12 business days
- Other major cities: 10-14 business days
- Other areas: 14-21 business days

**Express Delivery:**
- Dhaka: 2-3 business days (selected areas)
- Chattogram: 3-4 business days (city center only)
- Other areas: Not available

### Time Slots

| Slot | Time | Availability |
|------|------|---------------|
| Morning | 9 AM - 12 PM | Standard + Express |
| Afternoon | 2 PM - 5 PM | Standard + Express |
| Evening | 6 PM - 9 PM | Express only (selected areas) |

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (delivery_slots, order_delivery)
4. **API Versioning**: All endpoints under `/api/v1/`
5. **Delivery Options**: Only show express if address supports it (from Story 4.2 serviceability)
6. **Order Review**: Must include all costs before payment (subtotal, shipping, discounts, COD fee if applicable)
7. **Terms Acceptance**: Must be captured and validated before payment proceeds

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── checkout/
│       │   │   ├── components/
│       │   │   │   ├── delivery-selector.tsx
│       │   │   │   ├── delivery-option-card.tsx
│       │   │   │   ├── delivery-slot-picker.tsx
│       │   │   │   ├── order-review.tsx
│       │   │   │   ├── order-item.tsx
│       │   │   │   └── terms-acceptance.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── use-delivery-options.ts
│       │   │   │   ├── use-delivery-slots.ts
│       │   │   │   └── use-checkout-review.ts
│       │   │   └── types/
│       │   │       └── index.ts
│       └── lib/
│           └── api-client.ts
│
├── server/
│   └── src/
│       ├── controllers/
│       │   ├── delivery-controller.ts
│       │   └── checkout-controller.ts
│       ├── services/
│       │   ├── delivery-service.ts
│       │   └── checkout-service.ts
│       ├── repositories/
│       │   ├── delivery-slot-repository.ts
│       │   └── order-delivery-repository.ts
│       └── routes/
│           └── delivery-routes.ts
│
└── shared/
    └── src/
        └── types/
            └── delivery.ts
```

### State Management

- **TanStack Query**: Fetch delivery options, slots, order review
- **Zustand**: Delivery selection state (selected option, slot, terms acceptance)
- **React Context**: Checkout flow state (current step, completed steps)

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @tanstack/react-query | ^5.x | Delivery data fetching |
| zustand | ^4.x | Delivery selection UI state |
| react-hook-form | ^7.x | Checkout form handling |
| zod | ^3.x | Form validation |
| date-fns | ^3.x | Date manipulation for slots |

---

## Previous Story Intelligence

### From Story 4.2 (Address Validation)

**Key Learnings:**

1. **Serviceability Model**: ServiceableArea model determines available delivery types
2. **Address-Delivery Link**: Address validation returns serviceType (standard, express, both)
3. **COD Eligibility**: Address determines COD availability via codEnabled flag
4. **Express Areas**: Only specific Dhaka and Chattogram areas support express delivery

**Reuse for Story 4.3:**
- Use address serviceability to filter delivery options
- Express only shown when serviceType includes 'express'
- Standard always available in serviceable areas
- COD fee calculation depends on delivery type + address

**Files Created in Story 4.2:**
- `packages/server/src/models/serviceable-area.model.ts`
- `packages/server/src/repositories/serviceable-area-repository.ts`
- `packages/server/src/services/delivery-service.ts` (partial)
- `packages/web/src/features/checkout/components/address-form.tsx`
- `packages/web/src/features/checkout/hooks/use-validate-address.ts`

### From Story 4.1 (Checkout Foundation)

**Key Learnings:**

1. **Checkout Flow**: Multi-step checkout with address → delivery → payment → review
2. **Cart Integration**: Cart items loaded for checkout, validated for stock/price
3. **Guest Checkout**: Guest users can proceed without account

**Reuse for Story 4.3:**
- Cart items available for order review
- Guest checkout supports delivery selection
- Checkout step tracking from Story 4.1

### From Epic 3 (Cart Management)

**Key Learnings:**

1. **Cart Persistence**: 30-day cart persistence established
2. **Cart Validation**: Stock and price validated before checkout
3. **Cart Totals**: Subtotal calculation pattern established

**Reuse for Story 4.3:**
- Cart items for order review
- Price validation (cart price vs checkout price)
- Subtotal display in review

---

## Git Intelligence Summary

From previous epics, the codebase has:

- Monorepo structure with pnpm workspaces (Story 1.1)
- User authentication with JWT and Redis sessions (Epic 1)
- Product catalog with variants (Epic 2)
- Cart with 30-day persistence (Epic 3)
- Address model and validation (Story 4.2)
- Checkout flow foundation (Story 4.1)
- API response wrapper pattern consistently used
- TanStack Query for data fetching
- Zustand for client state
- Zod validation patterns

For this story, we need to:

- Add delivery slot management
- Create delivery option selection UI
- Build order review summary component
- Implement terms acceptance checkbox
- Connect delivery selection to order total calculation
- Handle slot capacity and sold-out scenarios

---

## Latest Tech Information

### Delivery Slot Selection Pattern (2026)

```typescript
// Frontend - Delivery slot selection
const DeliverySlotPicker = ({ areaId, deliveryType }) => {
  const { data: slots, isLoading } = useDeliverySlots(areaId, deliveryType);
  const [selectedDate, setSelectedDate] = useState(null);

  const availableSlots = slots?.filter(s => s.available > 0) || [];
  const soldOutSlots = slots?.filter(s => s.available === 0) || [];

  return (
    <div className="slot-picker">
      <DatePicker
        onChange={setSelectedDate}
        minDate={new Date()}
        excludeDates={slots?.map(s => s.date)}
      />
      {selectedDate && (
        <div className="time-slots">
          {availableSlots.map(slot => (
            <button
              key={slot.id}
              disabled={slot.available === 0}
              className={slot.available < 5 ? 'low-stock' : ''}
            >
              {slot.timeLabel}
              {slot.available < 5 && <span className="warning">Only {slot.available} left</span>}
            </button>
          ))}
          {soldOutSlots.map(slot => (
            <button disabled className="sold-out">
              {slot.timeLabel} - Sold Out
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Order Review Component Pattern

```tsx
const OrderReview = ({ cart, delivery, discounts }) => {
  const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const shippingCost = delivery?.cost || 0;
  const discountTotal = discounts.reduce((sum, d) => sum + d.amount, 0);
  const total = subtotal + shippingCost - discountTotal;

  return (
    <div className="order-review">
      <h3>Order Summary</h3>
      
      <div className="items">
        {cart.items.map(item => (
          <div key={item.id} className="item">
            <img src={item.image} alt={item.name} />
            <div className="details">
              <h4>{item.name}</h4>
              {item.variant && <span className="variant">{item.variant}</span>}
              <span className="qty">Qty: {item.quantity}</span>
            </div>
            <span className="price">BDT {item.totalPrice.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="totals">
        <div className="row">
          <span>Subtotal</span>
          <span>BDT {subtotal.toLocaleString()}</span>
        </div>
        <div className="row">
          <span>Shipping ({delivery?.type})</span>
          <span>BDT {shippingCost.toLocaleString()}</span>
        </div>
        {discounts.length > 0 && (
          <div className="row discount">
            <span>Discounts</span>
            <span>-BDT {discountTotal.toLocaleString()}</span>
          </div>
        )}
        <div className="row total">
          <span>Total</span>
          <span>BDT {total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
```

### Delivery Cost Calculation

```typescript
// Backend - Calculate delivery cost
const calculateDeliveryCost = (address: Address, deliveryType: string): number => {
  const { city, district } = address;
  
  // Base rates by city tier
  const baseRates: Record<string, Record<string, number>> = {
    Dhaka: { standard: 60, express: 150 },
    Chattogram: { standard: 80, express: 200 },
    default: { standard: 100, express: 150 } // Other cities - express limited
  };

  const cityRates = baseRates[city] || baseRates.default;
  return cityRates[deliveryType] || cityRates.standard;
};
```

---

## Implementation Checklist

### Backend Tasks

- [ ] Add DeliverySlot model to Prisma schema
- [ ] Add OrderDelivery model to Prisma schema
- [ ] Create database migration
- [ ] Seed delivery slots for serviceable areas
- [ ] Create delivery-slot-repository
- [ ] Create order-delivery-repository
- [ ] Implement GET /api/v1/delivery/options endpoint
- [ ] Implement GET /api/v1/delivery/slots endpoint
- [ ] Implement GET /api/v1/checkout/review endpoint
- [ ] Implement POST /api/v1/checkout/validate endpoint
- [ ] Add delivery cost calculation logic
- [ ] Add slot capacity management
- [ ] Add sold-out slot handling
- [ ] Test delivery options API
- [ ] Test slots API
- [ ] Test review API

### Frontend Tasks

- [ ] Create delivery-selector.tsx component
- [ ] Create delivery-option-card.tsx component
- [ ] Create delivery-slot-picker.tsx component
- [ ] Create order-review.tsx component
- [ ] Create order-item.tsx component
- [ ] Create terms-acceptance.tsx component
- [ ] Create use-delivery-options.ts TanStack Query hook
- [ ] Create use-delivery-slots.ts TanStack Query hook
- [ ] Create use-checkout-review.ts TanStack Query hook
- [ ] Integrate delivery selection into checkout flow
- [ ] Add delivery cost to order total
- [ ] Add slot availability display (low stock warning)
- [ ] Add sold-out slot handling
- [ ] Add terms acceptance checkbox
- [ ] Add loading states for delivery options
- [ ] Add mobile-friendly delivery selection

### UX/UI Tasks

- [ ] Delivery options displayed as selectable cards
- [ ] Standard vs Express clearly differentiated
- [ ] Price and estimated delivery time shown per option
- [ ] Express option hidden if not available for address
- [ ] Time slots shown in user-friendly format
- [ ] Sold-out slots clearly marked
- [ ] Low stock warning for nearly full slots
- [ ] Order review shows all items with images
- [ ] Subtotal, shipping, discounts, total clearly separated
- [ ] Terms acceptance checkbox required
- [ ] Terms link opens modal or navigates to terms page
- [ ] Works on mobile devices

---

## Success Criteria

The delivery options and order review feature is complete when:

1. **Delivery Options**: Standard and express options shown based on address
2. **Express Filtering**: Express only shown where serviceable (from Story 4.2)
3. **Slot Selection**: Date and time slot selection works
4. **Slot Capacity**: Shows availability and handles sold-out slots
5. **Order Review**: Shows all items, quantities, prices
6. **Cost Breakdown**: Subtotal, shipping, discounts, total clearly displayed
7. **Terms Acceptance**: Required checkbox before payment
8. **Guest Checkout**: Works without account
9. **Returning Customer**: Pre-selects last used delivery option if available
10. **Mobile**: Works on mobile devices
11. **Performance**: Loads within 2 seconds
12. **Accessibility**: Keyboard navigable, screen reader friendly

---

## Integration Points

### With Story 4.2 (Address Validation)

- Address ID passed to get available delivery options
- Serviceability check determines express availability
- COD eligibility carried forward from address validation

### With Story 4.1 (Checkout Foundation)

- Checkout step flow: address → delivery → payment → review
- Cart items available for review
- Guest checkout support

### With Story 4.4 (Payment via SSLCOMMERZ)

- Order review must be complete before payment step
- Total amount includes shipping cost
- Terms acceptance required before payment

### With Story 4.5 (COD)

- COD fee added to total if COD selected
- COD availability depends on address + delivery type

### With Epic 3 (Cart Management)

- Cart items displayed in order review
- Price validation (cart price vs checkout price)
- Subtotal from cart items

---

## Edge Cases to Handle

1. **No Delivery Options**: Address not serviceable — redirect to address step with error
2. **Express Not Available**: Address doesn't support express — hide express option, show standard only
3. **Slot Sold Out**: Selected slot becomes full — show error, suggest alternative slots
4. **All Slots Full**: No available slots for date — show next available date
5. **Cart Price Changed**: Price changed since adding to cart — show warning, allow proceed
6. **Item Out of Stock**: Item became unavailable — show error, remove from review, allow proceed
7. **Discount Expired**: Discount code no longer valid — show error, remove from total
8. **Terms Not Accepted**: User tries to proceed without accepting — show validation error
9. **Delivery Change Mid-Checkout**: User changes address after selecting delivery — recalculate options
10. **Guest Session Timeout**: Guest session expires — preserve cart, require re-entry of contact info

---

## Notes

- Consider delivery date restrictions (no delivery on holidays)
- Consider weather-related delivery delays notification
- Consider delivery instructions field (floor, building access)
- Track delivery slot selection analytics
- Consider delivery time preference for future orders
- Consider same-day delivery for Dhaka (future enhancement)
- Consider scheduled delivery for gift orders (future enhancement)

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created