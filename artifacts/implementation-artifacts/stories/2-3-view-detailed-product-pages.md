# Story 2.3: View detailed product pages

**Status**: ready-for-dev
**Story ID**: 2.3
**Story Key**: 2-3-view-detailed-product-pages
**Epic**: Epic 2 - Browse, Search, and Product Confidence
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a shopper,**
**I want to inspect product details, images, and variants,**
**so that I can make a confident purchase decision.**

### Business Context

This story implements the product detail page — the core conversion page where customers evaluate products before adding them to cart. It builds on Story 2.1 (category browsing) and Story 2.2 (search) where customers navigate to product pages from listings. The product detail page must display rich product information including high-resolution images with zoom, complete specifications, pricing with previous price comparisons, variant selection with dynamic price and availability updates, and stock status with estimated dispatch times.

Key business value: Product pages directly impact conversion rate. Customers need complete information to trust their purchase decision. This page also links to Story 2.4 (reviews and related products) for social proof and discovery.

### Acceptance Criteria

#### AC1: Product Page Core Display

**Given** I open a product page
**When** the page loads
**Then** I can see high-resolution images, zoom capability, specifications, and current pricing
**And** previous pricing is shown when applicable

#### AC2: Variant Selection with Dynamic Updates

**Given** I change a product variant (size, color, etc.)
**When** the selection changes
**Then** price and availability update immediately
**And** stock status shows the estimated dispatch time

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR30 | Product detail pages must display high-resolution images with zoom capability |
| FR31 | Product detail pages must show complete specifications, ingredients, and dimensions |
| FR32 | Product detail pages must display current price and previous price where applicable |
| FR33 | Stock status must show real-time availability and estimated dispatch time |
| FR34 | Variant selection must update price and availability dynamically |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR1 | Homepage load must be under 3 seconds on 3G connections |
| NFR4 | Add-to-cart must complete within 1 second |
| NFR14 | Customer satisfaction should target 85% or higher |

---

## Technical Requirements

### Database Schema (Prisma)

The Product model from Story 2.1 and Story 2.2 supports product details. Additional details for this story:

```prisma
// Product model already includes core fields from Story 2.1
// Add variant-specific fields here

model Variant {
  id            String   @id @default(uuid())
  productId     String   @map("product_id")
  sku           String   @unique
  name          String   // e.g., "50ml", "100ml", "Red", "Black"
  price         Decimal
  originalPrice Decimal? @map("original_price")
  stockQuantity Int     @default(0) @map("stock_quantity")
  lowStockThreshold Int  @default(5) @map("low_stock_threshold")
  isAvailable   Boolean  @default(true) @map("is_available")
  dispatchTime  String?  @map("dispatch_time") // e.g., "Same day", "2-3 days"
  
  product       Product  @relation(fields: [productId], references: [id])
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("product_variants")
}

model ProductImage {
  id          String   @id @default(uuid())
  productId  String   @map("product_id")
  url        String
  altText    String?  @map("alt_text")
  isPrimary  Boolean  @default(false) @map("is_primary")
  displayOrder Int    @default(0) @map("display_order")
  
  product    Product  @relation(fields: [productId], references: [id])
  
  @@map("product_images")
}

model ProductSpecification {
  id          String   @id @default(uuid())
  productId   String   @map("product_id")
  label       String   // e.g., "Brand", "Volume", "Ingredients"
  value       String   // e.g., "Gucci", "50ml", "Alcohol, Parfum, ..."
  category   String?  // e.g., "General", "Dimensions", "Content"
  displayOrder Int    @default(0) @map("display_order")
  
  product    Product  @relation(fields: [productId], references: [id])
  
  @@map("product_specifications")
}
```

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/products/:slug` | GET | Get product details with variants |
| `/api/v1/products/:slug/images` | GET | Get product image gallery |
| `/api/v1/products/:slug/specifications` | GET | Get product specifications |
| `/api/v1/products/:slug/variants` | GET | Get product variants |
| `/api/v1/products/:slug/related` | GET | Get related products |

#### GET /api/v1/products/:slug

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "prod_123",
    "name": "Gucci Guilty",
    "slug": "gucci-guilty",
    "description": "A romantic floral fragrance for her...",
    "shortDescription": "Elegant floral fragrance",
    "brand": { "id": "brand_1", "name": "Gucci", "slug": "gucci" },
    "category": { "id": "cat_1", "name": "Women's Fragrances", "slug": "womens-fragrances" },
    "images": [
      { "url": "https://cdn.aurea.com/products/gucci-guilty-1.jpg", "altText": "Gucci Guilty Bottle", "isPrimary": true },
      { "url": "https://cdn.aurea.com/products/gucci-guilty-2.jpg", "altText": "Gucci Guilty Spray", "isPrimary": false }
    ],
    "currentPrice": 2500,
    "originalPrice": 3000,
    "discount": { "percentage": 17, "text": "17% off" },
    "rating": 4.5,
    "reviewCount": 128,
    "verifiedReviews": 95,
    "specifications": [
      { "label": "Brand", "value": "Gucci" },
      { "label": "Volume", "value": "50ml" },
      { "label": "Type", "value": "Eau de Parfum" }
    ],
    "variants": [
      { "id": "var_1", "name": "30ml", "price": 1800, "stockQuantity": 15, "isAvailable": true, "dispatchTime": "Same day" },
      { "id": "var_2", "name": "50ml", "price": 2500, "stockQuantity": 3, "isAvailable": true, "dispatchTime": "2-3 days" },
      { "id": "var_3", "name": "100ml", "price": 3800, "stockQuantity": 0, "isAvailable": false, "dispatchTime": "Pre-order available" }
    ],
    "selectedVariant": { "id": "var_2", "name": "50ml" },
    "stockStatus": { "isAvailable": true, "stockQuantity": 3, "lowStockWarning": true, "dispatchTime": "2-3 days" },
    "features": ["Long-lasting", "Suitable for evening", "Floral scent"],
    ".createdAt": "2026-01-15T00:00:00Z"
  },
  "metadata": { "generated": "2026-05-03T10:00:00Z" }
}
```

#### GET /api/v1/products/:slug/related

**Response (200):**
```json
{
  "success": true,
  "data": {
    "related": [
      { "id": "prod_124", "name": "Gucci Bloom", "slug": "gucci-bloom", "price": 2200, "rating": 4.6 }
    ],
    "similar": [
      { "id": "prod_201", "name": "Dior J'adore", "slug": "dior-jadore", "price": 3500 }
    ],
    "frequentlyBoughtTogether": [
      { "id": "prod_301", "name": "Gucci deodorant", "slug": "gucci-deodorant", "price": 800 }
    ]
  }
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| slug | Must exist in database | PRODUCT_NOT_FOUND |
| variantId | Must belong to product | INVALID_VARIANT |
| page | Must be >= 1 | INVALID_PAGE |

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names
4. **API Versioning**: All endpoints under `/api/v1/`
5. **URL Slugs**: kebab-case for product slugs
6. **Image Optimization**: Use responsive images, lazy loading
7. **Performance**: Product page load < 2 seconds

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── products/
│       │   │   ├── components/
│       │   │   │   ├── product-detail.tsx (main page)
│       │   │   │   ├── image-gallery.tsx
│       │   │   │   ├── image-zoom.tsx
│       │   │   │   ├── variant-selector.tsx
│       │   │   │   ├── price-display.tsx
│       │   │   │   ├── stock-status.tsx
│       │   │   │   ├── specifications-table.tsx
│       │   │   │   ├── add-to-cart.tsx
│       │   │   │   └── related-products.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── use-product.ts
│       │   │   │   └── use-related-products.ts
│       │   │   └── types/
│       │   │       └── index.ts
│       │   └── cart/
│       │       └── components/
│       │           └── add-to-cart-button.tsx (reuse)
│       └── pages/
│           └── products/
│               └── [slug].tsx
│
├── server/
│   └── src/
│       ├── controllers/
│       │   └── product-controller.ts (extend with detail methods)
│       ├── services/
│       │   └── product-service.ts (extend with detail methods)
│       ├── repositories/
│       │   └── product-repository.ts (extend with detail queries)
│       └── routes/
│           └── product-routes.ts
│
└── shared/
    └── src/
        └── types/
            └── product.ts
```

### State Management

- **TanStack Query**: Fetch product details, images, variants
- **Zustand**: Store selected variant state
- **URL Params**: Product slug from React Router

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react-router-dom | ^7.x | Routing and slug params |
| @tanstack/react-query | ^5.x | Server state management |
| zustand | ^4.x | Variant selection state |
| react-zoom-pan-pinch | ^3.x | Image zoom functionality |
| framer-motion | ^11.x | Animations for variant changes |

---

## Previous Story Intelligence

### From Story 2.2 (Search by keyword with autocomplete)

**Key Learnings:**

1. **API Response Format**: Wrapper pattern established — continue using `{ success, data, metadata }`
2. **Product Data Shape**: Search results use same product shape as detail page expects
3. **TanStack Query**: Continue using same fetching hooks pattern
4. **Filter Store**: Reuse Zustand pattern for variant selection
5. **Skeleton Loading**: Same loading pattern for product details

**Files Created in Story 2.2:**
- `packages/web/src/features/search/components/search-bar.tsx`
- `packages/web/src/features/search/components/autocomplete-dropdown.tsx`
- `packages/web/src/features/search/hooks/use-search.ts`
- `packages/server/src/services/search-service.ts`

**Reuse these for Story 2.3:**
- Product card component for related products
- Filter/sort logic patterns if needed
- Loading skeleton component

### From Story 2.1 (Browse categories with filters and sorting)

**Key Learnings:**

1. **Product Card**: Already handles displaying product image, name, price — reuse in related products
2. **Product Grid**: Reuse for related products section
3. **Filter Sidebar**: Not needed on detail page, but components available if variant filters needed

**Files Created in Story 2.1:**
- `packages/web/src/features/products/components/product-card.tsx`
- `packages/web/src/features/products/components/product-grid.tsx`
- `packages/web/src/stores/filter-store.ts`

---

## Git Intelligence Summary

From Epic 1 and Epic 2 (Stories 2.1, 2.2), the codebase has:

- Monorepo structure with pnpm workspaces (Story 1.1)
- User authentication with JWT and Redis sessions (Epic 1)
- Product, Category, Brand models in Prisma (Story 2.1)
- Search functionality with autocomplete (Story 2.2)
- API response wrapper pattern consistently used
- Zod validation for input validation
- TanStack Query for data fetching
- Zustand for client state

For this story, we need to:

- Add Variant, ProductImage, ProductSpecification models to Prisma
- Extend product detail API endpoint
- Create image gallery with zoom
- Create variant selector with dynamic pricing
- Create specifications table
- Create related products section
- Implement add-to-cart integration with selected variant

---

## Latest Tech Information

### Image Zoom Implementation (2026)

Popular React image zoom libraries:

1. **react-zoom-pan-pinch** (recommended)
   - Supports pinch-to-zoom on mobile
   - Smooth animations
   - Touch-friendly

```tsx
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

<TransformWrapper
  initialScale={1}
  minScale={1}
  maxScale={3}
>
  <TransformComponent>
    <img src={imageUrl} alt={altText} />
  </TransformComponent>
</TransformWrapper>
```

2. **Simple CSS zoom** (lightweight alternative)
   - Use CSS transform with hover
   - Follow cursor position

### Variant Selector UX Patterns

```tsx
const VariantSelector = ({ variants, selectedVariant, onChange }) => {
  return (
    <div className="variant-grid">
      {variants.map((variant) => (
        <button
          key={variant.id}
          className={cn(
            "variant-option",
            selectedVariant?.id === variant.id && "selected",
            !variant.isAvailable && "disabled"
          )}
          onClick={() => variant.isAvailable && onChange(variant)}
          disabled={!variant.isAvailable}
        >
          <span className="variant-name">{variant.name}</span>
          {variant.isAvailable && (
            <span className="variant-price">৳{variant.price}</span>
          )}
        </button>
      ))}
    </div>
  );
};
```

### Stock Status Display Patterns

| Status | Display | Color |
|--------|---------|-------|
| In Stock (5+) | "In Stock" | Green |
| Low Stock (1-5) | "Only X left" | Orange |
| Out of Stock | "Out of Stock" / "Pre-order available" | Red |
| Pre-order | "Pre-order - Ships in X days" | Blue |

---

## Implementation Checklist

### Backend Tasks

- [ ] Add Variant model to Prisma schema
- [ ] Add ProductImage model to Prisma schema
- [ ] Add ProductSpecification model to Prisma schema
- [ ] Create database migration
- [ ] Extend product-repository with detail queries
- [ ] Extend product-service with detail business logic
- [ ] Create GET /api/v1/products/:slug endpoint
- [ ] Create GET /api/v1/products/:slug/related endpoint
- [ ] Implement variant-based pricing logic
- [ ] Add stock status calculation with dispatch time
- [ ] Test dynamic variant selection returns correct price

### Frontend Tasks

- [ ] Create product-detail.tsx main component
- [ ] Create image-gallery.tsx with zoom capability
- [ ] Create variant-selector.tsx component
- [ ] Create price-display.tsx with discount badge
- [ ] Create stock-status.tsx component
- [ ] Create specifications-table.tsx component
- [ ] Create related-products.tsx component
- [ ] Create use-product.ts TanStack Query hook
- [ ] Create use-related-products.ts hook
- [ ] Add product detail route in React Router
- [ ] Implement skeleton loading for images
- [ ] Add loading state for variant changes
- [ ] Add animation for price updates

### UX/UI Tasks

- [ ] Image gallery shows primary image first
- [ ] Zoom available on click/tap
- [ ] Thumbnails navigate gallery images
- [ ] Variants show price and availability
- [ ] Low stock warning appears for < 5 items
- [ ] Out of stock variants show "Pre-order" option if applicable
- [ ] Specifications organized in table format
- [ ] Related products show in carousel or grid
- [ ] Add to cart button integrates with cart feature
- [ ] Mobile: Swipeable image gallery

---

## Success Criteria

The product detail page is complete when:

1. **Images**: High-res images load with zoom capability
2. **Gallery**: Thumbnail navigation works smoothly
3. **Variants**: Selecting variant updates price and stock immediately
4. **Stock**: Shows availability and dispatch time
5. **Pricing**: Current and original prices shown with discount
6. **Specs**: Complete specifications in table format
7. **Related**: Related products section displays
8. **Add to Cart**: Works with selected variant
9. **Performance**: Page loads within 2 seconds
10. **Mobile**: Works on mobile with touch gestures

---

## Integration Points

### With Story 2.1 (Category Browse)

- Product card links to detail page
- Filter logic available if needed
- Consistent product data shape

### With Story 2.2 (Search)

- Product card click navigates to detail
- Search results link to detail page
- Back navigation from detail returns to search

### With Story 2.4 (Reviews and Related Products)

- Reviews accessible from detail page
- Rating distribution shown
- "Verified purchase" badge for verified reviews

### With Epic 3 (Cart)

- Add to cart button links to cart feature
- Selected variant passed to cart item

### With Epic 1 (Auth)

- Reviews require login to post (if authenticated required)
- Verified purchase badge for customers who bought

---

## Edge Cases to Handle

1. **Product Not Found**: Show 404 page with search redirect
2. **No Variants**: Show message, hide variant selector
3. **All Variants Out of Stock**: Show "Notify Me" button
4. **Missing Images**: Show placeholder image
5. **Missing Specifications**: Hide empty spec section
6. **Slow Image Load**: Show skeleton, don't block page
7. **Price Change During View**: Update price with animation
8. **Stock Change During View**: Update stock status
9. **Invalid Variant in URL**: Default to first available
10. **Related Products Empty**: Hide section gracefully

---

## Notes

- Consider "Add to wishlist" feature (future enhancement)
- Consider "Share product" with social sharing
- Consider "Compare products" feature
- Consider "Recently viewed" section
- Track product page views for analytics

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created