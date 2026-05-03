# Story 2.4: See reviews and related products

**Status**: ready-for-dev
**Story ID**: 2.4
**Story Key**: 2-4-see-reviews-and-related-products
**Epic**: Epic 2 - Browse, Search, and Product Confidence
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a shopper,**
**I want to see reviews and related products,**
**so that I can trust the purchase and compare alternatives.**

### Business Context

This story adds social proof and product discovery to the product detail page (Story 2.3). Customers need to see authentic reviews from other buyers before committing to purchase. The rating distribution helps quickly assess product quality, and related products provide alternatives for comparison or cross-selling.

This story implements:
- **Verified reviews**: Only customers who purchased can leave reviews (prevents fake reviews)
- **Rating distribution**: Visual histogram showing breakdown by star rating
- **Related products**: Same brand, similar products, frequently bought together

Key business value: Social proof directly impacts conversion rate. Products with reviews convert higher, and related products drive cross-sell.

### Acceptance Criteria

#### AC1: Review Display

**Given** a product has reviews
**When** I view the review section
**Then** verified reviews and rating distribution are shown
**And** the most recent reviews appear first

#### AC2: Related Products

**Given** I reach the related products section
**When** suggestions load
**Then** I see related, similar, and frequently bought together items

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR35 | Product detail pages must show related products, frequently bought together items, and similar items |
| FR36 | Customer reviews must display verification status and rating distribution |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR1 | Homepage load must be under 3 seconds on 3G connections |
| NFR4 | Add-to-cart must complete within 1 second |
| NFR14 | Customer satisfaction should target 85% or higher |

---

## Technical Requirements

### Database Schema (Prisma)

```prisma
model Review {
  id            String   @id @default(uuid())
  productId     String   @map("product_id")
  userId        String   @map("user_id")
  rating        Int      // 1-5 stars
  title         String?
  content       String   @db.Text
  isVerified    Boolean  @default(false) @map("is_verified")
  isApproved    Boolean  @default(true) @map("is_approved")
  helpfulCount  Int      @default(0) @map("helpful_count")
  
  product       Product  @relation(fields: [productId], references: [id])
  user          User     @relation(fields: [userId], references: [id])
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("reviews")
}

model OrderItem {
  id          String   @id @default(uuid())
  orderId     String   @map("order_id")
  productId   String   @map("product_id")
  variantId   String?  @map("variant_id")
  quantity   Int
  price       Decimal
  
  order       Order    @relation(fields: [orderId], references: [id])
  product     Product  @relation(fields: [productId], references: [id])
  variant     Variant? @relation(fields: [variantId], references: [id])

  @@map("order_items")
}
```

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/products/:slug/reviews` | GET | Get product reviews with pagination |
| `/api/v1/products/:slug/reviews` | POST | Create a review (authenticated) |
| `/api/v1/products/:slug/reviews/:id/helpful` | POST | Mark review as helpful |
| `/api/v1/products/:slug/rating-distribution` | GET | Get rating distribution histogram |
| `/api/v1/products/:slug/related` | GET | Get related products (from Story 2.3) |

#### GET /api/v1/products/:slug/reviews

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10) |
| sort | string | Sort by: "newest", "oldest", "highest", "lowest", "helpful" |
| rating | number | Filter by rating (1-5) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "rev_123",
        "user": { "id": "user_1", "name": "Ahmed K.", "avatar": "https://..." },
        "rating": 5,
        "title": "Amazing fragrance!",
        "content": "This is my favorite scent. Long-lasting and perfect for办公室.",
        "isVerified": true,
        "helpfulCount": 24,
        "createdAt": "2026-04-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 128,
      "totalPages": 13
    }
  }
}
```

#### GET /api/v1/products/:slug/rating-distribution

**Response (200):**
```json
{
  "success": true,
  "data": {
    "averageRating": 4.5,
    "totalReviews": 128,
    "verifiedReviews": 95,
    "distribution": [
      { "rating": 5, "count": 78, "percentage": 61 },
      { "rating": 4, "count": 28, "percentage": 22 },
      { "rating": 3, "count": 15, "percentage": 12 },
      { "rating": 2, "count": 5, "percentage": 4 },
      { "rating": 1, "count": 2, "percentage": 1 }
    ]
  }
}
```

#### POST /api/v1/products/:slug/reviews

**Body:**
```json
{
  "rating": 5,
  "title": "Amazing fragrance!",
  "content": "This is my favorite scent. Long-lasting..."
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "rev_124",
    "message": "Review submitted successfully"
  }
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| slug | Must exist in database | PRODUCT_NOT_FOUND |
| rating | Must be 1-5 | INVALID_RATING |
| content | Must be 10-1000 characters | REVIEW_CONTENT_INVALID |
| title | Must be 0-200 characters | REVIEW_TITLE_INVALID |
| page | Must be >= 1 | INVALID_PAGE |
| limit | Must be 1-50 | INVALID_LIMIT |

### Verified Purchase Logic

A review is marked as verified when:
1. The user has purchased the product
2. The order is delivered or completed
3. The review is submitted within 30 days of delivery

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names
4. **API Versioning**: All endpoints under `/api/v1/`
5. **Authentication**: JWT required for POST, optional for GET
6. **Rate Limiting**: 5 reviews per user per product

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── products/
│       │   │   ├── components/
│       │   │   │   ├── review-card.tsx
│       │   │   │   ├── review-form.tsx
│       │   │   │   ├── rating-distribution.tsx
│       │   │   │   ├── review-list.tsx
│       │   │   │   └── review-summary.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── use-reviews.ts
│       │   │   │   ├── use-submit-review.ts
│       │   │   │   └── use-rating-distribution.ts
│       │   │   └── types/
│       │   │       └── index.ts
│       │   └── products/ (reducers already have related products from 2.3)
│       └── pages/
│           └── products/
│               └── [slug].tsx
│
├── server/
│   └── src/
│       ├── controllers/
│       │   └── review-controller.ts
│       ├── services/
│       │   ├── review-service.ts
│       │   └── product-service.ts (extend with related products)
│       ├── repositories/
│       │   └── review-repository.ts
│       └── routes/
│           └── review-routes.ts
│
└── shared/
    └── src/
        └── types/
            └── review.ts
```

### State Management

- **TanStack Query**: Fetch reviews, rating distribution, submit review
- **Zustand**: Manage review form state
- **Optimistic Updates**: Update helpful count immediately

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react-hook-form | ^7.x | Review form management |
| @hookform/resolvers | ^3.x | Zod integration for form |
| zod | ^3.x | Form validation |
| @tanstack/react-query | ^5.x | Server state management |

---

## Previous Story Intelligence

### From Story 2.3 (View detailed product pages)

**Key Learnings:**

1. **Route Structure**: Product pages use `/products/:slug` routing
2. **Product Data**: Already includes `reviewCount`, `verifiedReviews`, `rating` fields
3. **Related Products API**: Already implemented in Story 2.3 — reuse same endpoint
4. **Image Gallery**: Reuse the same carousel/grid for product discovery
5. **Loading States**: Use skeleton loaders for reviews

**Files Created in Story 2.3:**
- `packages/server/src/services/product-service.ts` (has related products logic)
- `packages/web/src/features/products/components/related-products.tsx`
- `packages/web/src/features/products/hooks/use-related-products.ts`

**Reuse these for Story 2.4:**
- Related products section already displays — integrate with rating context
- Product card component for cross-selling
- Loading skeleton from Story 2.3

### From Story 2.2 (Search by keyword with autocomplete)

**Key Learnings:**

1. **TanStack Query Hooks**: Continue the same hook pattern for reviews
2. **API Response Format**: Same wrapper pattern established
3. **Error Handling**: Continue using error boundary pattern

### From Story 2.1 (Browse categories with filters and sorting)

**Key Learnings:**

1. **Product Card**: Already handles displaying related products
2. **Grid Layout**: Reuse for frequently bought together

---

## Git Intelligence Summary

From Epic 1 and Epic 2 (Stories 2.1, 2.2, 2.3), the codebase has:

- Monorepo structure with pnpm workspaces (Story 1.1)
- User authentication with JWT and Redis sessions (Epic 1)
- Product, Category, Brand, Variant models in Prisma (Story 2.1, 2.3)
- Search functionality with autocomplete (Story 2.2)
- Product detail page with variants, images, specifications (Story 2.3)
- Related products already implemented (Story 2.3)
- API response wrapper pattern consistently used
- Zod validation for input validation
- TanStack Query for data fetching
- Zustand for client state

For this story, we need to:

- Add Review model to Prisma schema
- Add OrderItem model link for verified purchase
- Create review API endpoints
- Create rating distribution endpoint
- Extend product controller with review routes
- Create review list component
- Create review form component
- Create rating distribution visualization
- Integrate verified badge logic

---

## Latest Tech Information

### Review Component Patterns (2026)

**Rating Distribution Display:**

```tsx
const RatingDistribution = ({ distribution, averageRating, totalReviews }) => {
  return (
    <div className="rating-distribution">
      <div className="average-rating">
        <span className="score">{averageRating}</span>
        <StarRating value={averageRating} />
        <span className="count">({totalReviews} reviews)</span>
      </div>
      <div className="distribution-bars">
        {distribution.map((item) => (
          <div key={item.rating} className="bar-row">
            <span className="stars">{item.rating} stars</span>
            <div className="bar-container">
              <div 
                className="bar-fill" 
                style={{ width: `${item.percentage}%` }} 
              />
            </div>
            <span className="count">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Verified Badge:**

```tsx
const VerifiedBadge = () => (
  <span className="verified-badge">
    <CheckIcon />
    Verified Purchase
  </span>
);
```

**Review Form Validation:**

```tsx
const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().max(200).optional(),
  content: z.string().min(10).max(1000),
});

const { handleSubmit, register, formState: { errors } } = useForm({
  resolver: zodResolver(reviewSchema),
});
```

### Review UX Best Practices

1. **Show verified badge** prominently for verified purchases
2. **Display helpful count** with upvote button
3. **Sort by**: Newest (default), Most Helpful, Highest, Lowest
4. **Filter by rating** with clickable star buttons
5. **Pagination**: Load 10 reviews at a time with "Load More"
6. **Empty state**: Show "No reviews yet" with invitation to be first
7. **Pending review**: Show "Awaiting approval" for submitted reviews

---

## Implementation Checklist

### Backend Tasks

- [ ] Add Review model to Prisma schema
- [ ] Update OrderItem relation to Review for verification
- [ ] Create database migration
- [ ] Create review-repository with queries
- [ ] Create review-service with business logic
- [ ] Create GET /api/v1/products/:slug/reviews endpoint
- [ ] Create POST /api/v1/products/:slug/reviews endpoint
- [ ] Create POST /api/v1/products/:slug/reviews/:id/helpful endpoint
- [ ] Create GET /api/v1/products/:slug/rating-distribution endpoint
- [ ] Implement verified purchase check logic
- [ ] Add rate limiting: 5 reviews per user per product
- [ ] Test pagination and sorting

### Frontend Tasks

- [ ] Create review-list.tsx component
- [ ] Create review-card.tsx component
- [ ] Create review-form.tsx component
- [ ] Create rating-distribution.tsx component
- [ ] Create use-reviews.ts TanStack Query hook
- [ ] Create use-submit-review.ts mutation hook
- [ ] Create use-rating-distribution.ts hook
- [ ] Integrate reviews section into product detail page
- [ ] Add "Write a Review" button (for authenticated users)
- [ ] Add "Helpful" button with count
- [ ] Implement pagination
- [ ] Add loading skeleton for reviews

### UX/UI Tasks

- [ ] Show rating distribution histogram
- [ ] Display average rating prominently
- [ ] Show verified purchase badge
- [ ] Display "Helpful" count per review
- [ ] Sort review dropdown
- [ ] Filter by rating buttons
- [ ] Review form shows star selection
- [ ] Success message after review submission
- [ ] Error messages for validation failures
- [ ] Related products already integrated from 2.3

---

## Success Criteria

The review and related products section is complete when:

1. **Rating**: Shows average rating with star visualization
2. **Distribution**: Shows histogram breakdown by star
3. **Reviews**: Lists reviews with pagination (newest first)
4. **Verified**: Shows "Verified Purchase" badge for eligible reviews
5. **Helpful**: Users can mark reviews as helpful
6. **Form**: Authenticated users can submit reviews
7. **Validation**: Form validates rating (1-5) and content (10-1000 chars)
8. **Empty State**: Shows message when no reviews exist
9. **Related**: Related products section displays from Story 2.3
10. **Performance**: Page loads within 2 seconds

---

## Integration Points

### With Story 2.3 (Product Detail Pages)

- Reviews section added to product detail page
- Rating data already in product response (extend)
- Related products endpoint already exists — simply display
- Product page shows "X reviews" link to scroll to reviews section
- Clicking rating stars filters reviews

### With Story 2.1 (Category Browse)

- Frequently bought together can link back to browse
- Product discovery maintains consistency

### With Epic 1 (Auth)

- Review submission requires authentication
- User profile shows their reviews
- Verified badge checks user orders

### With Epic 3 (Cart)

- Frequently bought together items add to cart
- Order history links to review eligibility

### With Epic 5 (Orders)

- Orders provide verification data for reviews
- Verified check queries delivered orders

---

## Edge Cases to Handle

1. **No Reviews**: Show empty state with invitation
2. **Unverified Purchase**: Show review without verified badge
3. **Already Reviewed**: Show "You already reviewed this" message
4. **Review Pending Approval**: Show "Awaiting approval" status
5. **Helpful Already Voted**: Disable button, show "Thanks!"
6. **Self Review**: Prevent reviewing own products
7. **Spam / Inappropriate**: Hide from public, mark for admin review
8. **Slow Load**: Show skeleton, don't block page
9. **Pagination End**: Hide "Load More" button
10. **All Products Out of Stock**: Hide related products gracefully
11. **Rating Zero**: Don't show distribution for 0 reviews

---

## Notes

- Consider "Report review" for inappropriate content
- Consider "Admin approve/reject" for review moderation
- Consider "Photo upload" with reviews
- Consider "Response from seller" feature
- Track review helpfulness for sorting算法
- Consider "Most helpful" default sort option
- Add analytics for review views and submissions

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created