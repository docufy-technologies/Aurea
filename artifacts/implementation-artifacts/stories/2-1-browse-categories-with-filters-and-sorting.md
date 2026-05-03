# Story 2.1: Browse categories with filters and sorting

**Status**: ready-for-dev
**Story ID**: 2.1
**Story Key**: 2-1-browse-categories-with-filters-and-sorting
**Epic**: Epic 2 - Browse, Search, and Product Confidence
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a shopper,**
**I want to browse catalog pages with filters and sorting,**
**So that I can narrow down products quickly.**

### Business Context

This story implements the product catalog browsing experience. Customers discover products through category pages with appropriate filtering and sorting options. The UI displays product cards with essential information (image, name, price, rating). Filter changes and sorting updates happen without full page reloads for smooth UX.

This is the foundational story for Epic 2 (Browse, Search, and Product Confidence), enabling product discovery before search (Story 2.2), product details (Story 2.3), and reviews (Story 2.4).

### Acceptance Criteria

#### AC1: Category Page Product Display

**Given** I open a category page
**When** products load
**Then** I see 20 products per page with image, name, price, and rating summary
**And** loading and empty states are shown appropriately

#### AC2: Filter and Sort Updates

**Given** I change a filter or sort option
**When** the catalog updates
**Then** the listing refreshes without a full page reload

#### AC3: Pagination Controls

**Given** I am on a category page with more than 20 products
**When** I navigate to subsequent pages
**Then** URL reflects the current page for shareability
**And** pagination controls allow easy navigation

#### AC4: Filter Persistence

**Given** I apply filters and navigate to a product page
**When** I return to the category
**Then** my filter selections are preserved

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR21 | Category pages must display paginated product listings with 20 products per page |
| FR22 | Product cards must display thumbnail image, name, price, and rating summary |
| FR23 | Catalog sorting must support price low-to-high, high-to-low, newest, and best-selling |
| FR24 | Catalog filtering must support category, brand, price range, rating, and availability |

---

## Technical Requirements

### Database Schema (Prisma)

The Product model needs these fields (to be created or verified):

```prisma
model Product {
  id            String    @id @default(uuid())
  name          String
  slug          String    @unique
  description   String?
  price         Decimal
  originalPrice Decimal?  @map("original_price")
  images        String[]
  categoryId    String    @map("category_id")
  category      Category  @relation(fields: [categoryId], references: [id])
  brandId       String?   @map("brand_id")
  brand         Brand?    @relation(fields: [brandId], references: [id])
  rating        Float?    // Average rating
  reviewCount   Int       @default(0) @map("review_count")
  isAvailable   Boolean   @default(true) @map("is_available")
  stockQty      Int       @default(0) @map("stock_qty")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  variants     Variant[]
  cartItems    CartItem[]
  orderItems   OrderItem[]

  @@map("products")
}

model Category {
  id          String    @id @default(uuid())
  name        String
  slug        String    @unique
  description String?
  parentId    String?   @map("parent_id")
  parent      Category? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryHierarchy")
  products    Product[]
  createdAt   DateTime  @default(now()) @map("created_at")

  @@map("categories")
}

model Brand {
  id        String    @id @default(uuid())
  name      String    @unique
  slug      String    @unique
  logo      String?
  products  Product[]

  @@map("brands")
}

model Variant {
  id            String    @id @default(uuid())
  productId     String    @map("product_id")
  product       Product   @relation(fields: [productId], references: [id])
  name          String
  sku           String    @unique
  price         Decimal
  originalPrice Decimal?  @map("original_price")
  stockQty      Int       @default(0) @map("stock_qly")
  isAvailable   Boolean   @default(true) @map("is_available")
  attributes    Json      // Size, color, etc.

  @@map("variants")
}
```

### Sort Options

| Sort Value | Display Text | Database Order |
|------------|---------------|----------------|
| `price_asc` | Price: Low to High | `price ASC` |
| `price_desc` | Price: High to Low | `price DESC` |
| `newest` | Newest First | `created_at DESC` |
| `best_selling` | Best Selling | `sold_count DESC` |
| `rating` | Highest Rated | `rating DESC` |

### Filter Options

| Filter | Type | Values Source |
|--------|------|----------------|
| Category | Single Select | Categories table |
| Brand | Multi Select | Brands table |
| Price Range | Range | Hardcoded: 0-500, 500-1000, 1000-2000, 2000-5000, 5000+ |
| Rating | Single Select | 4+, 3+, 2+, 1+ |
| Availability | Single Select | In Stock, Pre-order |

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/products` | GET | List products with filters and pagination |
| `/api/v1/categories` | GET | List all categories |
| `/api/v1/categories/:slug` | GET | Get single category with children |
| `/api/v1/brands` | GET | List all brands |
| `/api/v1/products/:id` | GET | Get single product |

### Query Parameters

For `/api/v1/products`:

| Parameter | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `category` | string | No | Category slug |
| `brand` | string | No | Brand slug(s), comma-separated |
| `min_price` | number | No | Minimum price |
| `max_price` | number | No | Maximum price |
| `rating` | number | No | Minimum rating (1-4) |
| `availability` | string | No | `in_stock`, `pre_order` |
| `sort` | string | No | See sort options |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 20 | Items per page |

### Request/Response Formats

#### GET /api/v1/products

**Request:**
```
GET /api/v1/products?category=fragrances&brand=gucci&min_price=1000&max_price=5000&rating=3&sort=price_asc&page=1&limit=20
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "prod_123",
        "name": "Gucci Guilty",
        "slug": "gucci-guilty",
        "description": "A romantic floral fragrance",
        "price": 2500,
        "originalPrice": 3000,
        "images": [
          "https://cdn.aurea.com/products/gucci-guilty-1.jpg",
          "https://cdn.aurea.com/products/gucci-guilty-2.jpg"
        ],
        "category": {
          "id": "cat_1",
          "name": "Women's Fragrances",
          "slug": "womens-fragrances"
        },
        "brand": {
          "id": "brand_1",
          "name": "Gucci",
          "slug": "gucci"
        },
        "rating": 4.5,
        "reviewCount": 128,
        "isAvailable": true,
        "stockQty": 50
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    },
    "filters": {
      "availableBrands": [
        { "slug": "gucci", "name": "Gucci" },
        { "slug": "dior", "name": "Dior" }
      ],
      "priceRanges": [
        { "min": 0, "max": 500, "label": "Under 500" },
        { "min": 500, "max": 1000, "label": "500 - 1000" }
      ]
    }
  }
}
```

**Error Response (400) - Invalid Parameters:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUERY_PARAMETER",
    "message": "Invalid sort value: 'invalid'",
    "details": {
      "field": "sort",
      "allowedValues": ["price_asc", "price_desc", "newest", "best_selling", "rating"]
    }
  }
}
```

#### GET /api/v1/categories

**Response (200):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat_1",
        "name": "Fragrances",
        "slug": "fragrances",
        "children": [
          { "id": "cat_2", "name": "Women's Fragrances", "slug": "womens-fragrances" },
          { "id": "cat_3", "name": "Men's Fragrances", "slug": "mens-fragrances" }
        ]
      },
      {
        "id": "cat_4",
        "name": "Cosmetics",
        "slug": "cosmetics",
        "children": []
      },
      {
        "id": "cat_5",
        "name": "Watches",
        "slug": "watches",
        "children": [
          { "id": "cat_6", "name": "Luxury Watches", "slug": "luxury-watches" },
          { "id": "cat_7", "name": "Fashion Watches", "slug": "fashion-watches" }
        ]
      }
    ]
  }
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| category | Must be valid category slug | CATEGORY_NOT_FOUND |
| brand | Must be valid brand slug | BRAND_NOT_FOUND |
| min_price | Must be >= 0 | INVALID_PRICE_RANGE |
| max_price | Must be >= min_price | INVALID_PRICE_RANGE |
| rating | Must be 1-4 | INVALID_RATING |
| sort | Must be valid sort value | INVALID_SORT_OPTION |
| page | Must be >= 1 | INVALID_PAGE |
| limit | Must be 1-100 | INVALID_LIMIT |

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (`products`, `categories`, `brands`)
4. **API Versioning**: All endpoints under `/api/v1/`
5. **URL Slugs**: kebab-case for category and brand slugs
6. **Pagination**: 20 items per page default, max 100
7. **Caching**: Product catalog with 5-minute TTL

### File Structure

Following the architecture document, create/modify these files:

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   └── products/
│       │       ├── components/
│       │       │   ├── product-card.tsx
│       │       │   ├── product-grid.tsx
│       │       │   ├── category-nav.tsx
│       │       │   ├── filter-sidebar.tsx
│       │       │   ├── sort-dropdown.tsx
│       │       │   ├── pagination-controls.tsx
│       │       │   └── empty-state.tsx
│       │       ├── hooks/
│       │       │   ├── use-products.ts
│       │       │   └── use-categories.ts
│       │       └── types/
│       │           └── index.ts
│       ├── pages/
│       │   └── products/
│       │       └── category.tsx
│       └── stores/
│           └── filter-store.ts (Zustand for filter state)
│
├── server/
│   └── src/
│       ├── controllers/
│       │   └── product-controller.ts
│       ├── services/
│       │   └── product-service.ts
│       ├── repositories/
│       │   └── product-repository.ts
│       ├── routes/
│       │   ├── product-routes.ts
│       │   └── category-routes.ts
│       └── types/
│           └── index.ts
│
└── shared/
    └── src/
        └── types/
            ├── product.ts
            └── category.ts
```

### State Management

- **TanStack Query**: Fetch products from API (`useQuery`, `useInfiniteQuery`)
- **Zustand**: Store filter state (selectedCategory, selectedBrands, priceRange, sort, page)
- **URL Sync**: Filters and pagination reflected in URL query params

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react-router-dom | ^7.x | Routing and URL params |
| @tanstack/react-query | ^5.x | Server state management |
| zustand | ^4.x | Client filter state |
| @tanstack/react-query-devtools | ^5.x | Query debugging |

---

## Implementation Note on Epic 1 Patterns

This story (2.1) is the first in Epic 2. It follows after Epic 1 is complete. Key patterns established in Epic 1 to continue:

1. **API Response Wrapper**: Same format from Story 1.2+
2. **Error Handling**: Same error code/message structure
3. **Zod Validation**: Same validation patterns
4. **File Organization**: Feature-based structure (products/)
5. **Testing**: Co-located tests with source files

---

## Git Intelligence Summary

From Epic 1 implementation, the codebase has:

- Monorepo structure with pnpm workspaces
- User authentication with JWT and Redis sessions
- Product model (to be extended with categories, brands)
- API response wrapper pattern consistently used
- Zod validation for input validation

For this story, we need to:
- Create Category and Brand models in Prisma
- Extend Product model with category/brand relations
- Build product listing API with filtering/sorting
- Create frontend product grid with filters

---

## Latest Tech Information

### React 19 + TanStack Query Patterns (2026)

1. **useQuery for Products**:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['products', { category, brand, sort, page }],
  queryFn: () => fetchProducts({ category, brand, sort, page }),
});
```

2. **Infinite Query for Lazy Loading** (optional enhancement):
```typescript
const { data, hasNextPage, fetchNextPage } = useInfiniteQuery({
  queryKey: ['products', filters],
  queryFn: fetchProducts,
  getNextPageParam: (lastPage) => lastPage.pagination.nextPage,
});
```

3. **Filter State with Zustand**:
```typescript
const useFilterStore = create<FilterState>((set) => ({
  category: null,
  brands: [],
  priceRange: null,
  sort: 'newest',
  setCategory: (category) => set({ category }),
  // ... other setters
}));
```

4. **URL Sync with React Router**:
```typescript
// In category page component
const [searchParams, setSearchParams] = useSearchParams();

// Sync filters to URL
useEffect(() => {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (brands.length) params.set('brand', brands.join(','));
  // ...
  setSearchParams(params);
}, [filters]);
```

### Performance Requirements

| NFR | Requirement |
|-----|-------------|
| NFR1 | Homepage load must be under 3 seconds on 3G |
| NFR2 | Search autocomplete must return within 300ms |

For category pages:
- Initial load: < 2 seconds
- Filter change: < 500ms (optimistic UI)
- Pagination: Instant with client-side navigation

---

## Implementation Checklist

### Backend Tasks

- [ ] Add Category model to Prisma schema
- [ ] Add Brand model to Prisma schema
- [ ] Add relations to Product model (category, brand)
- [ ] Run Prisma migration
- [ ] Create product-repository with filtering/sorting
- [ ] Create product-service with business logic
- [ ] Create GET /api/v1/products endpoint
- [ ] Create GET /api/v1/categories endpoint
- [ ] Create GET /api/v1/brands endpoint
- [ ] Add Zod validation for query params
- [ ] Add caching headers for product listings
- [ ] Test API with various filter combinations

### Frontend Tasks

- [ ] Create product-card component
- [ ] Create product-grid component
- [ ] Create category-nav component (category sidebar)
- [ ] Create filter-sidebar component (brand checkboxes, price range, rating)
- [ ] Create sort-dropdown component
- [ ] Create pagination-controls component
- [ ] Create empty-state component
- [ ] Create use-products TanStack Query hook
- [ ] Create use-categories hook
- [ ] Create filter store (Zustand)
- [ ] Create category page route
- [ ] Implement URL sync for filters
- [ ] Add loading skeleton states
- [ ] Test filter/sort UI interactions

### UX/UI Tasks

- [ ] Product card shows image, name, price, rating
- [ ] Price shows original price if discounted
- [ ] "Out of stock" label for unavailable items
- [ ] Empty state for no matching products
- [ ] Loading skeletons during fetch
- [ ] Responsive grid (2-4 columns based on viewport)

---

## Success Criteria

The category browsing feature is complete when:

1. **Product Grid**: 20 products per page with image, name, price, rating
2. **Filters**: Category, brand, price range, rating, availability filters work
3. **Sorting**: All 5 sort options work correctly
4. **Pagination**: Page navigation works with URL reflection
5. **No Full Reload**: Filter/sort changes update without page reload
6. **Empty State**: "No products found" message when filters return nothing
7. **Loading State**: Skeleton loading during fetch
8. **API Response**: Follows wrapper format exactly
9. **URL Sync**: Filters reflected in URL for shareability
10. **Responsive**: Works on mobile and desktop

---

## Integration Points

### With Story 2.2 (Search)

Category browsing provides foundation:
- Product card component reused in search results
- Filter logic shared between category and search pages
- Product data shape consistent

### With Story 2.3 (Product Detail)

Product detail page accessed from cards:
- Click card to navigate to product detail
- Share same product data types
- Back navigation preserves filters

### With Story 2.4 (Reviews)

Rating displayed on cards:
- Rating and review count from product data
- Cached for performance

### With Epic 3 (Cart)

Products add to cart:
- Product must have variant for add-to-cart
- Stock status shown on cards (Story 3.5 for real-time sync)

---

## Edge Cases to Handle

1. **No Products in Category**: Show empty state with browsing suggestions
2. **Invalid Category Slug**: Return 404 with category list suggestions
3. **All Filters Combine to Empty**: Show "No results" with suggestion to clear filters
4. **Price Range Invalid**: Validate min <= max, show error
5. **Pagination Beyond Range**: Return last page with products
6. **Brand Deleted but Products Exist**: Show products without brand filter option
7. **Category Has No Products**: Show empty state, don't show in nav
8. **Slow Network**: Show loading skeleton, don't block UI
9. **API Error**: Show error state with retry button
10. **Concurrent Filter Changes**: Debounce or cancel previous requests

---

## Notes

- Consider "Clear all filters" quick action
- Remember last selected sort per category
- Consider "Recently viewed" products section
- Brand logos in filter sidebar (optional enhancement)
- Mobile: Filters in drawer/modal, not sidebar
- Consider "Load more" button as pagination alternative

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created