# Story 1.4: Reset a forgotten password

**Status**: ready-for-dev
**Story ID**: 1.4
**Story Key**: 1-4-reset-a-forgotten-password
**Epic**: Epic 1 - Access, Accounts, and Trust
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a customer who cannot sign in,**
**I want to reset my password by email,**
**So that I can regain access safely.**

### Business Context

This story implements the password reset functionality for customers who have forgotten their password. The flow allows users to request a password reset via email, click a time-limited link, and set a new password that meets complexity requirements. All existing sessions are invalidated after a successful reset for security.

### Acceptance Criteria

#### AC1: Password Reset Request

**Given** I request a password reset from the login page
**When** my account exists
**Then** a reset email is sent within 60 seconds
**And** the reset link expires after 5 minutes

#### AC2: Password Reset Completion

**Given** I set a new password during reset
**When** the password meets complexity rules
**Then** the reset succeeds
**And** all existing sessions are invalidated

#### AC3: Invalid Reset Link

**Given** I use an expired or invalid reset link
**When** I attempt to reset my password
**Then** the system shows an error message
**And** I am redirected to request a new reset link

#### AC4: Password Complexity Enforcement

**Given** I enter a password that does not meet complexity rules
**When** I submit the new password
**Then** the system shows validation errors
**And** the reset does not proceed

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR16 | Password reset must be initiable from the login page |
| FR17 | Reset emails must be sent to registered email addresses |
| FR18 | Reset links must expire after 5 minutes |
| FR19 | Reset flow must require a new password that meets complexity requirements |
| FR20 | Reset must invalidate all active sessions and send confirmation email |

---

## Technical Requirements

### Database Schema (Prisma)

The User model from Story 1.2 is extended with password reset fields:

```prisma
model User {
  id              String    @id @default(uuid())
  email           String   @unique
  password_hash   String   @map("password_hash")
  full_name       String   @map("full_name")
  mobile          String   @unique
  is_verified     Boolean  @default(false) @map("is_verified")
  verification_token String? @map("verification_token")
  verification_expires DateTime? @map("verification_expires")
  created_at      DateTime @default(now()) @map("created_at")
  updated_at      DateTime @updatedAt @map("updated_at")

  // Password reset fields for Story 1.4
  reset_token      String?  @map("reset_token")
  reset_expires    DateTime? @map("reset_expires")

  @@map("users")
}
```

### Password Reset Token Strategy

- **Token Format**: Cryptographically secure random string (32 bytes, hex encoded)
- **Token Storage**: Hashed in database (never store plain tokens)
- **Expiry**: 5 minutes from request
- **Single Use**: Token invalidated after successful use or expiry

### Email Service Integration

The password reset email must include:
- Reset link with token: `https://aurea.com/auth/reset-password?token={token}`
- Clear instructions
- Security warning about the 5-minute expiry
- "If you didn't request this" notice

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/forgot-password` | POST | Request password reset email |
| `/api/v1/auth/reset-password` | POST | Reset password with valid token |
| `/api/v1/auth/validate-reset-token` | GET | Validate reset token before showing form |

### Request/Response Formats

#### POST /api/v1/auth/forgot-password

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
    "message": "If the account exists, a reset email has been sent"
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

#### POST /api/v1/auth/reset-password

**Request Body:**
```json
{
  "token": "abc123def456...",
  "newPassword": "SecurePass123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successful. Please log in with your new password."
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_RESET_TOKEN",
    "message": "Reset token is invalid or has expired"
  }
}
```

**Error Response (400) - Weak Password:**
```json
{
  "success": false,
  "error": {
    "code": "WEAK_PASSWORD",
    "message": "Password must be at least 8 characters with mixed case and a number",
    "details": {
      "requirements": ["minimum 8 characters", "at least one uppercase letter", "at least one lowercase letter", "at least one number"]
    }
  }
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| email | Valid email format | INVALID_EMAIL |
| email | Must exist in database | USER_NOT_FOUND |
| token | Must be valid and not expired | INVALID_RESET_TOKEN |
| token | Must not have been used | TOKEN_ALREADY_USED |
| newPassword | Minimum 8 characters | WEAK_PASSWORD |
| newPassword | At least one uppercase letter | WEAK_PASSWORD |
| newPassword | At least one lowercase letter | WEAK_PASSWORD |
| newPassword | At least one number | WEAK_PASSWORD |

### Session Invalidation Requirements

After successful password reset:
1. Delete all Redis sessions for the user: `session:{userId}*`
2. Clear any refresh tokens in database
3. Send confirmation email to user notifying of password change

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (`users`)
4. **Password Hashing**: bcrypt for new password hashing (compatible with Story 1.2)
5. **Token Security**: Hash reset tokens before storing (never store plain tokens)
6. **Session Storage**: Redis for session data (from Story 1.3)
7. **Rate Limiting**: Apply to prevent reset token enumeration attacks

### Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| Token generation | crypto.randomBytes(32).toString('hex') |
| Token storage | bcrypt.hash() before storing in DB |
| Token validation | bcrypt.compare() when user submits |
| Password hashing | bcrypt.hash() with cost factor 12 |
| Session invalidation | Redis DEL with pattern matching |
| Rate limiting | 10 requests/minute on forgot-password endpoint |

### File Structure

Following the architecture document, create/modify these files:

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   └── auth/
│       │       ├── components/
│       │       │   ├── forgot-password-form.tsx
│       │       │   └── reset-password-form.tsx
│       │       ├── hooks/
│       │       │   ├── use-forgot-password.ts
│       │       │   └── use-reset-password.ts
│       │       └── types/
│       │           └── index.ts
│       └── pages/
│           ├── forgot-password.tsx
│           └── reset-password.tsx
│
├── server/
│   └── src/
│       ├── controllers/
│       │   └── auth-controller.ts (add forgot-password, reset-password endpoints)
│       ├── services/
│       │   └── auth-service.ts (add password reset logic)
│       ├── utils/
│       │   ├── passwords.ts (add token generation, hashing)
│       │   └── email.ts (add password reset email template)
│       └── routes/
│           └── auth-routes.ts (add reset routes)
│
└── shared/
    └── src/
        └── types/
            └── user.ts (add password reset types)
```

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| crypto | built-in | Secure token generation |
| nodemailer | ^6.x | Email sending |
| @types/nodemailer | ^6.x | TypeScript types |

---

## Previous Story Intelligence

### From Story 1.3: Sign in and preserve the session

**Key Learnings:**

1. **Session Management**: Redis is used for session storage - must invalidate all sessions on password reset
2. **JWT Implementation**: Access/refresh token pattern established - refresh tokens must be cleared on reset
3. **Rate Limiting**: Redis-based rate limiting is implemented - apply to forgot-password endpoint
4. **API Response Format**: The wrapper format `{ success: boolean, data: T }` is established
5. **Error Codes**: Error codes like `INVALID_RESET_TOKEN`, `WEAK_PASSWORD` follow the pattern

**Integration Points:**

- Password reset must invalidate all sessions created by Story 1.3 login
- Rate limiting on forgot-password prevents token enumeration
- Email service integration needed (nodemailer)

**Code Patterns to Follow:**

```typescript
// Example from Story 1.3 - Redis session deletion
const pattern = `session:${userId}:*`;
const keys = await redis.keys(pattern);
if (keys.length > 0) {
  await redis.del(...keys);
}

// Example - API response wrapper
return res.status(200).json({
  success: true,
  data: { message: "Password reset successful" }
});
```

### From Story 1.2: Create a verified customer account

**Key Learnings:**

1. **User Model**: The User model has `password_hash` field - use bcrypt.hash() for new password
2. **Email Service**: Email sending is needed - use nodemailer
3. **Token Expiry**: Use DateTime with Prisma for expiry tracking

---

## Git Intelligence Summary

Recent commits in Epic 1:
- Story 1.1: Set up initial project from starter template
- Story 1.2: Create a verified customer account
- Story 1.3: Sign in and preserve the session

The codebase now has:
- Monorepo structure with pnpm workspaces
- User model with authentication fields
- JWT-based session management with Redis
- Rate limiting middleware

---

## Latest Tech Information

### Password Reset Security Best Practices (2026)

1. **Token Storage**: Always hash reset tokens before storing - never store plain tokens
2. **Token Expiry**: Keep short (5 minutes is appropriate for this use case)
3. **Single Use**: Invalidate token immediately after use
4. **Rate Limiting**: Prevent enumeration by rate limiting the forgot-password endpoint
5. **Email Timing**: Send immediately (within 60 seconds as per AC)
6. **Session Invalidation**: Clear all sessions after successful reset

### Token Generation Pattern

```typescript
// Generate secure reset token
const token = crypto.randomBytes(32).toString('hex');
const hashedToken = await bcrypt.hash(token, 10);
const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
```

### Redis Session Invalidation Pattern

```typescript
// Invalidate all sessions for user
const scanStream = redis.scanStream({
  match: `session:${userId}:*`,
  count: 100
});

for await (const keys of scanStream) {
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

---

## Implementation Checklist

- [ ] Add reset_token and reset_expires fields to User model in Prisma schema
- [ ] Create password reset token generation utility (crypto.randomBytes)
- [ ] Create token hashing utility (bcrypt.hash)
- [ ] Create Zod validation schema for forgot-password request
- [ ] Create Zod validation schema for reset-password request
- [ ] Create forgot-password service (generate token, send email)
- [ ] Create reset-password service (validate token, update password, invalidate sessions)
- [ ] Create forgot-password API controller
- [ ] Create reset-password API controller
- [ ] Add reset routes to auth-routes.ts
- [ ] Add rate limiting to forgot-password endpoint
- [ ] Create frontend forgot-password form component
- [ ] Create frontend reset-password form component
- [ ] Create forgot-password page route
- [ ] Create reset-password page route
- [ ] Implement email sending for reset link
- [ ] Implement session invalidation after successful reset
- [ ] Test forgot-password flow (email sent)
- [ ] Test invalid email (generic response)
- [ ] Test expired token (error message)
- [ ] Test weak password (validation error)
- [ ] Test successful reset (sessions invalidated)
- [ ] Test rate limiting on forgot-password endpoint

---

## Success Criteria

The password reset feature is complete when:

1. **Forgot Password**: Valid email receives reset email within 60 seconds
2. **Invalid Email**: Generic response shown (security - don't reveal if email exists)
3. **Reset Link Expiry**: Links expire after 5 minutes
4. **Password Complexity**: New password must be 8+ chars with mixed case and number
5. **Session Invalidation**: All existing sessions are cleared after reset
6. **Confirmation Email**: User receives email confirming password change
7. **API Responses**: Follow the wrapper format exactly
8. **Rate Limiting**: Forgot-password endpoint is rate limited
9. **Token Security**: Reset tokens are hashed before storage

---

## Integration Points

### With Story 1.3 (Login)

Password reset must integrate with login:
- After reset, all sessions from Story 1.3 are invalidated
- User must log in with new password
- Rate limiting considers reset attempts

### With Story 1.2 (Registration)

Password reset uses the same User model:
- Same password hashing (bcrypt)
- Same email field for reset delivery

### With Story 1.5 (Account Confirmation)

Future integration:
- Reset password does not require account verification
- Unverified accounts can reset password

---

## Edge Cases to Handle

1. **Email not found**: Show generic message (don't reveal if email exists)
2. **Token expired**: Show "link expired" with option to request new link
3. **Token already used**: Show "link already used" with option to request new
4. **Concurrent reset requests**: Allow multiple tokens (invalidate old ones)
5. **Redis unavailable**: Fallback to database session storage or show error
6. **Email service down**: Queue email or show error (don't expose internal issues)
7. **User requests multiple resets**: Allow but invalidate previous tokens
8. **Password reset during active session**: Invalidate all sessions including current

---

## Notes

- Consider adding "resend reset email" option if email not received
- Reset page should require password confirmation field
- Consider adding security questions as additional verification (post-MVP)
- Password reset link should be single-use
- Consider adding IP-based rate limiting for reset attempts
- Email template should be mobile-responsive

**Status**: ready-for-dev
**Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created