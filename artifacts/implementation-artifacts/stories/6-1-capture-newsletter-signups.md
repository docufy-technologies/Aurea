# Story 6.1: Capture newsletter signups

**Status**: ready-for-dev
**Story ID**: 6.1
**Story Key**: 6-1-capture-newsletter-signups
**Epic**: Epic 6 - Communications and Platform Reliability
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a visitor,**
**I want to subscribe to updates,**
**so that I can receive product and brand communications later.**

### Business Context

This story implements the newsletter signup functionality — capturing visitor interest for marketing communications. It builds on the core ecommerce functionality from previous epics where customers can browse, cart, checkout, and track orders. The newsletter signup is a key customer acquisition channel that enables ongoing communication with interested visitors.

Key business value: Newsletter signup captures leads for re-engagement, product launches, promotions, and brand building. This is a low-friction entry point for visitor conversion. The subscription data feeds into the marketing integration foundation (Story 6.2) and supports the observability requirements (Story 6.3).

This story also establishes the pattern for future communication features including email marketing, SMS notifications (already referenced in order tracking), and push notifications.

### Acceptance Criteria

#### AC1: Valid Email Submission

**Given** I submit a valid email address for newsletter signup
**When** the form validates successfully
**Then** my subscription is stored in the database
**And** the marketing integration receives the subscription event

#### AC2: Duplicate Email Handling

**Given** I submit an email that is already subscribed
**When** the signup is processed
**Then** the system recognizes the existing subscription
**And** returns a success response without creating a duplicate

#### AC3: Invalid Email Handling

**Given** I submit an invalid email format
**When** validation runs
**Then** a clear error message explains the issue
**And** the subscription is not stored

#### AC4: Success Feedback

**Given** my subscription is processed successfully
**When** the form submits
**Then** I see a confirmation message
**And** I remain on the same page without a full reload

#### AC5: Marketing Integration Event

**Given** a subscription is created or确认ed
**When** the process completes
**Then** an event is sent to the marketing integration
**And** the event includes email, timestamp, and source

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR79 | Newsletter signup and basic marketing integrations must be supported |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR1 | Homepage load must be under 3 seconds on 3G connections |
| NFR7 | Platform uptime must exceed 99.5% excluding scheduled maintenance |

---

## Technical Requirements

### Database Schema (Prisma)

This story requires a NewsletterSubscriber model to store subscription data.

```prisma
model NewsletterSubscriber {
  id          String   @id @default(uuid())
  email       String   @unique @map("email")
  source      String   @default("website") @map("source")
  status      SubscriberStatus @default(ACTIVE) @map("status")
  subscribedAt DateTime @default(now()) @map("subscribed_at")
  unsubscribedAt DateTime? @map("unsubscribed_at")
  ipAddress   String?  @map("ip_address")
  userAgent   String?  @map("user_agent")

  @@index([email])
  @@index([status])
  @@index([subscribedAt])
  @@map("newsletter_subscribers")
}

enum SubscriberStatus {
  ACTIVE
  UNSUBSCRIBED
  BOUNCED
}
```

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/newsletter/subscribe` | POST | Subscribe to newsletter |
| `/api/v1/newsletter/unsubscribe` | POST | Unsubscribe from newsletter |
| `/api/v1/newsletter/check` | GET | Check subscription status by email |

#### POST /api/v1/newsletter/subscribe

**Request:**
```json
{
  "email": "user@example.com",
  "source": "footer" // optional: footer, popup, checkout, product_page
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Successfully subscribed",
    "email": "user@example.com"
  },
  "metadata": {}
}
```

**Response (400 - already subscribed):**
```json
{
  "success": true,
  "data": {
    "message": "You are already subscribed",
    "email": "user@example.com"
  },
  "metadata": {}
}
```

**Response (400 - invalid email):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_EMAIL",
    "message": "Please enter a valid email address",
    "details": { "field": "email" }
  }
}
```

#### POST /api/v1/newsletter/unsubscribe

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Successfully unsubscribed"
  },
  "metadata": {}
}
```

#### GET /api/v1/newsletter/check?email=user@example.com

**Response (200):**
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "subscribed": true,
    "subscribedAt": "2026-05-03T10:00:00Z"
  },
  "metadata": {}
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| email | Required, valid email format | INVALID_EMAIL |
| email | Must be unique (or existing active) | ALREADY_SUBSCRIBED |
| source | Optional, max 50 chars | INVALID_SOURCE |

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (newsletter_subscribers)
4. **API Versioning**: All endpoints under `/api/v1/`
5. **Event System**: Use event naming pattern `newsletter.subscribed`, `newsletter.unsubscribed`
6. **Rate Limiting**: Apply public rate limit (60 req/min) to prevent abuse

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── newsletter/
│       │   │   ├── components/
│       │   │   │   ├── newsletter-form.tsx
│       │   │   │   ├── newsletter-signup.tsx
│       │   │   │   ├── newsletter-success.tsx
│       │   │   │   └── newsletter-inline.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── use-newsletter-subscribe.ts
│       │   │   │   └── use-newsletter-check.ts
│       │   │   ├── types/
│       │   │   │   └── index.ts
│       │   │   └── pages/
│       │   │       └── unsubscribe.tsx
│       │   └── layout/
│       │       ├── footer.tsx (newsletter signup in footer)
│       │       └── components/
│       │           └── newsletter-popup.tsx
│       ├── pages/
│       │   └── newsletter/
│       │       └── unsubscribe.tsx
│       └── lib/
│           └── api-client.ts (extend with newsletter endpoints)
│
├── server/
│   └── src/
│       ├── controllers/
│       │   └── newsletter-controller.ts
│       ├── services/
│       │   ├── newsletter-service.ts
│       │   └── marketing-integration-service.ts
│       ├── repositories/
│       │   └── newsletter-repository.ts
│       ├── events/
│       │   └── newsletter-events.ts
│       └── routes/
│           └── newsletter-routes.ts
│
└── shared/
    └── src/
        └── types/
            └── newsletter.ts
```

### State Management

- **TanStack Query**: Subscribe, unsubscribe, check subscription status
- **Zustand**: Newsletter popup visibility state
- **URL State**: Unsubscribe token in URL for direct unsubscription

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @tanstack/react-query | ^5.x | Newsletter data fetching |
| zustand | ^4.x | Newsletter popup state |
| zod | ^3.x | Email validation |

---

## Previous Story Intelligence

### From Epic 5 (Stories 5.1 - 5.5)

**Key Learnings:**

1. **Notification Pattern**: Story 5.2 established notification sending pattern
2. **Email Integration**: Confirmation emails sent via notification-service
3. **Event System**: Order events use dot notation pattern
4. **User Identification**: Guest vs authenticated user patterns established

**Reuse for Story 6.1:**

- Notification service for marketing event dispatch
- Event system pattern for newsletter events
- Error handling patterns from previous stories

### From Epic 4 (Stories 4.1 - 4.7)

**Key Learnings:**

1. **API Response Wrapper**: Consistent wrapper format used throughout
2. **Validation**: Zod validation with formatted error responses
3. **Rate Limiting**: Public endpoints have rate limiting

---

## Git Intelligence Summary

From Epics 1-5, the codebase has:

- Monorepo structure with pnpm workspaces (Story 1.1)
- User authentication with JWT and Redis sessions (Epic 1)
- Product, Category, Brand, Variant, Cart, CartItem models (Epics 2, 3)
- Order, OrderItem, Address, GuestOrder models (Epic 4)
- Checkout flow with payment integration (Epic 4)
- Order tracking with status timeline (Epic 5)
- Notification service for email/SMS (Epic 5)
- API response wrapper pattern consistently used
- TanStack Query for data fetching
- Zustand for client state
- Event system for async operations

For this story, we need to:

- Create NewsletterSubscriber model in Prisma
- Create newsletter API endpoints (subscribe, unsubscribe, check)
- Create newsletter service with marketing integration
- Create frontend newsletter signup components
- Add newsletter form to footer
- Add optional popup signup
- Implement event emission for marketing integration

---

## Latest Tech Information

### Newsletter Signup UX (2026)

```tsx
const NewsletterSignup = () => {
  const { mutate: subscribe, isPending } = useNewsletterSubscribe();

  const handleSubmit = (email: string) => {
    subscribe({ email, source: 'footer' }, {
      onSuccess: () => {
        toast.success('Successfully subscribed!');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Enter your email"
        required
      />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Subscribing...' : 'Subscribe'}
      </button>
    </form>
  );
};
```

### Marketing Integration Pattern

```typescript
// Event emission for marketing
const emitNewsletterEvent = async (email: string, event: string) => {
  const payload = {
    event: `newsletter.${event}`,
    timestamp: new Date().toISOString(),
    data: {
      email,
      source: 'website'
    }
  };

  // Send to marketing integration (Story 6.2 foundation)
  await marketingQueue.publish('newsletter.events', payload);
};
```

---

## Implementation Checklist

### Backend Tasks

- [ ] Add NewsletterSubscriber model to Prisma schema
- [ ] Add SubscriberStatus enum to Prisma schema
- [ ] Create database migration
- [ ] Create newsletter-repository with subscribe/unsubscribe/check methods
- [ ] Create newsletter-service with business logic
- [ ] Create marketing-integration-service for event dispatch
- [ ] Create POST /api/v1/newsletter/subscribe endpoint
- [ ] Create POST /api/v1/newsletter/unsubscribe endpoint
- [ ] Create GET /api/v1/newsletter/check endpoint
- [ ] Implement email validation (Zod)
- [ ] Implement duplicate handling
- [ ] Implement event emission for marketing
- [ ] Add rate limiting to newsletter endpoints
- [ ] Test subscribe API
- [ ] Test unsubscribe API
- [ ] Test check API
- [ ] Test invalid email handling

### Frontend Tasks

- [ ] Create newsletter-form.tsx component
- [ ] Create newsletter-signup.tsx component
- [ ] Create newsletter-success.tsx component
- [ ] Create newsletter-inline.tsx component
- [ ] Create use-newsletter-subscribe.ts TanStack Query hook
- [ ] Create use-newsletter-check.ts TanStack Query hook
- [ ] Extend api-client.ts with newsletter endpoints
- [ ] Add newsletter form to footer component
- [ ] Create newsletter-popup.tsx component
- [ ] Add popup trigger logic (show after 10 seconds, once per session)
- [ ] Create unsubscribe page (/newsletter/unsubscribe)
- [ ] Handle unsubscription via URL token

### UX/UI Tasks

- [ ] Newsletter form is simple and clear
- [ ] Email input has proper validation feedback
- [ ] Success message is visible after signup
- [ ] Error messages are clear and helpful
- [ ] Footer newsletter form is accessible
- [ ] Popup is not intrusive (can be closed)
- [ ] Works on mobile
- [ ] Loading states during submission
- [ ] Unsubscribe flow is straightforward

---

## Success Criteria

The newsletter signup feature is complete when:

1. **Valid Submission**: Email is stored in database on valid submission
2. **Duplicate Handling**: Already subscribed emails are recognized and handled gracefully
3. **Validation**: Invalid emails show clear error messages
4. **Success Feedback**: User sees confirmation after successful signup
5. **Marketing Event**: Subscription event is sent to marketing integration
6. **Unsubscribe**: Users can unsubscribe via email link
7. **Check Status**: Users can check their subscription status
8. **Footer Placement**: Newsletter form is visible in footer
9. **Popup**: Optional popup signup appears (non-intrusive)
10. **Mobile**: Works on mobile devices

---

## Integration Points

### With Epic 6 (Stories 6.2, 6.3)

- Story 6.2 (Integration Foundation): Marketing integration receives events
- Story 6.3 (Observability): Newsletter events are logged and monitored

### With Epic 5 (Order Communications)

- Order confirmation emails (Story 5.1) use notification service
- Order status notifications (Story 5.2) use same pattern
- Newsletter uses established notification infrastructure

### With Epic 4 (Checkout)

- Optional: Add newsletter signup option on checkout success page
- Captures engaged customers who just purchased

---

## Edge Cases to Handle

1. **Invalid Email Format**: Show validation error, don't store
2. **Already Subscribed**: Show "already subscribed" message, don't duplicate
3. **Already Unsubscribed**: Show "not subscribed" message
4. **Network Error**: Show retry option, allow retry without re-entering email
5. **Rate Limiting**: Show "too many requests" message if limit exceeded
6. **Empty Email**: Show "email required" error
7. **Very Long Source**: Truncate to 50 chars max
8. **Bot Submission**: Consider CAPTCHA for high-volume scenarios
9. **Marketing Integration Failure**: Log failure, still save subscription locally
10. **Double Submit**: Disable button during submission to prevent duplicates

---

## Notes

- Consider adding preference center for managing communication types
- Consider adding first name capture (optional) for personalization
- Consider A/B testing signup form placement and copy
- Track signup source for analytics (footer vs popup vs checkout)
- Monitor bounce rates and clean inactive subscribers periodically
- Consider double opt-in for better list quality (optional enhancement)

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created