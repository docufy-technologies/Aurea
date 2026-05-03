# Story 4.2: Enter and validate a Bangladesh delivery address

**Status**: ready-for-dev
**Story ID**: 4.2
**Story Key**: 4-2-enter-and-validate-a-bangladesh-delivery-address
**Epic**: Epic 4 - Checkout, Delivery, and Payment
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a shopper,**
**I want to enter a structured address with serviceability checks,**
**so that I know the order can be delivered.**

### Business Context

This story implements the address entry and validation component of the checkout flow. It builds on Story 4.1 (checkout foundation) where the checkout flow is established. The address form must capture Bangladesh-specific address fields and validate serviceability to ensure orders can actually be delivered to the entered address.

Key business value: Accurate address collection and serviceability validation prevents failed deliveries, reduces return costs, and improves customer satisfaction. This validation is critical for the Bangladesh market where address formats vary significantly and some areas may not be serviceable for delivery.

This story directly supports:
- Story 4.1 (checkout foundation) — address form component
- Story 4.3 (delivery options) — address determines available delivery methods
- Story 4.4 (payment via SSLCOMMERZ) — validated address required before payment
- Story 4.5 (COD) — COD eligibility depends on address serviceability

### Acceptance Criteria

#### AC1: Bangladesh Address Form

**Given** I enter an address
**When** the form validates
**Then** Bangladesh address autocomplete and serviceability checks run

#### AC2: Unserviceable Address Handling

**Given** I enter an address in an unserviceable area
**When** validation runs
**Then** checkout is blocked with clear guidance explaining the limitation

#### AC3: Multiple Saved Addresses

**Given** I save multiple addresses
**When** I return later
**Then** I can select from my saved addresses

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR47 | Address autocomplete must support Bangladesh addresses |
| FR48 | Address form must capture name, street, area, city, district, and optional delivery instructions |
| FR49 | Address validation must verify serviceability before checkout proceeds |
| FR50 | Customers must be able to save multiple addresses and select among them |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR5 | Returning customer checkout must complete within 5 minutes |
| NFR13 | Delivery SLA performance should target 95% on-time delivery |

---

## Technical Requirements

### Database Schema (Prisma)

The Address model from Story 4.1 is reused. This story focuses on validation and serviceability.

```prisma
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
  deliveryInstructions String? @map("delivery_instructions")

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

// Serviceability lookup table (can be extended)
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
```

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/addresses` | GET | Get user's saved addresses |
| `/api/v1/addresses` | POST | Save new address |
| `/api/v1/addresses/:id` | PUT | Update address |
| `/api/v1/addresses/:id` | DELETE | Delete address |
| `/api/v1/addresses/validate` | POST | Validate address and check serviceability |
| `/api/v1/addresses/autocomplete` | GET | Autocomplete Bangladesh addresses |

#### GET /api/v1/addresses

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "addr_123",
      "name": "Home",
      "street": "123 Main Street",
      "area": "Gulshan",
      "city": "Dhaka",
      "district": "Dhaka",
      "division": "Dhaka",
      "postalCode": "1212",
      "country": "Bangladesh",
      "phone": "+8801XXXXXXXXX",
      "isDefault": true,
      "addressType": "SHIPPING",
      "deliveryInstructions": "Call before delivery"
    }
  ],
  "metadata": {}
}
```

#### POST /api/v1/addresses/validate

**Request:**
```json
{
  "street": "123 Main Street",
  "area": "Gulshan",
  "city": "Dhaka",
  "district": "Dhaka",
  "division": "Dhaka",
  "postalCode": "1212",
  "phone": "+8801XXXXXXXXX"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "serviceable": true,
    "serviceType": "both",
    "codEnabled": true,
    "deliveryEstimate": "7-10 business days",
    "expressAvailable": true,
    "expressEstimate": "2-3 business days"
  },
  "metadata": {}
}
```

**Response (400 - Unserviceable):**
```json
{
  "success": false,
  "error": {
    "code": "ADDRESS_UNSERVICEABLE",
    "message": "Delivery is not available to this location",
    "details": {
      "reason": "area_not_serviceable",
      "suggestedAreas": ["Dhaka", "Chattogram", "Sylhet", "Khulna"]
    }
  }
}
```

#### GET /api/v1/addresses/autocomplete

**Query params:** `?query=gul`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "street": "Gulshan 1",
      "area": "Gulshan",
      "city": "Dhaka",
      "district": "Dhaka",
      "division": "Dhaka"
    },
    {
      "street": "Gulshan 2",
      "area": "Gulshan",
      "city": "Dhaka",
      "district": "Dhaka",
      "division": "Dhaka"
    }
  ],
  "metadata": {}
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| name | Required, 2-100 chars | NAME_REQUIRED, NAME_INVALID |
| street | Required, max 200 chars | STREET_REQUIRED, STREET_TOO_LONG |
| area | Required, max 100 chars | AREA_REQUIRED |
| city | Required, must be serviceable | CITY_REQUIRED, CITY_UNSERVICEABLE |
| district | Required | DISTRICT_REQUIRED |
| division | Required | DIVISION_REQUIRED |
| postalCode | Optional, valid format | POSTAL_CODE_INVALID |
| phone | Required, Bangladesh format (+8801XXXXXXXX) | PHONE_REQUIRED, PHONE_INVALID |
| deliveryInstructions | Optional, max 500 chars | INSTRUCTIONS_TOO_LONG |

### Bangladesh Address Format

```typescript
interface BangladeshAddress {
  name: string;           // Recipient name
  street: string;         // House/road number, e.g., "123 Main Street"
  area: string;           // Area/zone, e.g., "Gulshan", "Banani", "Dhanmondi"
  city: string;          // City, e.g., "Dhaka", "Chattogram"
  district: string;      // District, e.g., "Dhaka", "Chattogram"
  division: string;      // Division, e.g., "Dhaka", "Chattogram"
  postalCode?: string;   // Optional postal code
  phone: string;         // Contact phone
  deliveryInstructions?: string; // Special instructions
}
```

### Serviceable Areas

**Standard Delivery (7-10 business days):**
- Dhaka (all areas)
- Chattogram (all areas)
- Sylhet (city area)
- Khulna (city area)
- Barisal (city area)
- Rajshahi (city area)
- Rangpur (city area)
- Mymensingh (city area)

**Express Delivery (2-3 business days):**
- Dhaka (selected areas: Gulshan, Banani, Dhanmondi, Baridhara, Uttara, Mirpur)
- Chattogram (city center only)

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (addresses, serviceable_areas)
4. **API Versioning**: All endpoints under `/api/v1/`
5. **Address Validation**: Must check serviceability before allowing checkout to proceed
6. **COD Eligibility**: Based on address serviceability (Story 4.5)
7. **Saved Addresses**: Returning customers can manage multiple addresses

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── checkout/
│       │   │   ├── components/
│       │   │   │   ├── address-form.tsx
│       │   │   │   ├── address-selector.tsx
│       │   │   │   ├── address-autocomplete.tsx
│       │   │   │   └── saved-address-card.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── use-addresses.ts
│       │   │   │   ├── use-validate-address.ts
│       │   │   │   └── use-save-address.ts
│       │   │   └── types/
│       │   │       └── index.ts
│       │   └── account/
│       │       └── components/
│       │           └── address-book.tsx
│       └── lib/
│           └── api-client.ts
│
├── server/
│   └── src/
│       ├── controllers/
│       │   ├── address-controller.ts
│       │   └── checkout-controller.ts
│       ├── services/
│       │   ├── address-service.ts
│       │   └── delivery-service.ts
│       ├── repositories/
│       │   ├── address-repository.ts
│       │   └── serviceable-area-repository.ts
│       ├── middleware/
│       │   └── address-serviceability.ts
│       └── routes/
│           └── address-routes.ts
│
└── shared/
    └── src/
        └── types/
            └── address.ts
```

### State Management

- **TanStack Query**: Fetch saved addresses, validate address, save address
- **Zustand**: Address form state (current address, validation status)
- **React Context**: Auth state for returning customer detection

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @tanstack/react-query | ^5.x | Address data fetching |
| zustand | ^4.x | Address form UI state |
| react-hook-form | ^7.x | Address form handling |
| zod | ^3.x | Form validation |
| @hookform/resolvers | ^3.x | Zod + React Hook Form |

---

## Previous Story Intelligence

### From Story 4.1 (Checkout Foundation)

**Key Learnings:**

1. **Checkout Flow**: Multi-step checkout established with address as first step
2. **Address Model**: Address model already defined in Prisma schema
3. **API Endpoints**: Address CRUD endpoints defined in Story 4.1
4. **Validation Pattern**: Zod validation patterns established
5. **API Response Format**: Consistent wrapper format used

**Files Created in Story 4.1:**
- `packages/server/src/models/address.model.ts`
- `packages/server/src/controllers/address-controller.ts`
- `packages/server/src/services/address-service.ts`
- `packages/server/src/repositories/address-repository.ts`
- `packages/web/src/features/checkout/components/address-form.tsx`

**Reuse for Story 4.2:**
- Address form component from Story 4.1
- Address validation logic
- Saved address display
- API endpoints for address CRUD

### From Epic 3 (Cart Management)

**Key Learnings:**

1. **Guest Cart Pattern**: Guest token handling established
2. **Cart Validation**: Stock and price validation before checkout

**Reuse for Story 4.2:**
- Guest address handling (no userId)
- Address validation before checkout proceeds

### From Epic 1 (Authentication)

**Key Learnings:**

1. **User Model**: User has address relationship
2. **Session Management**: JWT and session handling in place

**Reuse for Story 4.2:**
- User identification for saved addresses
- Phone validation (Bangladesh format)

---

## Git Intelligence Summary

From previous epics, the codebase has:

- Monorepo structure with pnpm workspaces (Story 1.1)
- User authentication with JWT and Redis sessions (Epic 1)
- Address model in Prisma (Story 4.1)
- Checkout flow with address step (Story 4.1)
- API response wrapper pattern consistently used
- TanStack Query for data fetching
- Zustand for client state
- Zod validation patterns

For this story, we need to:

- Add serviceability validation logic
- Add address autocomplete functionality
- Enhance address form with validation feedback
- Create saved address selection UI
- Add address management (edit, delete, set default)
- Handle unserviceable address scenarios

---

## Latest Tech Information

### Address Autocomplete for Bangladesh (2026)

```typescript
// Bangladesh address autocomplete
const addressAutocomplete = async (query: string) => {
  const response = await fetch(
    `/api/v1/addresses/autocomplete?query=${encodeURIComponent(query)}`
  );
  return response.json();
};

// Common Bangladesh areas for autocomplete
const bangladeshAreas = {
  Dhaka: ['Gulshan', 'Banani', 'Dhanmondi', 'Baridhara', 'Uttara', 'Mirpur', 'Mohammadpur', 'Savar'],
  Chattogram: ['GEC', 'Agrabad', 'Pahartali', 'Chawkbazar', 'Kotwali'],
  Sylhet: ['Zindabazar', 'Uposhohor', 'Lamabazar'],
  Khulna: ['Daulatpur', 'Khanjahan Ali', 'Khalishpur']
};
```

### Address Validation UX

```tsx
const AddressForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [serviceability, setServiceability] = useState(null);

  const onSubmit = async (data) => {
    const validation = await validateAddress(data);
    if (validation.serviceable) {
      // Proceed to next step
    } else {
      // Show error with suggestions
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Address fields */}
      {serviceability === false && (
        <Alert type="error">
          Delivery not available to this location.
          Try: Dhaka, Chattogram, Sylhet, Khulna
        </Alert>
      )}
    </form>
  );
};
```

### Serviceability Check Pattern

```typescript
// Backend serviceability check
const checkServiceability = async (address: BangladeshAddress) => {
  const serviceableArea = await ServiceableAreaRepository.find({
    city: address.city,
    district: address.district
  });

  if (!serviceableArea) {
    return {
      valid: true,
      serviceable: false,
      reason: 'area_not_serviceable',
      suggestedAreas: ['Dhaka', 'Chattogram', 'Sylhet', 'Khulna']
    };
  }

  return {
    valid: true,
    serviceable: true,
    serviceType: serviceableArea.serviceType,
    codEnabled: serviceableArea.codEnabled,
    deliveryEstimate: serviceableArea.serviceType === 'express' 
      ? '2-3 business days' 
      : '7-10 business days'
  };
};
```

---

## Implementation Checklist

### Backend Tasks

- [ ] Add ServiceableArea model to Prisma schema
- [ ] Create database migration
- [ ] Seed serviceable areas data
- [ ] Create serviceable-area-repository
- [ ] Enhance address-service with validation logic
- [ ] Create POST /api/v1/addresses/validate endpoint
- [ ] Create GET /api/v1/addresses/autocomplete endpoint
- [ ] Implement address serviceability check
- [ ] Implement address autocomplete logic
- [ ] Add COD eligibility check based on address
- [ ] Add error codes for unserviceable addresses
- [ ] Test address validation API
- [ ] Test autocomplete API

### Frontend Tasks

- [ ] Enhance address-form.tsx with validation feedback
- [ ] Create address-autocomplete.tsx component
- [ ] Create address-selector.tsx (saved addresses)
- [ ] Create saved-address-card.tsx component
- [ ] Create use-addresses.ts TanStack Query hook
- [ ] Create use-validate-address.ts mutation hook
- [ ] Create use-save-address.ts mutation hook
- [ ] Add serviceability error display
- [ ] Add suggested areas for unserviceable addresses
- [ ] Add address management (edit, delete, set default)
- [ ] Integrate with checkout flow
- [ ] Handle guest address (no userId)
- [ ] Add loading states for validation
- [ ] Add mobile-friendly address form

### UX/UI Tasks

- [ ] Address form shows validation errors inline
- [ ] Autocomplete dropdown shows suggestions
- [ ] Saved addresses displayed as selectable cards
- [ ] Unserviceable address shows clear error message
- [ ] Suggested areas shown for invalid addresses
- [ ] Default address indicator shown
- [ ] Edit/delete options on saved addresses
- [ ] Set as default option on addresses
- [ ] Delivery instructions field available
- [ ] Phone field with Bangladesh format hint
- [ ] Works on mobile devices

---

## Success Criteria

The address entry and validation feature is complete when:

1. **Address Form**: Captures all required Bangladesh address fields
2. **Validation**: Validates address format and required fields
3. **Serviceability Check**: Checks if address is in serviceable area
4. **Unserviceable Handling**: Blocks checkout with clear error for unserviceable addresses
5. **Autocomplete**: Provides address suggestions as user types
6. **Saved Addresses**: Returning customers can select from saved addresses
7. **Multiple Addresses**: Users can save, edit, delete multiple addresses
8. **Default Address**: Users can set a default shipping address
9. **Guest Address**: Guest users can enter address without account
10. **COD Eligibility**: Address determines COD availability (for Story 4.5)
11. **Express Availability**: Address determines express delivery option (for Story 4.3)
12. **Mobile**: Works on mobile devices

---

## Integration Points

### With Story 4.1 (Checkout Foundation)

- Address form component integrated into checkout flow
- Address validation runs when user proceeds from address step
- Saved addresses loaded for returning customers

### With Story 4.3 (Delivery Options)

- Serviceability check determines available delivery options
- Express delivery only available in supported areas
- Delivery cost calculated based on address

### With Story 4.4 (Payment via SSLCOMMERZ)

- Valid address required before payment step
- Address stored with order for fulfillment

### With Story 4.5 (COD)

- COD eligibility depends on address serviceability
- COD fee shown based on area

### With Epic 1 (Authentication)

- User identified by JWT token
- Saved addresses from user profile
- Phone validation uses Bangladesh format

---

## Edge Cases to Handle

1. **Unserviceable Address**: Address not in serviceable area — show error, suggest alternatives
2. **Partial Address**: User enters incomplete address — show validation errors for missing fields
3. **Invalid Phone**: Phone not in Bangladesh format — show format hint, validate strictly
4. **Duplicate Address**: User saves same address twice — allow or warn based on UX decision
5. **No Saved Addresses**: Returning customer with no saved addresses — show empty state, prompt to add
6. **Guest Address Lost**: Guest leaves and returns — preserve in session, not saved to profile
7. **Address Change Mid-Checkout**: User changes address after selecting delivery — recalculate options
8. **Service Area Expansion**: New areas become serviceable — update seed data, notify users
9. **COD in Non-COD Area**: User selects COD in non-COD area — show error, suggest alternatives
10. **Postal Code Format**: Invalid postal code format — allow but warn, don't block

---

## Notes

- Consider map-based address entry for future enhancement
- Consider address labeling (Home, Office, Other)
- Consider address validation via Google Maps API for accuracy
- Consider delivery time slot selection (morning/afternoon/evening)
- Track address validation failures for analytics
- Consider address standardization for consistency

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created