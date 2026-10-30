# AGENTS.md — Breakfast Buddy Web

> Instructions for AI coding assistants, automation agents and human collaborators working in the `BreakfastBuddy_Web` repository. **Read `BREAKFAST_BUDDY_PROJECT_PLAN.md` before editing application architecture, data models, payment, tracking or receipt behavior.**

## Mission

Build and maintain **Breakfast Buddy**, a mobile-first food preorder website for **Hausa Koko, Oats and Tom Brown**. Customers create an order on the site, then continue through WhatsApp for direct MoMo payment. Authorized staff manually verify actual receipt of funds, confirm orders and download branded PDFs to send via WhatsApp. Customers track orders without registering accounts.

**Do not silently convert this into a conventional online-payment ecommerce application.** The agreed MVP deliberately has no Paystack, no MTN MoMo API and no automated WhatsApp messaging.

## Current state vs planned state

- Repo already exists and is cloned as `BreakfastBuddy_Web`; **do not reinitialize Git or create a replacement Hugo site**.
- Hugo Extended **v0.169.0** was installed and the local homepage rendered successfully.
- User reports Hugo, Tailwind CSS v4, TypeScript and Google Fonts configured.
- Sample `home.html`, `main.ts` and `data/menu.toml` have been provided in conversation. **Inspect the actual files before editing.** Do not assume all supplied snippets were committed or deployed.
- Backend, D1 migrations, separate protected admin Worker, receipts and real order tracking are **planned**, not implemented merely because they appear in documentation.
- At the start of each task, identify what's present, what's missing and the smallest safe change.

## Invariants / product rules

1. Launch menu: **exactly three items** — `hausa-koko`, `oats`, `tom-brown`.
2. Each menu item is a **fixed standard package** whose base meal cannot be removed. Customers may add configured extras, up to 10 of each add-on per configured package. Separate customizations remain separate cart/order lines.
3. Current configured package prices are **GH₵10 / GH₵25 / GH₵20** for Hausa Koko, Oats and Tom Brown respectively. Add-on prices and package contents come from `data/menu.toml`; reconfirm all prices before public launch.
4. Customer is a **guest**: no customer auth/login system.
5. An order must be **saved in D1 before** a WhatsApp checkout link is offered/opened.
6. Public order creation generates a **server-side cryptographically random unique order reference**.
7. WhatsApp chat does not indicate that payment succeeded.
8. Payment is **direct MoMo**, **manually verified** by staff from the business's real wallet/merchant statement.
9. Customers cannot change payment status or fulfilment status.
10. A **Receipt ID** is issued only after verified successful payment; confirmation must be idempotent.
11. PDFs are **generated on demand** from **immutable receipt snapshot data**; no PDF file persistence by default.
12. Staff manually download the receipt and attach/send it on WhatsApp.
13. Customer tracking requires Order ID **and second verification detail**; expose minimal private information.
14. Next-day delivery depends on a configurable cutoff, confirmed payment and business approval; never promise it unconditionally.
15. Separate public and admin deployment; protect **the entire admin Worker**, including previews and alternate hostnames, with Cloudflare Access and server-side authorization.

## Stack (do not replace without explicit approval)

| Component | Choice |
|---|---|
| Static site generator | Hugo Extended |
| Frontend | HTML templates + Tailwind CSS v4 |
| Client interactivity | TypeScript (Hugo `js.Build`) |
| Backend | Hono + TypeScript on Cloudflare Workers |
| Hosting | Cloudflare Workers with Static Assets |
| Persistence | Cloudflare D1 |
| Admin identity | Cloudflare Access |
| PDF | `pdf-lib` |
| Ordering conversation | WhatsApp click-to-chat (prefilled text) |
| Repository | GitHub `BreakfastBuddy_Web` |

Avoid adding React, Vue, Astro, a conventional PHP server, Firebase, Paystack or payment/messaging providers unless a task explicitly approves the change.

## Design system

- Brand: **Breakfast Buddy**, tagline **Good Food • Brighter Days**.
- Primary red: `#FC3B31`.
- Sunshine gold: `#FEAE10`.
- Cocoa brown: `#4E3C33`.
- Warm cream: `#FEFBEC`.
- Butter yellow: `#FDF5CD`.
- **Montserrat** for display/headings; **Karla** for body/UI.
- Prioritize readable contrast, mobile-first breakpoints, accessible labels, clear focus states and concise copy.
- Use only approved actual food images/logo for production. Never imply an illustrative product photo represents the actual item.
- Reuse existing CSS variables/Tailwind tokens rather than introducing inconsistent colors.

## Repository operations

1. **Inspect first:** `git status`, `package.json`, `hugo.toml`, `layouts/`, `assets/`, `data/menu.toml` and relevant Worker configuration.
2. **Small scoped changes:** preserve the existing working Hugo templates and menu/cart functions.
3. **Never overwrite** user edits or replace large files without understanding their contents. Refactor incrementally.
4. **Do not** run `git init`, create a new root repo, or change Git remotes.
5. Build artifacts, dependencies and secrets are not committed. Ensure `.gitignore` excludes `public/`, `node_modules/`, `resources/`, `.wrangler/`, `.env*`, `.dev.vars*` and other local secrets; retain explicitly allowed example files.
6. Commit only when explicitly asked. Do not push/deploy production unless authorized.
7. Before writing code, name target files and anticipated behavior; after editing, report what changed and verification results.
8. Keep documentation in sync when changing architecture, API contract, status transitions or scope.

## Local commands and validation

Use PowerShell-compatible commands on the user's Windows system. From repository root:

```powershell
hugo version
npm install
npx tsc --noEmit
hugo --cleanDestinationDir
hugo server
```

If Workers are already configured, use the **repository's actual scripts/configs** to run `wrangler dev` and tests. Do not invent npm script names or database identifiers.

Expected key checks:
- Hugo build emits `public/index.html`.
- TypeScript checking passes without suppressing errors.
- Tailwind and both Google Fonts load in the local preview.
- Cart totals are correct and stable after refresh.
- Mobile menu works with keyboard and touch.
- No customer secrets or production data in browser assets.

## Architecture rules

- Public Worker owns only public site assets, order creation, safe catalogue and limited customer tracking.
- Admin Worker owns privileged mutations, full order lookup, payment verification, receipt issuance/download, kitchen and delivery operations.
- D1 bindings should be environment-specific; use **local D1** for dev/test and versioned migrations.
- Hugo's `public/` is the static build output; do **not** commit it or confuse it with the public Worker API source.
- Cloudflare Workers Static Assets config should point to the actual Hugo output. Route API requests through Worker handlers (check `assets.run_worker_first` or equivalent) rather than letting static assets swallow API routes.
- Prefer `wrangler.jsonc` for new Workers config unless repo already standardizes on another supported format.
- A separate admin Worker is protected by Cloudflare Access at the **Worker level** if supported by deployment configuration; test custom-domain, `workers.dev` and preview access.
- Never trust a client-side flag, UI hiding or bare email header for authorization. Validate signed Access identity and application-specific permissions.
- Any data shared across workers must use controlled bindings with minimal privilege.

## Money and menu source of truth

- **Never trust client-submitted unit prices or totals.** The backend derives amounts from validated product IDs, quantities and authoritative catalogue data.
- Use **integer pesewas** (`GHS` minor units) for financial arithmetic and persistence.
- Treat standard package contents, eligible add-ons, add-on limits and add-on prices as authoritative catalogue data. The backend must validate add-on eligibility and recalculate each configured package.
- Ensure Hugo-rendered menu and server-side catalogue cannot silently diverge. Prefer a shared source-of-truth or generated artefact that both consumers use.
- Store a snapshot of the item names and prices at checkout so later menu updates do not rewrite past orders.
- Delivery fees must be calculated using explicitly configured areas/rules, not guessed.

## Order state machine

Use explicit internal statuses:

```text
pending_payment
payment_review
confirmed
preparing
out_for_delivery
delivered
cancelled
refunded
```

- Customers may only create orders and view restricted tracking results.
- Payment review is **not** payment verification.
- Confirmation requires a staff-verified real MoMo transaction, expected amount check and server-side authorization.
- Status updates follow valid transitions; record actor, timestamp, previous state, new state and reason.
- Only confirmed orders count toward finalized kitchen preparation quantities.
- Cancellations, refunds and edits to paid orders require deliberate auditable workflows.

## Data model guidance

Plan tables for `orders`, `order_items`, `payments`, `receipts`, `order_events`; add `products` and `business_settings` when dynamic admin editing is implemented.

- IDs: internal cryptographic UUID/opaque ID and separate short, collision-resistant customer order code.
- Phone numbers: normalized E.164 format, used as a second tracking factor and for WhatsApp handoff.
- Money: integer pesewas.
- Timestamps: UTC in storage; render business-local Ghana time in UI.
- Receipts: unique Receipt ID, associated verified payment, immutable JSON snapshot and issued timestamp.
- Use D1 parameterized queries, unique constraints, indices and safe atomic/idempotent updates.
- Protect delivery addresses and full contact details from public tracking responses.
- Avoid retaining unnecessary private information indefinitely.

## API safeguards

- Validate runtime input using a schema library or equivalent explicit checks; TypeScript types alone are insufficient.
- Sanitize/encode displayed text and WhatsApp message parameters (`encodeURIComponent`).
- Limit body size, quantity, item count and text length.
- Rate-limit order creation and tracking to mitigate abuse/enumeration.
- Recalculate prices server-side and reject disabled products, ineligible add-ons and invalid quantities. Initial public order creation collects only the WhatsApp number and optional order note; delivery details are confirmed later in WhatsApp.
- Ensure the order is saved **before** returning its WhatsApp handoff link.
- Admin endpoints reject unauthenticated or insufficiently authorized requests even when called directly.
- Confirm-payment endpoint must not issue duplicate receipts on retries.
- Never log MoMo secrets, PINs or unnecessary customer details.
- Use production-safe error messages; log diagnostic details only in private logs.

## Receipt rules

- Generate a PDF **only from a verified receipt record**.
- Include logo, Receipt ID, Order ID, issued/verified dates, items, quantity, unit price, totals, delivery date and payment method.
- Render the **original receipt snapshot** on every download; editing a menu item or delivery configuration must not change historical receipt numbers.
- No server-side PDF file storage in MVP.
- Staff manually attach PDF in WhatsApp; click-to-chat text links **cannot** attach binary PDFs.
- Mark receipt as sent only when staff actually performs/confirms the manual action; do not fake delivery acknowledgements.
- QR/receipt verification pages require a genuine backend lookup and a private or unpredictable verification factor. Never treat styling alone as evidence of authenticity.

## Customer experience rules

- Mobile-first and low friction: send users directly to `/` for menu → cart → customer/delivery details → saved order → WhatsApp → payment → status tracking. Do not add a separate marketing homepage unless explicitly requested.
- No customer password, registration or login.
- Display current status accurately; `pending_payment` until staff verifies funds.
- If WhatsApp fails to launch, preserve the order reference and offer a retry/copy path.
- Display expected delivery date as provisional until confirmed.
- Avoid collecting extraneous personal data and expose a clear privacy/consent notice.
- For the public tracker, show only status, permissible dates and generic support actions.

## Testing priorities

At a minimum, test:

1. Three product cards with fixed standard packages, configured prices and eligible add-ons.
2. Quantity increases, removal, clear cart and correct cart totals.
3. Browser refresh/cart persistence with malformed `localStorage` data.
4. Empty cart, invalid phone, long inputs, invalid quantity and unsupported date/area.
5. Browser total tampering cannot affect server-calculated order amount.
6. Duplicate submission behavior and saved-order-first WhatsApp handoff.
7. Tracking rejects wrong second verification detail and leaks no private info.
8. Non-admin cannot call privileged API even with a known order ID.
9. Spoofed headers, alternate Worker URLs and preview routes cannot bypass admin Access.
10. Manual payment confirmation creates exactly one Receipt ID.
11. Repeated PDF downloads produce consistent itemized financial values.
12. Kitchen counts and delivery queue include only relevant confirmed orders.
13. Delivery transitions and audit history are accurate.
14. Responsive design and accessibility on mobile and desktop.

## Scope boundaries / explicit non-goals in MVP

- No Paystack/Stripe/MTN MoMo production API integrations.
- No automatic payment settlement verification or payment prompt initiation.
- No automated PDF sending through WhatsApp/SMS/email.
- No customer account or password subsystem.
- No real-time GPS courier tracking.
- No unnecessary web framework replacement (React etc.).
- No claims that the proposed prices, delivery cutoff or official merchant wallet are final until the business approves them.

## Working style for agents

- **Understand before coding.** Identify current repo state and target behavior.
- **Prefer minimal, reviewable diffs** and preserve existing conventions.
- **Do not fabricate backend completion** when only frontend placeholders exist.
- **Separate demo data from live customer/payment records.**
- **Explain verification honestly.** State which commands/tests ran, what passed, and what remains untested.
- **When unsure about a Cloudflare/Hugo API, consult official docs** and the installed version rather than relying on stale examples.
- **If blocked by client business policy decisions, implement safe placeholders/config validation instead of inventing payment numbers, cutoffs or delivery fees.**

## Next task by default

Unless the user directs otherwise: inspect the working Hugo repository, commit/snapshot a clean baseline if requested, then complete the **single-page customer preorder flow at `/`** with configurable packages, validated WhatsApp number, optional order note and order summary. Name and delivery details are confirmed later in WhatsApp. Do not introduce a separate marketing homepage or checkout route by default. After that, build **public Hono + D1 persistence** and **save-first WhatsApp checkout**. Proceed to admin/Access/payments/receipts only after the public flow is reliable.

## References

- Full specification: [`BREAKFAST_BUDDY_PROJECT_PLAN.md`](./BREAKFAST_BUDDY_PROJECT_PLAN.md)
- Hugo: https://gohugo.io/documentation/
- Cloudflare Workers Static Assets: https://developers.cloudflare.com/workers/static-assets/
- Wrangler: https://developers.cloudflare.com/workers/wrangler/configuration/
- Cloudflare D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- Cloudflare Access: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- Hono: https://hono.dev/
- Tailwind CSS: https://tailwindcss.com/docs/
- pdf-lib: https://pdf-lib.js.org/
