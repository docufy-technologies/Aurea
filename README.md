# Aurea

A premium ecommerce platform for fragrances, cosmetics, and watches in Bangladesh.

**This is a proprietary project of Docufy Tech. No external contributors are allowed.**

## Overview

Aurea is a brand-forward ecommerce storefront designed for the Bangladeshi market. It emphasizes premium product discovery, reliable checkout with edge-case resilience, and a seamless shopping experience for luxury fragrances, cosmetics, and timepieces.

**Primary Market:** Bangladesh (BDT Currency)  
**Payment Provider:** SSLCOMMERZ (Cards, Mobile Wallets) + COD  
**Objective:** Maximize trusted conversions, minimize cart abandonment, deliver predictable delivery experiences

## Features

### Core Ecommerce
- **Product Catalog** - Rich product pages with high-res imagery, zoom, variants, and detailed specifications
- **Smart Discovery** - Category browsing, search with autocomplete, filters, and sorting
- **Shopping Cart** - Persistent cart with real-time inventory sync and price updates
- **Streamlined Checkout** - Guest checkout, address autocomplete, delivery slot selection
- **User Accounts** - Registration, login, password reset, order history, saved addresses
- **Pre-orders & Waitlists** - Manage stockouts gracefully with backorder capabilities

### Payment & Fulfillment
- **SSLCOMMERZ Integration** - Cards (Visa, Mastercard), Mobile Banking (bKash, Nagad, Rocket)
- **Cash on Delivery** - OTP verification for orders under BDT 50,000
- **Order Tracking** - Real-time status updates with SMS notifications
- **Delivery Management** - Standard (7-10 days) and Express (2-3 days in Dhaka) options
- **Returns & Refunds** - Streamlined return requests with 14-day refund processing

### Edge-Case Resilience (30+ Scenarios)

The platform is engineered to handle 30+ edge cases that commonly disrupt ecommerce experiences in the Bangladesh market:

**Cart & Inventory Edge Cases**
- Cart Conflict - Inventory/price changes during checkout with clear notifications
- Price Volatility - Prices fluctuate while user adds items; total at checkout may differ from cart total
- Session Timeout - User leaves site with items in cart and session expires; cart persistence needed
- Address Serviceability Surprise - Items cannot be delivered to user's address; partial fulfillment required
- Stock Phantom - Stock appears available but disappears before checkout; multi-stage verification prevents phantom stock
- Cross-Device Cart Chaos - Cart diverges across devices; real-time sync with conflict resolution
- Guest vs Account Limbo - Guest to account conversion without cart loss; merge duplicates
- Minimum Order Trap - Cart falls below minimum after out-of-stock change; proactive top-up suggestions
- Last Item Race Condition - Last unit sells to competing buyers; stock-lock + first-come-first-served

**Payment Edge Cases**
- Payment Limbo - Payment processing delays; status remains processing; progressive statuses and immediate transaction ID
- Double Payment Fear - User double-clicks Pay Now due to slow response; disable button, processing state, idempotency
- Payment Method Cascade Failure - Up to three payment methods fail; offer alternatives and fast retries
- Gateway Timeout Ambiguity - Gateway times out; user unsure if payment succeeded; progressive messages and auto-status checks
- Partial Payment Acceptance - Split payments with partial success; show per-method status and alternatives
- Card Verification Loop - OTP/verification loops; max attempts and fallback methods
- Wallet Balance Mismatch - Wallet balance stale or incorrectly displayed; verify live balance and offer top-up or split payment
- Post-Payment Stock Loss - Payment succeeded but stock unavailable; immediate refund and compensation path
- Duplicate Payment Prevention - Idempotency keys preventing duplicate charge attempts

**Fulfillment & Delivery Edge Cases**
- Substitution Logic - Item substituted without explicit user approval; show alternatives and confirm acceptance
- Partial Fulfillment Decision - Some items unavailable; offer ship now vs wait-for-full-order with ETA per shipment
- Delivery Slot Evaporation - Chosen delivery slot becomes unavailable; auto-suggest next slots with incentives
- Failed Delivery Loop - Delivery attempts fail; provide retry options and clear timelines
- Address Ambiguity Crisis - Address incomplete or ambiguous; collect structured fields and validate via maps
- Wrong Item Delivered - Delivered item differs from ordered; offer open-box verification or instant replacement/refund
- Package Damage Discovery - Damage discovered after delivery; two-path resolution with open-box delivery option
- Contactless Delivery Verification - Contactless delivery proves mandatory; include photo/GPS proof and optional OTP
- Delivery Window Breach - Promise missed; proactive communication and automatic compensation

**Returns & Refunds Edge Cases**
- Refund Timeline Opacity - Refund status unclear; provide visible timeline and stage updates with transaction IDs
- Partial Return Complexity - Returning part of combo/offer; show policy and exact refund calculation per option
- Return Window Ambiguity - Return window timing unclear; show exact deadline and countdown with reminders
- Exchange vs Refund Dilemma - Replacement stock unavailable; offer waitlist or refund with ETA for replacement

**Session & Authentication Edge Cases**
- Login Failure Mid-Checkout - Guest checkout; account creation or login fails; offer guest fallback and post-purchase account creation
- Flash Sale Stampede - High traffic and limited stock; queue/inventory reservation to prevent oversell
- Duplicate Account Detection - Duplicate signups lead to split orders; detect and merge accounts

**COD-Specific Edge Cases**
- COD Verification Friction - COD verification delays; provide multiple verification channels and fallback options

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Node.js + Express |
| **Database** | PostgreSQL (Neon/Supabase/Convex) |
| **ORM** | Prisma (if not using Convex) |
| **Queue** | Message queue for async processing |
| **Infrastructure** | Cloud hosting with Bangladesh CDN edge |

## Performance Targets

- Homepage load: < 3 seconds (3G)
- Search results: < 2 seconds
- Add to cart: < 1 second
- Checkout completion: < 5 minutes (returning customers)

## Documentation

- [Product Brief](./artifacts/planning-artifacts/Aurea-Product-Brief.md) - Vision, scope, and goals
- [PRD](./artifacts/planning-artifacts/Aurea-PRD.md) - Technical specifications and acceptance criteria
- [BRD](./artifacts/planning-artifacts/Aurea-BRD.md) - Business requirements and stakeholder analysis

---

## Proprietary Notice

**Copyright (c) 2026 Docufy Tech. All rights reserved.**

This repository and all of its contents, including but not limited to source code, configuration files, documentation, design assets, and business specification documents, are the exclusive property of **Docufy Tech**.

### Restrictions

No individual or entity may, without prior explicit written permission from Docufy Tech:

1. Copy, reproduce, or duplicate any part of this repository
2. Modify, adapt, or create derivative works based on this repository
3. Distribute, publish, sublicense, or transfer any part of this repository to any third party
4. Use any part of this repository for commercial or non-commercial purposes outside of this project
5. Use this repository or any of its contents as a portfolio piece, case study, or public reference without written consent from Docufy Tech

### Permitted Use

Members of the Docufy Tech training cohort are permitted to read, run, and contribute to this repository solely for the purposes of the internal training program for which it was created. This permission is non-transferable, revokes automatically upon separation from the program, and does not grant any ownership rights.

### Business Specification Documents

The business requirements, product specifications, and related documents included in this repository are based on the real business initiative of a third-party business owner, used with explicit permission. These documents remain the intellectual property of the original owner and are subject to additional restrictions beyond those stated above. They may not be reused, redistributed, or referenced in any form outside this repository.

### Disclaimer

This repository is a private training demo. It is not an official client deliverable. Docufy Tech makes no warranties regarding the fitness, completeness, or production-readiness of any code or documentation contained herein.

For permissions or inquiries, contact: info@tech.docufybd.com

---

Built for the Bangladesh market with attention to local payment methods, delivery logistics, and edge-case resilience.
