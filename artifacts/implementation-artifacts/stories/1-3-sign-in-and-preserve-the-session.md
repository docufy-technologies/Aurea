# Story 1.3: Sign in and preserve the session

**Status**: ready-for-dev
**Story ID**: 1.3
**Story Key**: 1-3-sign-in-and-preserve-the-session
**Epic**: Epic 1 - Access, Accounts, and Trust
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a returning customer,**
**I want to sign in with email or mobile number,**
**So that I can continue shopping securely.**

### Business Context

This story implements the login functionality for returning customers. Authentication is critical for building trust and enabling personalized experiences. The session management ensures users stay logged in during their shopping journey while maintaining security through inactivity timeouts and rate limiting.

### Acceptance Criteria

#### AC1: Successful Login Redirects User

**Given** I enter valid credentials (email or mobile number with correct password)
**When** I sign in successfully
**Then** I am redirected to my previous page or the homepage
**And** the session remains active according to the inactivity rules

#### AC2: Session Persistence with Remember Me

**Given** I check the "remember me" option during login
**When** I successfully sign in
**Then** my session is extended to 30 days
**And** I remain logged in across browser sessions

#### AC3: Inactivity Timeout

**Given** I am logged in but remain inactive
**When** 30 minutes pass without activity
**Then** my session expires
**And** I am redirected to the login page

#### AC4: Failed Login Rate Limiting

**Given** I fail login 5 times from the same IP
**When** I try again
**Then** the system locks further attempts for 30 minutes
**And** a clear message explains why access is blocked

#### AC5: Invalid Credentials Show Error

**Given** I enter an invalid email/mobile or wrong password
**When** I attempt to sign in
**Then** the system shows a clear error message
**And** my attempt is counted toward rate limiting

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR7 | Customers must be able to log in using email address or mobile number |
| FR8 | Failed login attempts must be rate-limited after 5 attempts from the same IP |
| FR9 | Successful login must redirect users to their prior page or the homepage |
| FR10 | Authenticated sessions must expire after 30 minutes of inactivity |
| FR11 | Remember me must extend the session to 30 days |

---

## Technical Requirements

### Database Schema (Prisma)

The User model from Story 1.2 is extended with session-related fields:

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

  // Session fields for Story 1.3
  refresh_token   String?  @map("refresh_token")
  refresh_expires DateTime? @map("refresh_expires")
  last_login_at   DateTime? @map("last_login_at")
  login_attempts  Int      @default(0) @map("login_attempts")
  locked_until    DateTime? @map("locked_until")

  @@map("users")
}
```

### Session Storage (Redis)

Session data must be stored in Redis for performance:

```typescript
// Session key format: session:{userId}
interface SessionData {
  userId: string;
  email: string;
  isVerified: boolean;
  createdAt: Date;
  lastActivityAt: Date;
  rememberMe: boolean;
}
```

### JWT Configuration

| Token Type | Expiry | Storage | Purpose |
|------------|--------|---------|---------|
| Access Token | 30 minutes | Memory (client) | API authentication |
| Refresh Token | 30 days (remember me) / 24 hours (default) | HTTP-only cookie | Token refresh |

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/login` | POST | Authenticate user and create session |
| `/api/v1/auth/refresh` | POST | Refresh access token using refresh token |
| `/api/v1/auth/logout` | POST | Invalidate session and clear tokens |
| `/api/v1/auth/me` | GET | Get current authenticated user |

### Request/Response Formats

#### POST /api/v1/auth/login

**Request Body:**
```json
{
  "identifier": "customer@example.com",
  "password": "SecurePass123",
  "rememberMe": false
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "customer@example.com",
      "full_name": "John Doe",
      "is_verified": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 1800
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email/phone or password"
  }
}
```

**Rate Limited Response (429):**
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Too many failed attempts. Please try again in 30 minutes.",
    "details": {
      "lockedUntil": "2026-05-03T12:30:00Z"
    }
  }
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| identifier | Valid email or Bangladesh mobile format | INVALID_IDENTIFIER |
| identifier | Must exist in database | USER_NOT_FOUND |
| password | Must match stored hash | INVALID_CREDENTIALS |
| rememberMe | Boolean, optional | - |

### Rate Limiting Rules

- **Threshold**: 5 failed attempts from same IP
- **Lockout Duration**: 30 minutes
- **Reset**: Successful login clears failed attempts
- **Storage**: Redis for distributed rate limiting

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (`users`)
4. **Password Verification**: bcrypt compare (compatible with Story 1.2 hashing)
5. **JWT Implementation**: Use jsonwebtoken library
6. **Session Storage**: Redis for session data
7. **Rate Limiting**: Redis-based for distributed systems

### Security Requirements

| Requirement | Implementation |
|-------------|-----------------|
| Password verification | bcrypt.compare() |
| Token generation | jsonwebtoken with HS256 |
| Session storage | Redis with TTL |
| Rate limiting | Redis increment with expiry |
| Cookie security | httpOnly, secure, sameSite=strict |

### File Structure

Following the architecture document, create/modify these files:

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   └── auth/
│       │       ├── components/
│       │       │   ├── login-form.tsx
│       │       │   └── logout-button.tsx
│       │       ├── hooks/
│       │       │   └── use-login.ts
│       │       └── types/
│       │           └── index.ts
│       ├── hooks/
│       │   └── use-auth.ts
│       ├── stores/
│       │   └── auth-store.ts
│       └── pages/
│           └── login.tsx
│
├── server/
│   └── src/
│       ├── controllers/
│       │   └── auth-controller.ts (add login/refresh/logout endpoints)
│       ├── services/
│       │   └── auth-service.ts (add login logic)
│       ├── middleware/
│       │   ├── auth.ts (JWT verification)
│       │   └── rate-limit.ts (login-specific rate limiting)
│       ├── utils/
│       │   └── jwt.ts (token generation/verification)
│       └── routes/
│           └── auth-routes.ts (add login routes)
│
└── shared/
    └── src/
        └── types/
            └── user.ts (add session types)
```

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| jsonwebtoken | ^9.x | JWT token generation/verification |
| @types/jsonwebtoken | ^9.x | TypeScript types |
| redis | ^4.x | Session and rate limit storage |
| cookie-parser | ^1.x | Cookie parsing for refresh token |

---

## Previous Story Intelligence

### From Story 1.2: Create a verified customer account

**Key Learnings:**

1. **User Model**: The User model already exists with `password_hash` field - use bcrypt.compare() for verification
2. **API Response Format**: The wrapper format `{ success: boolean, data: T }` is established
3. **Validation**: Zod schemas are used for input validation
4. **Error Codes**: Error codes like `VALIDATION_ERROR`, `EMAIL_ALREADY_EXISTS` are used
5. **Database Conventions**: snake_case column names, plural table names

**Integration Points:**

- Login must verify against users created by Story 1.2 registration
- Password hashing must be compatible (bcrypt)
- The `is_verified` field affects login behavior (optional: restrict unverified users)

**Code Patterns to Follow:**

```typescript
// Example from Story 1.2 - Zod validation
const loginSchema = z.object({
  identifier: z.string().min(1, "Email or mobile is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional()
});

// Example - API response wrapper
return res.status(200).json({
  success: true,
  data: { user, accessToken }
});
```

---

## Git Intelligence Summary

No previous commits for this story yet. This is the first implementation after Story 1.2.

---

## Latest Tech Information

### JWT Best Practices (2026)

1. **Access Token**: Store in memory, not localStorage (XSS protection)
2. **Refresh Token**: HTTP-only cookie with secure flag
3. **Token Rotation**: Issue new refresh token on each use (optional for MVP)
4. **Logout**: Invalidate refresh token in database/Redis

### Redis Session Patterns

```typescript
// Session TTL based on rememberMe
const sessionTTL = rememberMe ? 30 * 24 * 60 * 60 : 30 * 60; // 30 days or 30 minutes
```

### Rate Limiting Implementation

```typescript
// Redis-based rate limiting
const key = `rate_limit:login:${ip}`;
const attempts = await redis.incr(key);
if (attempts === 1) {
  await redis.expire(key, 30 * 60); // 30 minutes
}
if (attempts > 5) {
  // Lockout
}
```

---

## Implementation Checklist

- [ ] Add session fields to User model in Prisma schema
- [ ] Create JWT utility functions (generate, verify, refresh)
- [ ] Create Redis session management utilities
- [ ] Create Zod validation schema for login
- [ ] Create login service with credential verification
- [ ] Create login API controller
- [ ] Add login routes to auth-routes.ts
- [ ] Implement rate limiting middleware for login
- [ ] Create frontend login form component
- [ ] Create login page route
- [ ] Implement auth context/hook for frontend
- [ ] Create logout functionality
- [ ] Implement session refresh endpoint
- [ ] Test successful login flow
- [ ] Test invalid credentials error
- [ ] Test rate limiting after 5 failures
- [ ] Test session expiry after inactivity
- [ ] Test remember me extends session to 30 days

---

## Success Criteria

The login feature is complete when:

1. **Valid credentials** authenticate successfully and return access token
2. **Redirect** goes to previous page or homepage after login
3. **Remember me** extends session to 30 days
4. **Inactivity** expires session after 30 minutes
5. **Invalid credentials** show clear error message
6. **Rate limiting** locks account after 5 failed attempts for 30 minutes
7. **API responses** follow the wrapper format exactly
8. **Tokens** are stored securely (access in memory, refresh in httpOnly cookie)
9. **Logout** invalidates session completely

---

## Integration Points

### With Story 1.2 (Registration)

Login authenticates users created by Story 1.2:
- Uses same password hashing (bcrypt)
- Checks same User table
- Validates against registered email/mobile

### With Story 1.4 (Password Reset)

Login flow must integrate with password reset:
- After password reset, all sessions are invalidated
- Rate limiting considers reset flow

### With Story 1.5 (Account Confirmation)

Optional integration:
- Unverified users may be restricted from login
- Or allowed with limited access until verified

---

## Edge Cases to Handle

1. **User not found**: Show generic "invalid credentials" message (security)
2. **Account locked**: Show lockout message with remaining time
3. **Concurrent login**: Allow multiple sessions or single session (configurable)
4. **Token theft**: Implement token rotation or refresh token invalidation
5. **Redis unavailable**: Fallback to database session or reject login
6. **Remember me on public device**: Warn user about security implications

---

## Notes

- Consider adding "show password" toggle in login form
- Mobile number login should handle both +880 and 0 prefixes
- Consider adding "stay logged in" checkbox UX
- Rate limiting should be IP-based for distributed systems
- Session refresh should happen before expiry to prevent interruption

**Status**: ready-for-dev
**Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created