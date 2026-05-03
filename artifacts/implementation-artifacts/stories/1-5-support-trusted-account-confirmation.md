# Story 1.5: Support trusted account confirmation

**Status**: ready-for-dev
**Story ID**: 1.5
**Story Key**: 1-5-support-trusted-account-confirmation
**Epic**: Epic 1 - Access, Accounts, and Trust
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a customer,**
**I want my account state to reflect verification clearly,**
**So that I know when my account is ready for protected actions.**

### Business Context

This story implements the email verification flow that allows customers to confirm their account. When a customer registers in Story 1.2, their account is created in an unverified state. This story handles the email confirmation link, account activation, and status display. Once verified, the customer can access protected actions like checkout, order history, and saved addresses.

### Acceptance Criteria

#### AC1: Unverified Account Display

**Given** I have not confirmed my email
**When** I view account status
**Then** the system shows the account as unverified
**And** protected flows require verification when needed

#### AC2: Email Confirmation Flow

**Given** I confirm my email link
**When** confirmation completes
**Then** the account becomes active
**And** the status updates immediately

#### AC3: Verification Link Expiry

**Given** I receive a verification email
**When** I click the link after it has expired
**Then** the system shows an error message
**And** I can request a new verification email

#### AC4: Protected Actions for Unverified Users

**Given** I am logged in but my account is unverified
**When** I attempt to access protected actions (checkout, order history)
**Then** the system prompts me to verify my email first
**And** I can still browse products and add to cart

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR5 | Registration must send a welcome email with an account confirmation link |
| FR6 | New accounts must remain unverified until email confirmation is completed |

---

## Technical Requirements

### Database Schema (Prisma)

The User model from Story 1.2 already has verification fields:

```prisma
model User {
  id                   String    @id @default(uuid())
  email                String    @unique
  password_hash        String    @map("password_hash")
  full_name            String    @map("full_name")
  mobile               String    @unique
  is_verified          Boolean   @default(false) @map("is_verified")
  verification_token   String?   @map("verification_token")
  verification_expires DateTime? @map("verification_expires")
  created_at           DateTime  @default(now()) @map("created_at")
  updated_at           DateTime  @updatedAt @map("updated_at")

  @@map("users")
}
```

### Verification Token Strategy

- **Token Format**: Cryptographically secure random string (32 bytes, hex encoded)
- **Token Storage**: Hashed in database (never store plain tokens)
- **Expiry**: 24 hours from registration (longer than password reset for better UX)
- **Single Use**: Token invalidated after successful verification or expiry

### Email Service Integration

The welcome/confirmation email must include:
- Verification link: `https://aurea.com/auth/verify-email?token={token}`
- Clear instructions on what to do
- "If you didn't create this account" notice
- Account verification deadline

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/verify-email` | POST | Verify email with valid token |
| `/api/v1/auth/resend-verification` | POST | Resend verification email |
| `/api/v1/auth/verification-status` | GET | Get current verification status |

### Request/Response Formats

#### POST /api/v1/auth/verify-email

**Request Body:**
```json
{
  "token": "abc123def456..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully. Your account is now active.",
    "isVerified": true
  }
}
```

**Error Response (400) - Invalid Token:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_VERIFICATION_TOKEN",
    "message": "Verification token is invalid or has expired"
  }
}
```

#### POST /api/v1/auth/resend-verification

**Request Body:**
```json
{
  "email": "customer@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "If the account exists and is unverified, a verification email has been sent"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "No account found with this email address"
  }
}
```

#### GET /api/v1/auth/verification-status

**Response (200):**
```json
{
  "success": true,
  "data": {
    "isVerified": false,
    "email": "customer@example.com",
    "verifiedAt": null
  }
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| token | Must be valid and not expired | INVALID_VERIFICATION_TOKEN |
| token | Must not have been used | TOKEN_ALREADY_USED |
| email | Must exist in database | USER_NOT_FOUND |
| email | Must be unverified for resend | ACCOUNT_ALREADY_VERIFIED |

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (`users`)
4. **Password Hashing**: bcrypt for token hashing (compatible with Story 1.2 and 1.4)
5. **Token Security**: Hash verification tokens before storing (never store plain tokens)
6. **Session Storage**: Redis for session data (from Story 1.3)
7. **Rate Limiting**: Apply to prevent verification token enumeration

### Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| Token generation | crypto.randomBytes(32).toString('hex') |
| Token storage | bcrypt.hash() before storing in DB |
| Token validation | bcrypt.compare() when user submits |
| Rate limiting | 5 requests/minute on resend-verification endpoint |
| Email timing | Send within 60 seconds of registration (from Story 1.2) |

### File Structure

Following the architecture document, create/modify these files:

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   └── auth/
│       │       ├── components/
│       │       │   ├── verification-success.tsx
│       │       │   ├── verification-failed.tsx
│       │       │   └── resend-verification-form.tsx
│       │       ├── hooks/
│       │       │   ├── use-verification-status.ts
│       │       │   └── use-resend-verification.ts
│       │       └── types/
│       │           └── index.ts
│       └── pages/
│           ├── verify-email.tsx
│           └── verification-status.tsx
│
├── server/
│   └── src/
│       ├── controllers/
│       │   └── auth-controller.ts (add verify-email, resend-verification, verification-status endpoints)
│       ├── services/
│       │   └── auth-service.ts (add email verification logic)
│       ├── utils/
│       │   ├── tokens.ts (add verification token generation, hashing)
│       │   └── email.ts (add verification email template)
│       └── routes/
│           └── auth-routes.ts (add verification routes)
│
└── shared/
    └── src/
        └── types/
            └── user.ts (add verification types)
```

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| crypto | built-in | Secure token generation |
| nodemailer | ^6.x | Email sending (from Story 1.2, 1.4) |
| @types/nodemailer | ^6.x | TypeScript types |

---

## Previous Story Intelligence

### From Story 1.4: Reset a forgotten password

**Key Learnings:**

1. **Token Security Pattern**: Verification tokens should follow the same security pattern as password reset tokens - generate with crypto.randomBytes(32), hash with bcrypt before storing
2. **Token Expiry**: Password reset uses 5-minute expiry; verification tokens should use 24-hour expiry for better UX (user may not check email immediately)
3. **Generic Response**: For resend-verification, show generic response like password reset (don't reveal if email exists or is already verified)
4. **Rate Limiting**: Apply rate limiting to prevent token enumeration attacks
5. **Redis Integration**: Session data is stored in Redis - verification status should be cached for quick lookups

**Integration Points:**

- Verification uses the same token hashing pattern as password reset
- Email service integration is already in place from Story 1.2 and 1.4
- Rate limiting middleware is available

**Code Patterns to Follow:**

```typescript
// Example from Story 1.4 - Token generation and hashing
const token = crypto.randomBytes(32).toString('hex');
const hashedToken = await bcrypt.hash(token, 10);
const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

// Example - API response wrapper
return res.status(200).json({
  success: true,
  data: { message: "Email verified successfully", isVerified: true }
});
```

### From Story 1.3: Sign in and preserve the session

**Key Learnings:**

1. **Session Management**: Redis is used for session storage - verification status can be cached in session
2. **JWT Implementation**: Access/refresh token pattern - verification status should be included in JWT claims
3. **Protected Routes**: Middleware checks authentication - need to add verification check for protected actions

### From Story 1.2: Create a verified customer account

**Key Learnings:**

1. **User Model**: The User model already has `is_verified`, `verification_token`, and `verification_expires` fields
2. **Registration Flow**: Welcome email with verification link is sent during registration
3. **Email Service**: nodemailer is configured for sending emails

---

## Git Intelligence Summary

Recent commits in Epic 1:
- Story 1.1: Set up initial project from starter template
- Story 1.2: Create a verified customer account
- Story 1.3: Sign in and preserve the session
- Story 1.4: Reset a forgotten password

The codebase now has:
- Monorepo structure with pnpm workspaces
- User model with verification fields
- JWT-based session management with Redis
- Password reset functionality with token security
- Email service integration with nodemailer

---

## Latest Tech Information

### Email Verification Best Practices (2026)

1. **Token Storage**: Always hash verification tokens before storing - never store plain tokens
2. **Token Expiry**: 24 hours is appropriate for email verification (longer than password reset)
3. **Single Use**: Invalidate token immediately after successful verification
4. **Rate Limiting**: Prevent enumeration by rate limiting the resend endpoint
5. **Resend Limit**: Allow resend but limit frequency (e.g., 1 per minute)
6. **UX Considerations**: Show clear success message after verification, redirect to login or dashboard

### Verification Status in JWT

```typescript
// Include verification status in JWT payload
interface JWTPayload {
  userId: string;
  email: string;
  isVerified: boolean; // Add this
  iat: number;
  exp: number;
}
```

### Protected Action Middleware Pattern

```typescript
// Middleware to check verification status
const requireVerified = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.isVerified) {
    return res.status(403).json({
      success: false,
      error: {
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email to access this feature"
      }
    });
  }
  next();
};
```

---

## Implementation Checklist

- [ ] Add verification token generation utility (crypto.randomBytes)
- [ ] Add token hashing utility (bcrypt.hash)
- [ ] Create Zod validation schema for verify-email request
- [ ] Create Zod validation schema for resend-verification request
- [ ] Create verify-email service (validate token, update is_verified)
- [ ] Create resend-verification service (generate new token, send email)
- [ ] Create verification-status service (return current status)
- [ ] Create verify-email API controller
- [ ] Create resend-verification API controller
- [ ] Create verification-status API controller
- [ ] Add verification routes to auth-routes.ts
- [ ] Add rate limiting to resend-verification endpoint
- [ ] Update JWT payload to include isVerified
- [ ] Create middleware for protected actions (requireVerified)
- [ ] Create frontend verification success component
- [ ] Create frontend verification failed component
- [ ] Create frontend resend verification form component
- [ ] Create verification status page
- [ ] Implement email sending for verification (already exists from Story 1.2)
- [ ] Test verification with valid token (account becomes verified)
- [ ] Test verification with expired token (error message)
- [ ] Test verification with already-used token (error message)
- [ ] Test resend verification email
- [ ] Test rate limiting on resend-verification endpoint
- [ ] Test protected action blocked for unverified users

---

## Success Criteria

The email verification feature is complete when:

1. **Verification Link**: Valid token verifies the account and sets is_verified to true
2. **Expired Token**: Links expire after 24 hours with appropriate error
3. **Already Verified**: Attempting to verify an already-verified account shows appropriate message
4. **Resend Email**: Unverified users can request a new verification email
5. **Generic Response**: Resend shows generic message (security - don't reveal verification status)
6. **Protected Actions**: Unverified users are blocked from checkout, order history with clear prompt
7. **Status Display**: User can see their verification status in account settings
8. **API Responses**: Follow the wrapper format exactly
9. **Rate Limiting**: Resend-verification endpoint is rate limited
10. **Token Security**: Verification tokens are hashed before storage

---

## Integration Points

### With Story 1.2 (Registration)

Email verification uses the same flow:
- Verification email is sent during registration (Story 1.2)
- This story handles the verification link click and account activation
- Token generation and email sending already exist

### With Story 1.3 (Login)

Verification status affects session:
- Include isVerified in JWT payload
- Show verification status in UI
- Protected routes check verification status

### With Story 1.4 (Password Reset)

Verification shares patterns with password reset:
- Same token generation and hashing approach
- Similar rate limiting strategy
- Generic response for security

### With Epic 4 (Checkout)

Protected actions require verification:
- Checkout flow (Story 4.1) must check verification status
- Prompt unverified users to verify before proceeding
- Allow browsing and cart management without verification

---

## Edge Cases to Handle

1. **User already verified**: Show "Account is already verified" with link to login
2. **Token expired**: Show "Verification link has expired" with option to request new
3. **Token already used**: Show "Link already used" with option to request new
4. **Concurrent verification attempts**: Allow multiple tokens (invalidate old ones)
5. **Redis unavailable**: Fallback to database session storage or show error
6. **Email service down**: Queue email or show error (don't expose internal issues)
7. **User requests multiple resends**: Allow but rate limit (1 per minute)
8. **Verification during active session**: Update session immediately after verification
9. **Unverified user tries checkout**: Redirect to verification prompt, don't lose cart

---

## Notes

- Consider adding "verify later" option that reminds user later
- Verification status should be prominent in account settings
- Consider adding verification badge in UI for verified accounts
- Consider adding resend countdown timer (e.g., "Resend in 60 seconds")
- Email template should be mobile-responsive and match brand
- Consider adding social login verification handling (post-MVP)

**Status**: ready-for-dev
**Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created