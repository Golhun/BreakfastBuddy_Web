# Breakfast Buddy — Complete Product & Implementation Plan

**Project:** Breakfast Buddy Food Preorder & Fulfilment System  
**Repository:** `BreakfastBuddy_Web` (existing GitHub repository)  
**Document status:** Working implementation specification (Version 1)  
**Prepared:** 30 October 2026  
**Business tagline:** **Good Food • Brighter Days**

> **Product goal:** Send customers directly to a focused preorder experience at `/`, where they can choose breakfast, enter delivery details, review the request and continue to WhatsApp only after the order is saved. Customers pay directly via Mobile Money, receive a manually sent PDF receipt after payment verification, and track delivery progress without creating an account. Give staff a secure, efficient way to manage the entire operation.

---

## 1. Executive summary

Breakfast Buddy will launch a branded, mobile-first preorder page for **Hausa Koko, Oats and Tom Brown**. Each meal is sold as a fixed standard package with optional configured add-ons. The root URL is the preorder experience rather than a separate marketing homepage: customers immediately configure meals, enter delivery details, review their total and create an order. The server must **save the pending order and assign a unique order reference before opening WhatsApp**.

A customer then chats with the business through WhatsApp, pays **directly** into Breakfast Buddy's designated Mobile Money wallet or merchant account, and waits for staff to verify the payment using the business's actual MoMo records. Staff confirm payment in a Cloudflare Access-protected admin dashboard. The system assigns a unique **Receipt ID**, preserves a receipt snapshot and lets staff download a **branded PDF receipt**, which they manually send to the customer on WhatsApp. Customers track status on the website using their Order ID and a second verification detail, without accounts.

**Version 1 does not include** Paystack, an MTN MoMo API, automated WhatsApp sending, automated payment confirmation or a dedicated PDF storage service.

### Objectives

1. **Low-friction ordering:** fast product selection, few form fields, mobile-friendly UI and WhatsApp conversation.
2. **Reliable payment control:** no order can be marked paid by a customer or by a screenshot alone.
3. **Operational clarity:** staff see tomorrow's confirmed orders, preparation quantities, deliveries and outstanding payments.
4. **Traceability:** unique identifiers, payment audit trail, stable receipt snapshots and status histories.
5. **Low initial cost:** remain eligible for Cloudflare free tiers where practical; ordinary MoMo network/merchant charges, domain costs and any optional services are separate.
6. **Future extensibility:** add integrated MoMo or messaging automation later without redesigning the customer journey.

---

## 2. Decisions already made

| Area | Decision |
|---|---|
| Brand | **Breakfast Buddy** |
| Tagline | **Good Food • Brighter Days** |
| Menu | **Hausa Koko, Oats, Tom Brown** only for launch |
| Packages | Fixed base package for each meal; base contents cannot be removed; configured extras may be added |
| Current package prices | Hausa Koko **GH₵10**, Oats **GH₵25**, Tom Brown **GH₵20** |
| Add-ons | Bread GH₵5, koose GH₵1, bofrot GH₵2, milk portion GH₵1, pinkanzo GH₵1; eligibility varies by meal |
| Add-on limit | Maximum 10 of each eligible add-on per configured package |
| Pricing caution | Package and add-on values are current configuration; reconfirm costs and selling prices before launch |
| Ordering | Website checkout followed by **WhatsApp-assisted conversation** |
| Payment | **Direct MoMo transfer** to the business; **manual staff verification** |
| Customer identity | Guest orders; **no account registration** |
| Customer tracking | Order reference + second verification detail; show limited information |
| Receipt | Unique Receipt ID, **on-demand branded PDF**, manual download and manual WhatsApp attachment |
| PDF storage | **Do not store PDFs**; store immutable receipt data instead |
| Customer frontend | **Hugo + Tailwind CSS v4 + TypeScript** |
| Backend | **Cloudflare Workers + Hono + TypeScript** |
| Database | **Cloudflare D1** |
| Admin authentication | **Cloudflare Access** with authorized staff identities |
| Hosting | **Cloudflare Workers with Static Assets**; two deployable Workers preferred |
| Source control | Existing private GitHub repository `BreakfastBuddy_Web` |
| Development | Local Windows machine, VS Code, Hugo Extended, npm, Wrangler and Git |
| Typefaces | **Montserrat** for display; **Karla** for UI/body |

### Business decisions still required before public launch

- Confirm final meal prices, included ingredients/accompaniments and packaging.
- Confirm the preorder **cutoff time**, timezone and eligible delivery days.
- Confirm delivery areas, delivery fees, service boundaries and policy for unavailable locations.
- Confirm whether payments must be verified before the cutoff to qualify for next-day delivery.
- Confirm the official MoMo merchant/wallet name and number; never hardcode unverified payment details.
- Confirm customer support WhatsApp number and business operating hours.
- Confirm cancellation, refund, delivery-failure and late-payment terms.
- Approve actual brand logo and food photographs for each menu item.
- Confirm food preparation capacity and how sold-out/unavailable dates are handled.

**Scheduling rule:** next-day delivery is an intended operational model, **not an unconditional guarantee**. Show only an eligible date, and make acceptance contingent on stock, payment verification and cutoff rules.

---

## 3. Brand and design system

The provided **Breakfast Buddy flyer is the brand identity reference**. Follow its warm, cheerful, appetizing and friendly feel without sacrificing legibility.

| Token | Approximate hex | Usage |
|---|---|---|
| Breakfast Red | `#FC3B31` | Primary actions, selected states, promotional accents |
| Sunshine Gold | `#FEAE10` | Highlights, badges, secondary accents |
| Cocoa Brown | `#4E3C33` | Main text, footer, dark UI surfaces |
| Warm Cream | `#FEFBEC` | Site background |
| Butter Yellow | `#FDF5CD` | Cards, gentle surfaces, supporting backgrounds |

**Typography**
- **Montserrat:** logo-adjacent titles, hero headings, major section headings and highlight text.
- **Karla:** descriptions, navigation, forms, prices where appropriate, buttons and UI labels.
- Provide fallback fonts, font-display swap and accessible contrast.

**Visual standards**
- Mobile-first layouts, concise friendly copy, rounded cards/buttons, consistent spacing.
- Approved food photography only; do not misrepresent the actual products with arbitrary images.
- Real prices, delivery fees and payment status should never be implied by a decorative mockup.
- Clear loading, error, success and empty states. Keyboard focus and accessible form labels.
- Receipt design: compact print-friendly PDF (A6 where content fits, otherwise flow onto a larger page), logo, unique IDs, itemized lines, verified payment data, delivery date and verification URL/QR if implemented.

---

## 4. Customer-facing site: pages and functionality

### 4.1 Preorder page (`/`)
- The root route is the primary customer experience; do not place a marketing landing page before it.
- Compact Breakfast Buddy branding, tagline and concise explanation of the preorder process.
- Three-item menu, quantity controls, customer/delivery form and order summary in one mobile-first flow.
- Next eligible delivery date and ordering deadline once business rules are finalized.
- Clear links or compact supporting content for tracking, contact, delivery coverage and policies when those features are implemented.

### 4.2 Menu & cart (within `/`)
- Product cards for Hausa Koko, Oats and Tom Brown.
- Fixed standard package per meal, photo, included contents, confirmed base price and availability.
- A compact customization modal lists locked included contents and eligible add-ons with quantities and live price updates.
- Each differently configured package remains a separate cart/order line; customers may increase the quantity of an identical configuration.
- Quantity controls, remove/clear, line subtotal, order subtotal and any disclosed delivery charge.
- Persistent draft cart in `localStorage` for convenience; **localStorage is not authoritative**.
- Responsive behavior, disabled controls for unavailable items and helpful empty cart state.

### 4.3 Customer and delivery details (within `/`)
Collect only what is needed to create the initial preorder:
- WhatsApp phone number — required and normalized to Ghana-compatible international format.
- Meal package selections, add-ons and quantities — required, sourced from cart and revalidated server-side.
- Optional order note with a strict length limit (avoid sensitive data collection).
- Customer name, delivery area/address and eligible date are confirmed later in the WhatsApp conversation rather than collected in the initial web form.
- Clear order summary, fee breakdown and **Create Preorder & Continue to WhatsApp** button.
- Keep submission unavailable until the public persistence API exists; never fall back to a WhatsApp-only unsaved order.

**The server, not the browser, calculates authoritative prices and eligibility.**

### 4.4 Saved-order confirmation / WhatsApp handoff (post-submit state at `/`, or a future `/order-created/` route if needed)
- Call `POST /api/orders` first; only open WhatsApp **after** a successful server response.
- Show saved Order ID, amount, delivery date and current status **Pending Payment**.
- Provide **Continue to WhatsApp** link with prefilled text containing order reference, item summary, total and date.
- Preserve a copy-order-details button and retry WhatsApp action.
- Never claim the order is paid or accepted merely because WhatsApp opened.

### 4.5 Track order (`/track/`)
- Account-free lookup using **Order ID plus matching WhatsApp number or another possession factor**.
- Rate-limit attempts and avoid exposing whether a phone number belongs to a customer.
- Display limited fields: order status, confirmed delivery date/time window where known, delivery stage and support link.
- Do not expose full address, phone number or private notes on a simple reference lookup.
- Later option: authenticated receipt download via a suitably scoped secure token.

### 4.6 Policy and help
- How direct MoMo payment and manual verification work.
- Clear warning not to send MoMo PINs or passwords.
- Cancellation/refund and delivery terms.
- Contact and WhatsApp support.

---

## 5. Definitive customer journey

1. **Open preorder page.** Customer arrives directly at `/` and sees Breakfast Buddy branding, meals, prices and delivery guidance without passing through a separate landing page.
2. **Configure cart.** On the same page, the customer chooses a fixed meal package, selects eligible add-ons in a modal and adds the configuration to the cart. Different add-on combinations remain separate lines.
3. **Enter contact.** On the same page, the customer provides a WhatsApp number and optional order note, then reviews the summary. Staff confirm name and delivery details in WhatsApp.
4. **Create order.** Public API validates availability, prices and details; saves order and line items in D1; creates a cryptographically random unique Order ID and `pending_payment` status.
5. **Continue to WhatsApp.** Website opens a **prefilled customer-initiated WhatsApp message** to the business with Order ID, items, quantities, total and delivery date. The customer presses Send.
6. **Business communicates.** Staff confirm the order, provide verified official MoMo payment information and clarify issues as needed.
7. **Customer transfers MoMo payment directly.** No payment gateway is used in Version 1. Staff may request the MoMo transaction reference for easier reconciliation.
8. **Staff verify real receipt of funds.** Compare actual merchant transaction history against amount, sender/reference and order; do not trust screenshots or user-entered IDs as proof.
9. **Staff confirm payment.** Protected admin API records verifier, verified timestamp, method, transaction reference and amount. The order becomes `confirmed`; a unique Receipt ID and immutable receipt snapshot are generated **once**.
10. **Staff download PDF.** Protected dashboard creates the branded PDF from the immutable snapshot; no PDF needs to be stored.
11. **Staff send WhatsApp receipt.** Staff attach the downloaded PDF manually and send it with a short confirmation message. No automated WhatsApp API needed.
12. **Prepare and deliver.** Kitchen sees confirmed orders grouped by date and meal. Staff progress statuses through `preparing`, `out_for_delivery`, and `delivered`.
13. **Customer tracks order.** Customer visits `/track/`, enters Order ID plus verification detail and sees limited status.

**Failure paths:**
- WhatsApp not opened/sent: saved order remains pending; customer can retry handoff.
- Payment not received: order remains `pending_payment` / `payment_review` as applicable.
- Payment received late: staff resolve date availability before confirming fulfillment.
- Duplicate confirm click: existing Receipt ID is reused, not regenerated.
- Payment discrepancy: staff flag and resolve; never mark paid automatically.
- Cancellation after payment: record refund/reversal separately; never silently rewrite the original receipt.

---

## 6. Staff-facing admin: screens and actions

**Host the staff application separately from the public storefront.** It is protected by Cloudflare Access and authorization checks. It uses the same D1 database but has different backend permissions.

### Dashboard
- Today's new orders, pending payment verification, paid/confirmed orders.
- Orders for the next delivery day, meal preparation counts, delivery queue.
- Paid revenue and outstanding amounts, clearly distinguishing **expected** from **verified collected** revenue.
- Quick links to urgent orders and recent status events.

### Orders
- Search by Order ID, customer/WhatsApp number (admin only) and date.
- Filter by status, delivery date, meal and payment verification status.
- View itemized totals, delivery details and communication notes.
- Inspect order history and prevent unauthorized edits to confirmed financial fields.

### Payment verification
- Record payment method/network, customer-submitted reference (optional), verified transaction reference, amount, currency, verification date and verifying staff identity.
- Compare to expected payable amount; handle short/overpayments deliberately.
- Only staff may select **Mark Paid & Confirmed**.
- Idempotent confirmation, no duplicate receipts or transitions.

### Receipts
- List issued Receipt IDs and linked orders.
- **Download PDF Receipt** after verified payment.
- Re-download identical financial details from immutable snapshot.
- Ability to mark **Receipt Sent** for administrative tracking without implying WhatsApp API delivery confirmation.
- Optional future receipt-verification page with minimal public data and unpredictable verification token.

### Kitchen / preparation
- Date-specific production sheet: number of Hausa Koko, Oats and Tom Brown portions to prepare.
- Confirmed-only quantities by default; optional visibility of pending orders separately.
- Prepare status updates and export/print if helpful.

### Deliveries
- Orders grouped by delivery date and area.
- Address/landmark details available only to authorized staff.
- Mark Out for Delivery / Delivered; record delivery notes/timestamps.
- Avoid claiming live rider GPS tracking if none exists.

### Menu & settings
- Edit product availability and prices in a single authoritative source.
- Configure cutoff time, delivery dates, delivery fees/areas, support phone and official payment instructions.
- In early implementation, settings may be a version-controlled configuration rather than a full CRUD admin screen; document this limitation.

### Administration
- Staff login is managed by Cloudflare Access (email OTP or configured identity provider).
- A separate local password database is **not** required.
- Backend still verifies Access identity/claims and authorizes mutations. Authenticate != authorize.

---

## 7. Order states and rules

Recommended internal values:

```text
pending_payment
payment_review
confirmed
preparing
out_for_delivery
delivered
cancelled
refunded       (only when appropriate and actually processed)
```

Suggested transitions:

```text
pending_payment -> payment_review -> confirmed -> preparing -> out_for_delivery -> delivered
       |                 |              |
       +-----------------+--------------+--> cancelled (subject to business rules)
                                                    |
                                                    +--> refunded (if money was collected)
```

Rules:
- A public customer API may **create** and **read limited tracking info**; it may not set payment/fulfilment status.
- Staff must not skip verified payment when confirming an order.
- `payment_review` is an optional operational state meaning information was submitted, **not** that funds were received.
- Transitions are validated server-side and recorded with actor, timestamp and reason.
- Final delivery date must be explicitly accepted; a provisional selected date is not a guarantee.
- Refund is a separate financial event, not an edit to historical paid amount.

---

## 8. Technical architecture

### Selected stack

| Responsibility | Technology |
|---|---|
| Static templates / content | Hugo Extended |
| Styling / design tokens | Tailwind CSS v4 |
| Browser interactions | TypeScript (compiled to JS by Hugo) |
| Backend endpoints | Hono + TypeScript on Cloudflare Workers |
| Public hosting | Cloudflare Worker + Static Assets (Hugo `public/` build) |
| Staff app / API | Separate Cloudflare Worker protected by Cloudflare Access |
| Persistent orders / payments / receipts | Cloudflare D1 (SQLite-based) |
| PDF generation | `pdf-lib` from verified receipt snapshot |
| Chat checkout | WhatsApp click-to-chat URL with prefilled message |
| Code and CI/CD | Git / private GitHub repository `BreakfastBuddy_Web` |

### Recommended deployments

```text
Browser (customers)
  |
  v
Public Worker + Hugo static assets
  |- /                  menu + cart + customer details + order summary
  |- saved-order state  Order ID + WhatsApp handoff after successful persistence
  |- /track/            restricted customer status UI
  |- /api/orders        validate + persist preorder
  |- /api/orders/track  limited lookup with verification
  |
  +--------------> Shared Cloudflare D1
                         ^
                         |
Cloudflare Access ---> Admin Worker (UI and /api/admin/*)
                         |- payment confirmation
                         |- order and kitchen management
                         |- immutable receipt record
                         |- PDF download
```

**Deployment/security detail:** Protect the **entire admin Worker**, including its `workers.dev`, custom domain and preview routes, rather than protecting only a visible HTML path. Validate Access identity for privileged routes and test all alternate hostnames. Do not publish private APIs or admin assets from the public Worker.

### Source-of-truth rules

- Menu prices are **authoritative on the server**; never accept client-submitted totals.
- Hugo `data/menu.toml` currently renders the public menu; for production, design a **single source of truth** for price and availability (shared build data or backend catalogue) to avoid frontend/server drift.
- Browser `localStorage` contains only draft cart data and must never grant permission or evidence payment.
- D1 is the source of truth for orders and statuses.
- Receipt snapshot is the source of truth for regenerated PDFs.

### Suggested repository evolution

The existing project already contains Hugo's `assets/`, `content/`, `data/`, `layouts/`, `static/`, `hugo.toml`, `tsconfig.json` and npm files. **Do not discard that work.** Grow it incrementally:

```text
BreakfastBuddy_Web/
├── assets/
│   ├── css/main.css
│   └── ts/main.ts
├── content/
│   └── _index.md
├── data/menu.toml
├── layouts/
│   ├── _partials/css.html
│   ├── baseof.html
│   └── home.html
├── static/
│   └── images/                 # approved brand/product photos
├── worker/
│   ├── public/                 # Hono public API + storefront Worker entry
│   └── admin/                  # protected admin Worker entry
├── shared/                     # types, validation, menu and statuses
├── migrations/                 # versioned D1 SQL migrations
├── tests/
├── wrangler.public.jsonc       # or separate configs per Worker
├── wrangler.admin.jsonc
├── hugo.toml
├── tsconfig.json
├── package.json
├── AGENTS.md
└── BREAKFAST_BUDDY_PROJECT_PLAN.md
```

*Note:* filenames and folders for Workers are the **target structure**, not a claim that they already exist. Set `assets.directory` to Hugo's generated `public/` in the public Worker's Wrangler configuration. Route `/api/*` to Worker handlers (e.g., `assets.run_worker_first`), while static files remain static. Keep the admin static assets with its own Worker if a separate UI is built.

---

## 9. Database design (proposed)

Use schema migrations, foreign keys where supported, indices for order lookup/date/status, parameterized queries and transaction-aware/idempotent writes.

### `orders`
- `id` — internal UUID/opaque primary key.
- `order_code` — unique customer-facing reference (`BB-...`).
- `whatsapp_e164` — required and private; `customer_name` may be added after WhatsApp confirmation.
- `order_note` — optional customer-provided text with strict limits.
- `delivery_area`, `delivery_address`, `delivery_instructions` — initially nullable private fields populated only after confirmation.
- `requested_delivery_date`, `confirmed_delivery_date` — initially nullable date fields populated only after confirmation.
- `status` — valid order state.
- `subtotal_pesewas`, `delivery_fee_pesewas`, `total_pesewas` — integer money values.
- `currency` — `GHS`.
- `created_at`, `updated_at`, `confirmed_at`, `delivered_at` — UTC timestamps.

### `order_items`
- `id`, `order_id`, `product_id`, `product_name_snapshot`, `package_contents_snapshot_json`.
- `base_price_pesewas`, `addons_snapshot_json`, `unit_price_pesewas`, `quantity`, `line_total_pesewas`.

### `payments`
- `id`, `order_id`, `method` (`momo_manual`), `network` (if known).
- `expected_amount_pesewas`, `verified_amount_pesewas`.
- `customer_supplied_reference` (optional, untrusted).
- `verified_transaction_reference`, `verified_by`, `verified_at`.
- `verification_status`, `created_at`.
- Uniqueness rules to prevent assigning one verified MoMo transaction to multiple orders.

### `receipts`
- `id`, `receipt_code` — unique.
- `order_id`, `payment_id`, `issued_at`, `issued_by`.
- `snapshot_json` — **immutable** customer/order/item/price/payment/delivery facts at issue time.
- `verification_token_hash` (optional future feature).
- `sent_at`/`sent_by` (if staff record manual sending).

### `order_events`
- `id`, `order_id`, `from_status`, `to_status`.
- `actor_type`, `actor_id`, `reason`, `created_at`.

### `products` / `business_settings` (optional after MVP)
- Move pricing, availability, cutoff and delivery rules into D1 if staff need to edit these from the admin. Otherwise keep configuration version-controlled and deployed with the app; document the workflow.

### Integrity expectations

- Keep monetary values in **integer pesewas**, not floating-point currency columns.
- Preserve product and receipt snapshots even if today's menu changes.
- Use atomic/idempotent receipt creation so retrying a payment confirmation does not create another receipt.
- Do not store MoMo PIN, wallet credentials or full unnecessary payment secrets.
- Establish retention/deletion policies for private delivery and contact information.

---

## 10. API contract (initial design)

All requests and responses are JSON except downloadable PDF endpoints. Exact paths may evolve, but version them deliberately.

### Public endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Lightweight service health (no secrets) |
| `/api/menu` | GET | Published products, prices, availability and eligibility rules (if dynamic) |
| `/api/orders` | POST | Validate inputs, recalculate total, save order, return Order ID and WhatsApp handoff data |
| `/api/orders/track` | POST | Verify Order ID + WhatsApp/other factor; return minimal public status |

Create-order input example (**illustrative**, prices intentionally omitted):

```json
{
  "whatsapp": "+233XXXXXXXXX",
  "items": [
    {
      "productId": "hausa-koko",
      "quantity": 1,
      "addons": [
        { "addonId": "koose", "quantity": 2 },
        { "addonId": "milk", "quantity": 1 }
      ]
    },
    { "productId": "oats", "quantity": 1, "addons": [] }
  ],
  "note": "Optional order note"
}
```

The response should return the persisted order reference, server-calculated totals, `pending_payment` status and a validated/safely encoded WhatsApp prefill message. Delivery date is not asserted until it is confirmed later. The server must reject unknown or ineligible add-ons, quantities above configured limits and all client-supplied prices. Rate-limit new order submissions and validate strings/lengths.

### Protected admin endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/orders` | GET | Search/filter/paginate orders |
| `/api/admin/orders/:id` | GET | Full authorized order details |
| `/api/admin/orders/:id/verify-payment` | POST | Reconcile actual MoMo receipt; confirm payment, generate Receipt ID once |
| `/api/admin/orders/:id/status` | PATCH | Validated fulfilment transition with audit event |
| `/api/admin/orders/:id/receipt.pdf` | GET | Generate PDF from immutable receipt snapshot |
| `/api/admin/kitchen` | GET | Production quantities by confirmed delivery date |
| `/api/admin/deliveries` | GET | Delivery list by date/area |

All privileged endpoints must validate authenticated staff identity and permissions. Never trust only a front-end hide/show rule or an unverified request header.

---

## 11. Security, fraud prevention and privacy

### Non-negotiable requirements

1. **Cryptographically unpredictable identifiers:** generate IDs on server; display a shorter unique reference if needed but ensure non-guessability and collision handling.
2. **No customer access to mutations:** public APIs cannot verify payments, issue receipts or change fulfilment status.
3. **Cloudflare Access on admin Worker:** allowlisted staff or identity provider; protect production, custom domains and preview URLs. Validate Access JWT/identity correctly inside sensitive code paths.
4. **Role/authority checks:** even signed-in users should have only the operations they need. Audit who performed each status/payment change.
5. **Server-side money math:** known product IDs and allowed quantities; recompute total with authoritative prices; integer pesewas.
6. **Manual MoMo verification:** staff must inspect actual merchant receipt; screenshots, typed references and customer claims are not sufficient.
7. **Receipt issue once:** issue after verified full payment; immutable snapshot, stable Receipt ID and idempotent operation.
8. **Private order lookup:** require second factor and return only limited status; anti-enumeration error messages and rate limits.
9. **Input handling:** validation, output encoding, parameterized SQL, size limits, CSRF defenses where cookies are used, security headers and safe redirects.
10. **Secrets:** no credentials, Access secrets or production customer data in GitHub, browser bundles or test fixtures.
11. **Resilience:** recover from closed browsers, duplicate requests, network failures and repeated staff clicks.
12. **Data protection:** collect only necessary contact/delivery data, restrict staff access, define a privacy notice and retention policy appropriate to Ghana's applicable data protection requirements.

### Fraud / support scenarios

| Scenario | Required response |
|---|---|
| Customer fabricates screenshot | Keep pending; staff check actual MoMo ledger |
| Customer types arbitrary transaction reference | Treat as a claim, not proof |
| Customer tampers with cart total | Ignore; recalculate from server prices |
| Customer guesses someone else's Order ID | Require additional verification and rate-limit |
| Unauthenticated request hits admin API | Deny even when URL known |
| Staff double-clicks Confirm | Reuse existing successful confirmation and receipt |
| Customer closes WhatsApp | Order persists and handoff can be retried |
| Payment confirmed after cutoff | Reschedule/reconfirm delivery before acceptance |
| Staff cancels paid order | Refund workflow with immutable original receipt and separate records |

---

## 12. PDF receipt specification

**Trigger:** confirmed, verified payment only.  
**Generation:** on demand via admin dashboard using `pdf-lib`.  
**Storage:** **no stored PDFs**; D1 holds an immutable receipt snapshot.

Required contents:
- Breakfast Buddy logo, contact and tagline.
- Title: **OFFICIAL PREORDER PAYMENT RECEIPT**.
- Unique Receipt ID and linked Order ID.
- Issue date/time and verified MoMo payment date/time (distinguish them).
- Customer name; minimal delivery details appropriate for a customer-facing document.
- Meal item names, quantities, unit prices and subtotals.
- Delivery fee (if any), total paid, balance due and currency.
- Confirmed delivery date and payment method.
- Human-friendly note: receipt confirms payment, not yet delivery.
- Optional QR for server-backed authenticity verification (only once endpoint and token exist).

Do not assert legal/tax compliance solely by calling a document an “official receipt”; add mandatory business registration/tax data if applicable after client verification. PDF files can be forged; authenticity depends on server-side records, not visual styling.

Filename example: `BreakfastBuddy_RCP-YYYYMMDD-XXXX.pdf`.

**Manual workflow:** staff select **Download Receipt** → device saves PDF → staff attach PDF to the customer's WhatsApp conversation → optionally record `sent_at` manually. Ordinary click-to-chat cannot auto-attach a PDF.

---

## 13. Development, testing and deployment

### Local developer environment

- Existing Windows repository: `BreakfastBuddy_Web`.
- Hugo Extended **v0.169.0** was confirmed installed and working.
- Hugo homepage is running locally.
- Tailwind CSS v4, TypeScript, Montserrat and Karla are configured in the current frontend.
- Product cards/cart/total code has been supplied in the conversation; **confirm actual repository contents and tests before labeling those features complete**.
- Node.js, npm, Git, Wrangler and a private GitHub repository are assumed tools; verify installed versions rather than assuming.

Suggested verification commands from repository root:

```powershell
hugo version
npm install
npx tsc --noEmit
hugo --cleanDestinationDir
hugo server
```

Before installing the backend, inspect `package.json`, current Hugo template locations and build output. Do not replace working templates casually.

### Cloudflare configuration plan

1. Verify customer-owned Cloudflare account with MFA.
2. Develop public Worker and its Hugo Static Assets configuration locally (`public/` generated by Hugo).
3. Create D1 database and binding; use versioned migrations.
4. Build and test Hono APIs using local Wrangler and a **local** D1 instance.
5. Create separate admin Worker and set up Cloudflare Zero Trust/Access with an authorized-email policy.
6. Validate both admin UI and admin APIs behind Access; test `workers.dev`, production, previews and custom domains.
7. Configure environment-specific bindings; avoid accidental remote database migrations.
8. Connect private GitHub repo to Cloudflare or deploy via a documented GitHub Actions/Wrangler pipeline. Make branch/production mapping explicit.
9. Run staging smoke tests before accepting real orders.
10. Connect a custom domain only when client approves it.

> Cloudflare Workers Static Assets is the chosen hosting model, not the older Workers Sites product. Use current Wrangler configuration, preferably `wrangler.jsonc`, and check current published platform limits before launch.

### Suggested quality gates

- `npx tsc --noEmit` passes.
- `hugo` builds successfully and generates `public/index.html`.
- Tests pass for prices, totals, date cutoffs, phone validation and order transitions.
- API tests cover invalid input, tampering, duplicate submission, payment confirmation retry and unauthorized access.
- Accessibility checks: keyboard navigation, labels, focus visibility, contrast and mobile layouts.
- End-to-end staging: **place order → save D1 → open WhatsApp → admin verifies test record → issue receipt → PDF download → tracking → delivered**.
- No test customer data or secrets appear in public builds/repo.
- Verify manual MoMo reconciliation and refund SOP before live launch.

---

## 14. Delivery phases and acceptance criteria

### Phase 0 — Foundation (partly completed)
- [x] Create and clone existing GitHub repository `BreakfastBuddy_Web`.
- [x] Install and confirm Hugo Extended v0.169.0.
- [x] Resolve initial Hugo 404 and render homepage.
- [x] Select brand palette and Google Fonts.
- [x] Reported setup of Hugo + Tailwind v4 + TypeScript.
- [ ] Confirm repository state/build and commit a clean baseline.
- [ ] Add this plan and `AGENTS.md` to the repository.

**Accept when:** local Hugo build works, type check passes and version control contains no secrets/generated artifacts.

### Phase 1 — Branded public UI
- [ ] Polish the direct preorder header, product photography, menu cards, form, summary, footer and responsive layout.
- [ ] Confirm three fixed packages, included contents, eligible add-ons and approved prices.
- [ ] Working cart, quantities, totals and clear/remove.
- [ ] Complete the checkout fields on `/` and add approved date/area policies.

**Accept when:** customer can assemble a valid draft order on mobile with clear accurate pricing; no backend yet claimed.

### Phase 2 — Persistent preorder backend
- [ ] Hono public API + D1 binding.
- [ ] Database migrations for orders/items/events.
- [ ] Server-side price validation and cutoff rules.
- [ ] Generate unique Order ID; save before WhatsApp handoff.
- [ ] Rate limiting, error handling and retries.
- [ ] Customer tracking endpoint with second factor.

**Accept when:** saved orders persist across browsers; forged totals fail; tracking returns only authorized minimal status.

### Phase 3 — Protected admin & manual payments
- [ ] Separate admin Worker/UI.
- [ ] Cloudflare Access and server-side validation; protect all admin hostnames/preview.
- [ ] Search/filter/view orders.
- [ ] Manual MoMo verification and idempotent confirm.
- [ ] Status transition history and staff audit data.

**Accept when:** unauthenticated users cannot change state; only verified paid orders become confirmed.

### Phase 4 — Receipts, kitchen and deliveries
- [ ] Unique Receipt ID and immutable snapshot on payment confirmation.
- [ ] Generate branded `pdf-lib` receipts on demand.
- [ ] Manual WhatsApp attachment SOP and receipt-sent marker.
- [ ] Kitchen totals for next-day confirmed quantities.
- [ ] Delivery queue and out-for-delivery/delivered updates.

**Accept when:** repeated PDF downloads retain the same original financial facts; staff can prepare and dispatch accurately.

### Phase 5 — Release and hardening
- [ ] Approve final prices, cutoffs, delivery fees, contacts, MoMo details, policies.
- [ ] Approve logo/real product imagery.
- [ ] E2E test all edge cases and Access bypass attempts.
- [ ] Configure and test backup/restore/reconciliation monitoring.
- [ ] Publish customer support instructions; launch gradual pilot.

**Accept when:** complete real-world pilot from order to next-day delivery succeeds with no false paid confirmations.

### Phase 6 — Later enhancements (not launch requirements)
- Automated MoMo API/payment gateway only if commercial value justifies fees and onboarding.
- WhatsApp Business Platform/SMS/email notifications if needed.
- Customer receipt self-service download with secure verification.
- Delivery ETA/rider updates, stock capacity limits, analytics/exports and more meal options.
- Advanced roles and permissions if multiple teams or branches are added.

---

## 15. Risks and practical mitigations

| Risk | Mitigation |
|---|---|
| Order exists but WhatsApp message never sent | Order saved first; clear pending state and retry button |
| Staff don't immediately see orders | Admin pending queue, refresh/search, optional future notifications |
| Pricing differs between Hugo and API | One authoritative catalogue and integration tests |
| Incorrect/missing MoMo reference | Verify actual merchant ledger and amount before marking paid |
| Customer expects guaranteed next-day delivery | Show cutoff and confirmed schedule explicitly |
| Fake public tracking references | Unpredictable IDs, second factor, rate limits, minimal output |
| Unauthorized admin access | Protect full admin Worker and verify signed Access identity |
| Inconsistent receipts after edits | Immutable receipt snapshot, correction/refund events |
| D1/Workers free-tier exceeded | Monitor actual limits and usage; design for graceful errors and recovery |
| Data loss or accidental migration | Versioned migrations, backups/restore procedures and staging |
| Staff sends receipt to wrong customer | Confirm WhatsApp number/order link before manual attachment |

---

## 16. Immediate next actions

1. Save this document and `AGENTS.md` in the repository root.
2. Review the current `home.html`, `main.ts`, `data/menu.toml`, Tailwind config and `package.json` and ensure they match what is actually running.
3. Commit a working baseline.
4. Complete and validate the single-page preorder UI at `/` (packages, add-ons, quantities, WhatsApp number, optional note and meal summary).
5. Decide final business rules, then implement public Worker + D1 and test server-created pending orders before enabling the WhatsApp submit button.
6. Build the separate protected admin Worker only after order persistence works.

### Primary references

- Hugo documentation: https://gohugo.io/documentation/
- Tailwind CSS v4: https://tailwindcss.com/docs/installation
- Cloudflare Workers Static Assets: https://developers.cloudflare.com/workers/static-assets/
- Cloudflare Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
- Cloudflare D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- Cloudflare Access for Workers: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- Hono: https://hono.dev/
- pdf-lib: https://pdf-lib.js.org/

---

**Guiding principle:** keep ordering easy for customers, payment verification explicit for staff, and every financial action traceable. Deliver the smallest reliable version before adding automation.
