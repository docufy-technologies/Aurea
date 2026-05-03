# Story 1.2: Create a verified customer account

**Status**: ready-for-dev
**Story ID**: 1.2
**Story Key**: 1-2-create-a-verified-customer-account
**Epic**: Epic 1 - Access, Accounts, and Trust
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a new customer,**
**I want to register with my email, password, name, and mobile number,**
**So that I can create a trusted account for faster checkout and order history.**

### Business Context

This story implements customer registration functionality for the Aurea ecommerce platform. Registration is the first step in building trust with customers and enabling personalized shopping experiences. The unverified account state ensures email ownership validation before granting full account access.

### Acceptance Criteria

#### AC1: Valid Registration Creates Unverified Account

**Given** I submit a valid registration form
**When** my email and mobile number are unique
**Then** the account is created in an unverified state
**And** the confirmation email is sent within 60 seconds

#### AC2: Invalid Form Shows Validation Errors

**Given** I enter an invalid email, weak password, or invalid Bangladesh mobile number
**When** I submit the form
**Then** validation errors explain the exact issue
**And** the account is not created

#### AC3: Duplicate Email/Mobile Rejection

**Given** I attempt to register with an email or mobile that already exists
**When** I submit the form
**Then** the system rejects with a clear duplicate error message

#### AC4: Email Confirmation Flow

**Given** I receive the confirmation email
**When** I click the confirmation link
**Then** my account status changes from unverified to verified

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR1 | Customers must be able to register using email address, password, full name, and mobile number |
| FR2 | Email addresses must be validated for format and uniqueness |
| FR3 | Passwords must enforce minimum complexity of 8+ characters with mixed case and a number |
| FR4 | Mobile numbers must validate against Bangladesh format and be unique across customer accounts |
| FR5 | Registration must send a welcome email with an account confirmation link |
| FR6 | New accounts must remain unverified until email confirmation is completed |

---

## Technical Requirements

### Database Schema (Prisma)

The User entity must include:

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
  
  @@map("users")
}
```

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/register` | POST | Register new customer account |
| `/api/v1/auth/confirm-email` | POST | Confirm email with token |
| `/api/v1/auth/resend-confirmation` | POST | Resend confirmation email |

### Request/Response Formats

#### POST /api/v1/auth/register

**Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "SecurePass123",
  "full_name": "John Doe",
  "mobile": "+8801XXXXXXXXX"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "customer@example.com",
      "full_name": "John Doe",
      "is_verified": false
    },
    "message": "Registration successful. Please check your email to verify your account."
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid form submission",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "password", "message": "Password must be at least 8 characters with mixed case and a number" }
    ]
  }
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| email | Valid email format | INVALID_EMAIL_FORMAT |
| email | Not already registered | EMAIL_ALREADY_EXISTS |
| password | Minimum 8 characters | PASSWORD_TOO_SHORT |
| password | At least one uppercase | PASSWORD_NO_UPPERCASE |
| password | At least one lowercase | PASSWORD_NO_LOWERCASE |
| password | At least one number | PASSWORD_NO_NUMBER |
| full_name | Minimum 2 characters | NAME_TOO_SHORT |
| mobile | Bangladesh format (+8801XXXXXXXXX) | INVALID_BD_MOBILE_FORMAT |
| mobile | Not already registered | MOBILE_ALREADY_EXISTS |

### Bangladesh Mobile Number Format

- Must start with: +8801
- Total length: 14 characters (including +)
- Valid prefixes: +8801[3-9]
- Example: +8801712345678

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- No special character required

### Email Confirmation Token

- Token type: UUID v4
- Expiry: 24 hours from registration
- Storage: `verification_token` field in User table
- Expiry storage: `verification_expires` field in User table

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object[] } }`
3. **Database Naming**: snake_case, plural table names (`users`)
4. **Password Hashing**: bcrypt with salt
5. **Token Storage**: UUID format, expires timestamp

### Security Requirements

| Requirement | Implementation |
|--------------|----------------|
| Password hashing | bcrypt with salt (cost factor 12) |
| SQL injection | Prisma parameterized queries |
| Input validation | Zod schemas |
| Rate limiting | 10 requests/minute for registration endpoint |
| Confirmation token | Cryptographically secure UUID |

### File Structure

Following the architecture document, create/modify these files:

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   └── auth/
│       │       ├── components/
│       │       │   ├── register-form.tsx
│       │       │   └── confirmation-success.tsx
│       │       ├── hooks/
│       │       │   └── use-register.ts
│       │       └── types/
│       │           └── index.ts
│       └── pages/
│           └── register.tsx
│
├── server/
│   └── src/
│       ├── controllers/
│       │   └── auth-controller.ts
│       ├── services/
│       │   └── auth-service.ts
│       ├── repositories/
│       │   └── user-repository.ts
│       ├── middleware/
│       │   └── validation.ts
│       ├── utils/
│       │   ├── passwords.ts
│       │   └── jwt.ts
│       └── routes/
│           └── auth-routes.ts
│
└── shared/
    └── src/
        ��── types/
            └── user.ts
```

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| zod | ^3.x | Input validation |
| bcryptjs | ^2.x | Password hashing |
| uuid | ^9.x | Token generation |

---

## Implementation Checklist

- [ ] Create User model in Prisma schema (AC: #1)
- [ ] Create bcrypt password hashing utility (AC: #1)
- [ ] Create Zod validation schemas for registration (AC: #2)
- [ ] Create user repository with uniqueness checks (AC: #3)
- [ ] Create auth service with registration logic (AC: #1)
- [ ] Create registration API controller (AC: #1)
- [ ] Create auth routes with register endpoint (AC: #1)
- [ ] Create frontend register form component (AC: #1, #2)
- [ ] Create register page route (AC: #1)
- [ ] Add rate limiting to registration endpoint (AC: #2)
- [ ] Create email service for confirmation emails (AC: #1)
- [ ] Create email confirmation endpoint (AC: #4)
- [ ] Test registration flow end-to-end
- [ ] Test validation error display (AC: #2)
- [ ] Test duplicate rejection (AC: #3)

---

## Success Criteria

The registration feature is complete when:

1. **Valid registration** creates an unverified user account
2. **Confirmation email** is queued/sent within 60 seconds
3. **Invalid inputs** show clear validation errors
4. **Duplicate email/mobile** is rejected with appropriate error
5. **Email confirmation** updates user to verified state
6. **API responses** follow the wrapper format exactly
7. **Database** stores password hash (not plain text)
8. **Rate limiting** prevents abuse of registration endpoint

---

## Integration Points

### With Story 1.1 (Project Setup)

This story builds on the monorepo structure established in Story 1.1:
- Uses existing Prisma setup
- Uses API route patterns from architecture
- Uses shared types package if needed

### With Story 1.3 (Sign In)

Registration creates users that Story 1.3 will authenticate:
- Password hashing must be compatible with login
- Session management follows from verified state

### With Story 1.5 (Account Confirmation)

This story implements the initial confirmation flow:
- Story 1.5 will complete the full confirmation UI

---

## Notes

- Email sending can be stubbed/simulated initially
- Consider using a queue for email delivery in production
- Mobile validation must handle Bangladesh country code (+880)
- The frontend should show password strength feedback
- Terms acceptance may be needed - coordinate with Story 1.3

**Status**: ready-for-dev
**Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created