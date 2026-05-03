# Story 2.2: Search by keyword with autocomplete

**Status**: ready-for-dev
**Story ID**: 2.2
**Story Key**: 2-2-search-by-keyword-with-autocomplete
**Epic**: Epic 2 - Browse, Search, and Product Confidence
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a shopper,**
**I want to search by product name, brand, or keyword,**
**So that I can find specific items fast.**

### Business Context

This story implements the product search functionality with autocomplete. Customers can quickly find products by typing keywords in the search bar. The autocomplete feature provides instant suggestions after 3 characters, showing relevant products and categories. Search results support filtering and sorting, with fuzzy matching to handle typos and misspellings.

This story builds on Story 2.1 (category browsing) and enables Story 2.3 (product details) and Story 2.4 (reviews) as customers will navigate to product pages from search results.

### Acceptance Criteria

#### AC1: Search Autocomplete

**Given** I type 3 or more characters
**When** autocomplete runs
**Then** suggestions appear within 300ms
**And** they include relevant products or categories

#### AC2: Fuzzy Search Results

**Given** I search with a typo
**When** results return
**Then** fuzzy matching still surfaces relevant products
**And** results load within 2 seconds

#### AC3: Search Results Display

**Given** I submit a search query
**When** results load
**Then** I see matching products with image, name, price, and rating
**And** suggested categories are shown if no products match

#### AC4: Search Filtering and Sorting

**Given** I am on the search results page
**When** I apply filters or change sort
**Then** results update without full page reload
**And** URL reflects current search state for shareability

#### AC5: Search Input UX

**Given** I focus on the search input
**When** I start typing
**Then** recent searches are shown (if any)
**And** clear button appears when text is entered

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR25 | Search must support product name, brand, and keyword queries |
| FR26 | Search autocomplete must appear after 3 characters |
| FR27 | Search results must include matching products and suggested categories |
| FR28 | Search must support filtering and sorting within results |
| FR29 | Search must support fuzzy matching for misspellings |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR2 | Search autocomplete must return within 300ms |
| NFR3 | Search results must return within 2 seconds |

---

## Technical Requirements

### Database Schema (Prisma)

The Product model from Story 2.1 supports search. Additional search-specific considerations:

```prisma
// Search index model for optimized full-text search
model SearchIndex {
  id          String   @id @default(uuid())
  entityType  String   @map("entity_type") // "product" | "category" | "brand"
  entityId    String   @map("entity_id")
  searchText  String   @map("search_text") // Normalized text for matching
  name        String
  slug        String
  image       String?
  price       Decimal?
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([searchText])
  @@map("search_index")
}
```

### Search Algorithm

1. **Autocomplete (3+ chars)**:
   - Query SearchIndex with LIKE prefix match on searchText
   - Order by relevance score (name match > brand match > keyword match)
   - Limit to 8 suggestions (5 products, 3 categories)
   - Cache results for 1 minute

2. **Full Search Results**:
   - Use PostgreSQL full-text search or ILIKE with ranking
   - Support fuzzy matching using pg_trgm extension
   - Combine product name, brand, category, and description search

3. **Fuzzy Matching**:
   - Enable pg_trgm extension for similarity matching
   - Use Levenshtein distance for typo tolerance
   - Fallback to partial match if exact match returns < 3 results

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/search/autocomplete` | GET | Get autocomplete suggestions |
| `/api/v1/search` | GET | Full search with filters/sorting |

### Query Parameters

#### GET /api/v1/search/autocomplete

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | Search query (min 3 chars) |
| `limit` | number | No | 8 | Max suggestions |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "prod_123",
        "name": "Gucci Guilty",
        "slug": "gucci-guilty",
        "image": "https://cdn.aurea.com/products/gucci-guilty-thumb.jpg",
        "price": 2500
      }
    ],
    "categories": [
      {
        "id": "cat_1",
        "name": "Women's Fragrances",
        "slug": "womens-fragrances"
      }
    ]
  }
}
```

#### GET /api/v1/search

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | Search query |
| `brand` | string | No | - | Brand filter |
| `min_price` | number | No | - | Min price |
| `max_price` | number | No | - | Max price |
| `rating` | number | No | - | Min rating |
| `availability` | string | No | - | `in_stock`, `pre_order` |
| `sort` | string | No | `relevance` | `relevance`, `price_asc`, `price_desc`, `newest`, `rating` |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 20 | Items per page |

**Response (200):**
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
        "images": ["https://cdn.aurea.com/products/gucci-guilty-1.jpg"],
        "category": { "id": "cat_1", "name": "Women's Fragrances", "slug": "womens-fragrances" },
        "brand": { "id": "brand_1", "name": "Gucci", "slug": "gucci" },
        "rating": 4.5,
        "reviewCount": 128,
        "isAvailable": true
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 },
    "suggestedCategories": [
      { "slug": "womens-fragrances", "name": "Women's Fragrances", "productCount": 23 }
    ]
  }
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| q (autocomplete) | Min 3 characters | MIN_QUERY_LENGTH |
| q (search) | Min 1 character | MIN_QUERY_LENGTH |
| sort | Must be valid sort value | INVALID_SORT_OPTION |
| page | Must be >= 1 | INVALID_PAGE |
| limit | Must be 1-50 | INVALID_LIMIT |

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names
4. **API Versioning**: All endpoints under `/api/v1/`
5. **URL Slugs**: kebab-case for category and brand slugs
6. **Caching**: Autocomplete with 1-minute TTL, search results with 5-minute TTL
7. **Performance**: Autocomplete < 300ms, full search < 2 seconds

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   └── search/
│       │       ├── components/
│       │       │   ├── search-bar.tsx
│       │       │   ├── autocomplete-dropdown.tsx
│       │       │   ├── search-results.tsx
│       │       │   ├── search-filters.tsx
│       │       │   └── search-empty-state.tsx
│       │       ├── hooks/
│       │       │   ├── use-autocomplete.ts
│       │       │   └── use-search.ts
│       │       └── types/
│       │           └── index.ts
│       ├── pages/
│       │   └── search.tsx
│       └── components/
│           └── layout/
│               └── header.tsx (search input here)
│
├── server/
│   └── src/
│       ├── controllers/
│       │   └── search-controller.ts
│       ├── services/
│       │   └── search-service.ts
│       ├── repositories/
│       │   └── search-repository.ts
│       └── routes/
│           └── search-routes.ts
│
└── shared/
    └── src/
        └── types/
            └── search.ts
```

### State Management

- **TanStack Query**: Fetch autocomplete and search results
- **Zustand**: Store search state (query, filters, sort, page)
- **URL Sync**: Search params reflected in URL for shareability

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react-router-dom | ^7.x | Routing and URL params |
| @tanstack/react-query | ^5.x | Server state management |
| zustand | ^4.x | Client search state |
| debounce | ^4.x | Debounce autocomplete queries |

---

## Previous Story Intelligence

### From Story 2.1 (Browse categories with filters and sorting)

**Key Learnings:**

1. **API Response Format**: Same wrapper pattern established - continue using `{ success, data, metadata }`
2. **Filter Logic**: Reuse filter-store pattern from Story 2.1 for search filters
3. **Product Card**: Reuse product-card component from Story 2.1 in search results
4. **Pagination**: Same pagination pattern applies
5. **Loading States**: Use skeleton loading for search results

**Files Created in Story 2.1:**
- `packages/web/src/features/products/components/product-card.tsx`
- `packages/web/src/features/products/components/product-grid.tsx`
- `packages/web/src/features/products/hooks/use-products.ts`
- `packages/web/src/stores/filter-store.ts`
- `packages/server/src/controllers/product-controller.ts`
- `packages/server/src/services/product-service.ts`

**Reuse these for Story 2.2:**
- Product card component for search results
- Filter sidebar components (adapt for search)
- Pagination controls
- Zustand store pattern for search state

---

## Git Intelligence Summary

From Epic 1 and Epic 2 (Story 2.1), the codebase has:

- Monorepo structure with pnpm workspaces
- User authentication with JWT and Redis sessions
- Product, Category, Brand models in Prisma
- API response wrapper pattern consistently used
- Zod validation for input validation
- TanStack Query for data fetching
- Zustand for client state

For this story, we need to:
- Create SearchIndex model for optimized search
- Build autocomplete endpoint with caching
- Build full search endpoint with fuzzy matching
- Create search bar component with autocomplete dropdown
- Create search results page with filters

---

## Latest Tech Information

### Debounced Autocomplete Pattern (2026)

```typescript
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { debounce } from 'lodash';

const useAutocomplete = (query: string) => {
  const debouncedQuery = useMemo(
    () => debounce((q: string) => q, 300),
    []
  );

  const { data, isLoading } = useQuery({
    queryKey: ['autocomplete', query],
    queryFn: () => fetchAutocomplete(query),
    enabled: query.length >= 3,
    staleTime: 60000, // 1 minute cache
  });

  return { data, isLoading };
};
```

### Search Performance Optimizations

1. **Debounce Input**: 300ms debounce to avoid excessive API calls
2. **Cache Autocomplete**: 1-minute TTL for suggestions
3. **Preload Results**: Fetch full results on Enter key, not on every keystroke
4. **Virtualization**: Consider react-window for large result sets
5. **Optimistic UI**: Show skeleton immediately while fetching

### Fuzzy Search Implementation

PostgreSQL with pg_trgm extension:

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Similarity search
SELECT * FROM products
WHERE similarity(name, 'gucchi') > 0.3
ORDER BY similarity(name, 'gucchi') DESC;
```

---

## Implementation Checklist

### Backend Tasks

- [ ] Add SearchIndex model to Prisma schema
- [ ] Enable pg_trgm extension in migration
- [ ] Create search-repository with autocomplete query
- [ ] Create search-repository with full-text search query
- [ ] Create search-service with business logic
- [ ] Create GET /api/v1/search/autocomplete endpoint
- [ ] Create GET /api/v1/search endpoint
- [ ] Add Zod validation for query params
- [ ] Add caching headers for autocomplete (1 min) and search (5 min)
- [ ] Test fuzzy matching with common typos

### Frontend Tasks

- [ ] Create search-bar component in header
- [ ] Create autocomplete-dropdown component
- [ ] Create search-results component (reuses product-grid from 2.1)
- [ ] Create search-filters component (reuses filter logic from 2.1)
- [ ] Create search-empty-state component
- [ ] Create use-autocomplete TanStack Query hook
- [ ] Create use-search hook
- [ ] Create search page route
- [ ] Implement URL sync for search params
- [ ] Add debounce to search input
- [ ] Add loading skeleton for autocomplete
- [ ] Add keyboard navigation for autocomplete (arrow keys, enter)

### UX/UI Tasks

- [ ] Search icon in header triggers search focus
- [ ] Autocomplete shows products and categories separately
- [ ] Product suggestions show thumbnail, name, price
- [ ] Category suggestions show name and product count
- [ ] "No results" state with suggestions
- [ ] Recent searches (from localStorage)
- [ ] Clear button in search input
- [ ] Mobile: Full-screen search results page

---

## Success Criteria

The search feature is complete when:

1. **Autocomplete**: Typing 3+ chars shows suggestions within 300ms
2. **Suggestions Include**: Products and categories in dropdown
3. **Fuzzy Matching**: Typos still return relevant results
4. **Search Results**: Products display with image, name, price, rating
5. **Filtering**: Brand, price, rating filters work in search
6. **Sorting**: Relevance, price, newest, rating sorts work
7. **No Full Reload**: Filter/sort updates without page reload
8. **URL Sync**: Search query and filters in URL
9. **Performance**: Autocomplete < 300ms, full search < 2s
10. **Mobile**: Works on mobile with touch-friendly UI

---

## Integration Points

### With Story 2.1 (Category Browse)

- Reuse product-card component
- Reuse filter logic and components
- Reuse pagination controls
- Consistent product data shape

### With Story 2.3 (Product Detail)

- Click product in search results to go to detail page
- Back navigation returns to search with query preserved

### With Story 2.4 (Reviews)

- Rating displayed in search results
- Reviews accessible from product cards

### With Epic 1 (Auth)

- Search works for guest users
- Recent searches stored in localStorage (not tied to account)

---

## Edge Cases to Handle

1. **Empty Query**: Show popular searches or recent searches
2. **Very Long Query**: Truncate display, search on full text
3. **No Results**: Show "No products found" with category suggestions
4. **Special Characters**: Sanitize input, escape SQL
5. **Network Slow**: Show loading skeleton, don't block
6. **API Error**: Show error state with retry button
7. **Concurrent Searches**: Cancel previous request on new input
8. **Mobile Keyboard**: Close autocomplete on keyboard hide
9. **Search While Typing**: Debounce prevents excessive calls
10. **Category with No Products**: Show in suggestions but not in results

---

## Notes

- Consider "Search history" section in autocomplete
- Consider "Popular searches" when input is empty
- Consider voice search for mobile (future enhancement)
- Track search queries for analytics (what are users looking for but not finding?)
- Consider "Did you mean?" suggestions for low-confidence fuzzy matches

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created