# GastronomiaPizzaApp - Project Context

Last updated: 2026-11-13

## Purpose

GastronomiaPizzaApp is the online ordering application for Gastronomia 3300.

Production website: `https://gastronomia3300.dk`

This document preserves project context, completed work, important decisions,
operational procedures, known risks, and the agreed roadmap. Update it whenever
a meaningful feature is implemented, verified, pushed, or merged. Record
these stages separately; do not describe a Preview feature as Production-ready.

The repository remains the technical source of truth. Verify exact file names,
routes, database objects, environment variables, and script behavior in the
repository before making changes.

## Technology Stack

- Next.js
- React
- TypeScript
- Supabase Authentication and Postgres
- Nets Easy payments
- Vercel Preview and Production deployments
- Danish and English localization for customer-facing pages
- `lucide-react` and `react-icons`

## Environment Separation

Preview and Production are separate operational environments. Do not mix their:

- Supabase projects or credentials
- OAuth callback and redirect URLs
- Vercel environment variables
- Nets test and live credentials
- admin accounts or role changes
- order, payment, or operational-alert data

Never commit environment-variable values, OAuth secrets, service-role keys,
payment credentials, webhook authorization values, or real customer data.

## Product Scope

The application supports:

- Customer menu browsing and product modifiers
- Shopping cart and checkout
- Pickup and delivery
- ASAP and scheduled orders
- Guest and authenticated ordering
- Online card and MobilePay payment flows where configured
- Customer accounts, profiles, OAuth, and password recovery
- Customer order pages and email notifications
- Danish and English customer-facing pages
- Admin order handling, menu availability, and opening hours
- Admin accounting reports
- Private order feedback and public aggregate ratings
- Operational monitoring and restaurant fallback notifications
- Legal and informational pages

## Completed Work Summary

The following features have been implemented or corrected:

- Main customer ordering flow
- Guest and authenticated checkout
- Pickup, delivery, ASAP, and scheduled ordering
- Nets payment integration
- Customer account, profile, password recovery, Google OAuth, and Facebook OAuth
- Customer and restaurant order emails
- Admin order management
- Menu availability and opening-hours management
- Danish and English customer localization
- Legal and informational pages
- Curated Most Ordered menu section
- Private order feedback and public aggregate ratings
- Order-loss prevention and durable operational alerts
- Admin accounting report (original summary version merged into `main`)
- Admin orders pagination, detailed accounting and optional A4 confirmation printing
  (implemented on `feature/admin-orders-report-a4`; NOT merged into `main`)
- Admin portal isolation deployed to Production
- OAuth profile continuity and paid-order fallback deployed to Production
- Icon-based admin Store Status control deployed to Production
- English public-rating threshold messages
- Removal of customer comments from the compact admin order list only
- Menu category icon and translation-key corrections
- Production menu price corrections completed on 2026-08-27
- Discount campaigns and discounted checkout implemented on `feature/discount-campaigns`; Preview testing in progress, not merged or deployed to Production

Before changing any completed area, inspect the current code and verify existing behavior.

## Current Branch and Deployment State

### Latest work (2026-11-13): feature/admin-orders-report-a4, not merged

**Authoritative status from the last shared Git output:**

- Local branch and upstream: `feature/admin-orders-report-a4` and
  `origin/feature/admin-orders-report-a4`.
- Most recent confirmed pushed commit: `60d8bb7` (`fix(admin): align A4
  screen and print layouts`). The preceding confirmed commits are `11d0305`
  (`fix(admin): support multi-page A4 order printing`) and `0c5b61e`
  (`feat(admin): add optional A4 order confirmation printing`).
- At that checkpoint Git reported a clean, synchronized working tree.
- Later, **two local uncommitted changes** were made to the accounting report:
  `app/(admin)/admin/accounting-report/page.tsx` and
  `app/(admin)/admin/accounting-report/accounting-report.module.css`.
  TypeScript, diff whitespace checks, and a Next.js production build passed;
  the last shown `git status -sb` indicated both modified files.
- Commands to commit and push these accounting changes were proposed, but **no
  subsequent terminal output confirms their execution**. Re-check Git before
  claiming they have been pushed or are present in Vercel Preview.
- The A4 feature was confirmed working in Vercel Preview, including a long order
  displayed as two sheets in screen and browser Print Preview. The newest
  accounting-summary/detail toggle was verified **locally** only in the shared
  evidence; a newer Vercel Preview verification is still needed after push.
- **No merge into `main` and no Production deployment of this feature branch
  has been reported.** Avoid Production changes without explicit approval.

The full feature design, file paths, print rules, test cases, and rollout steps
are documented below in **Section 8**.

### Main

Admin accounting, admin portal isolation, the registration-profile conflict fix, the admin Store Status control, the admin receipt improvements, the collapsible accounting report, the pending-order alert reliability fix, compact receipt typography, and the admin alarm sound selector have been merged into main.

The dedicated Production administrator has been verified. The previous account's
admin role was revoked on 2026-09-04, and a clean-session access test confirmed
that it can no longer reach `/admin/...` routes. The previous authentication
account was retained without administrator privileges.

The first real Production payment and restaurant-order lifecycle was also verified
on 2026-09-04 without unresolved operational alerts.

### Admin store status

Branch: `feature/admin-store-status` (merged)

Completed verification:

- Dedicated icon-based Store Status control implemented in the admin header
- Pickup and delivery status sourced from `/api/store/service-status`
- Compact status popover linked to `/admin/opening-hours`
- Distinct monitor-and-settings administrator identity indicator
- Desktop, mobile, Light mode, and Dark mode verified
- `git diff --check` passed
- ESLint passed
- TypeScript passed with `npx tsc --noEmit`
- Next.js production build passed
- Preview and Production deployments reached Ready
- Production smoke test passed with the dedicated administrator

### Admin order receipt visibility

Branch: `fix/order-receipt-print-visibility` (merged)

Completed verification:

- Customer comments moved directly below the order header and before order items.
- Comments use a prominent double border on screen and a high-contrast black double border in print.
- The print-only border around the order header was removed while preserving the bordered pickup/delivery badge.
- Requested-time values print on a separate centered line beneath a left-aligned label and separator.
- Previous-order counts are visible in both the admin detail view and its printed receipt.
- Guest order history falls back to normalized email and then phone when no authenticated user ID exists.
- Previous-order counts remain absent from public customer receipts.
- Desktop receipt and browser Print Preview were verified.
- `git diff --check`, ESLint, TypeScript, and the Next.js production build passed.
- Preview and Production deployments reached Ready.
- The Production admin receipt and customer-comment print layout passed the smoke test.

### Collapsible accounting report

Branch: `feature/collapsible-accounting-report` (merged)

Completed verification:

- The accounting-report controls are collapsed by default on the admin orders page.
- A compact button opens and closes the existing date-range form.
- Selected dates remain available after closing and reopening the panel.
- Report generation continues to use the existing accounting page and API.
- The disclosure exposes its state through `aria-expanded` and `aria-controls`.
- Desktop, mobile, Light mode, Dark mode, and report generation were verified.
- `git diff --check`, ESLint, TypeScript, and the Next.js production build passed.
- Preview and Production deployments reached Ready.
- The Production accounting disclosure and report generation passed the smoke test.

### Admin pending-order alert reliability

Branch: `fix/admin-order-alert-on-receipt` (merged)

Completed verification:

- The global admin watcher checks pending orders every five seconds and through Supabase Realtime.
- Accepted-order receipt pages no longer suppress navigation to the new-order alarm page.
- Pending orders can interrupt ordinary admin pages and open `/admin/new-order`.
- Active new-order and select-time workflows remain protected from automatic navigation.
- A header notification control manages the browser's one-time notification permission and provides an alarm test.
- The watcher requests both an in-app alarm and a persistent system notification before redirecting.
- A shared Web Audio alarm engine remains available across internal admin navigation.
- The first ordinary pointer or keyboard interaction prepares audio without requiring a dedicated daily activation step.
- The new-order page uses the shared alarm and repeats it every five seconds.
- Duplicate alarm requests within 1.5 seconds are suppressed.
- A full browser reload can still require one ordinary page interaction before custom audio is allowed by browser autoplay rules.
- System notifications and restaurant email alerts remain independent fallback channels.
- Payment, order creation, pending-order lookup, and restaurant email logic are unchanged.
- Cross-page redirects were verified in Preview from order, receipt, menu, and opening-hours pages.
- `git diff --check`, ESLint, TypeScript, and the Next.js production build passed.
- The Production deployment reached Ready.
- The Production administrator enabled notifications and verified both the custom alarm and system test notification.
- Verification with the next real Production order remains pending.

### Admin alarm sound selector

Branch: `feature/admin-alarm-sound-selector` (merged)

Completed verification:

- The green notification bell opens a compact alarm-sound selector.
- Klassisk, Køkkenklokke, Digital, Telefon, and Haster sounds are available.
- Selecting a sound plays an immediate preview and stores the choice on the current computer.
- The watcher and repeating new-order alarm automatically use the selected sound.
- No database or API change is required.
- Desktop, refresh persistence, repeating playback, and the 370px mobile layout were verified locally.
- `git diff --check`, ESLint, TypeScript, and the Next.js production build passed.
- Merged into main through PR #49.

### Orders and order-items RLS hardening

Branch: `fix/orders-order-items-rls`

Status at the time of this update:

- Added migration `20260926000000_secure_orders_and_order_items.sql`.
- Enabled Row-Level Security on `public.orders` and `public.order_items`.
- Removed the legacy direct customer INSERT and SELECT policies from `orders`.
- Revoked all direct `anon` access to both tables.
- Revoked direct `authenticated` access to `order_items`.
- Retained authenticated SELECT on `orders` only for the administrator's Supabase Realtime subscription.
- The administrator policy trusts only `auth.jwt().app_metadata.role = 'admin'`.
- Existing server-side APIs and payment webhooks continue using `service_role`.
- No application code or environment-variable change was required.
- The migration was applied successfully to Production.
- Supabase Security Advisor errors decreased from three to zero.
- The Production admin order list and an existing order receipt passed the smoke test.
- Verification with the next real Production order remains pending.

### Discount campaigns and checkout discounts (Preview only)

Branch: `feature/discount-campaigns` (NOT merged to `main`)

Status as of 2026-10-16:

- Initial complete feature committed and pushed on the feature branch as `902f312`.
- Vercel Preview deployment for that commit reached Ready.
- Both discount migrations were applied **only** to the Supabase Preview database
  through the Preview SQL Editor and manually registered in
  `supabase_migrations.schema_migrations`.
- A complete Nets **Test** card payment and authenticated charge webhook were
  exercised in Vercel Preview. The discounted order was persisted, shown on the
  customer order detail, accepted by the administrator, and shown in the admin
  receipt and 58 mm browser print preview.
- The follow-up new-order card breakdown and print-label changes are currently
  **local, uncommitted and not yet deployed to Preview**. TypeScript and
  `git diff --check` passed; browser retesting remains pending.
- No changes from this feature have been merged into `main` or applied to
  Production.

#### Database migrations and security

- `supabase/migrations/20261014000000_add_discount_campaigns.sql` creates
  `public.discount_campaigns`, with unique uppercase code, percentage (1–100),
  active flag, optional Copenhagen date range, and RLS enabled without public
  access policies. It also adds order snapshot references and amounts.
- `supabase/migrations/20261016000000_add_order_discount_percent.sql` adds
  `orders.discount_percent` with a 1–100 check, preserving the historical
  percentage independently of later campaign edits.
- `orders` records `discount_campaign_id`, `discount_code`,
  `discount_percent`, and `discount_amount` at the time of payment confirmation.
- Migrations were applied and registered in **Supabase Preview only**.
- The local Supabase CLI is still linked to the **Production** project: do not
  run `supabase db push`, `migration repair`, or other mutating CLI commands
  until project linking has been explicitly confirmed and corrected.

#### Business rules and implementation

- Admin campaign management: `app/(admin)/admin/discount-campaigns/page.tsx`,
  `app/api/admin/discount-campaigns/route.ts`, and its `[id]/route.ts`; linked
  as `Rabatkampagner` from the admin header.
- Campaign windows use Copenhagen-local dates and DST-safe handling in
  `lib/time/discountCampaignDates.ts`.
- `lib/discounts/validateDiscount.ts` verifies code, campaign status, dates,
  and percentage. Discount applies to the products-and-extras subtotal only;
  fees are excluded. Discount amount uses `Math.round(subtotal * percent / 100)`.
- Checkout preview: `app/api/discounts/preview/route.ts` and
  `app/(shop)/checkout/page.tsx`. Applied discount is invalidated when the cart
  changes; Danish/English checkout strings are maintained separately.
- Server checkout pricing: `lib/orders/prepareCheckout.ts`. Minimum **delivery**
  order total is 170 DKK **after** discount, configured in
  `lib/orders/constants.ts`. Pickup does not use that delivery minimum.
- Nets payment creation includes a negative discount order line and charges
  the final discounted total. The webhook validates currency, payment identity,
  amount, checkout-session arithmetic, and existing idempotency before storing
  the order's discount snapshot.
- Customer `View Order` and administrator accepted-order detail/print use
  `components/OrderReceipt.tsx`. Compact profile order-history rows intentionally
  remain unchanged; full discount details appear in `View Order`.

#### Follow-up UI changes awaiting commit and Preview verification

Files changed locally:

- `app/(admin)/admin/new-order/detail/page.tsx` adds order financial fields
  and an item-level summary below the products: `Varer i alt`, optional
  `Rabat (N%)` and negative amount, optional bag/delivery fees, service fee,
  and final `I alt`. The final total remains in the card header as well.
- `app/(admin)/admin/new-order/detail/detail.module.css` styles this compact
  breakdown without changing the item list or restaurant print layout.
- `components/OrderReceipt.tsx` replaces the hard-coded **print-only** English
  `Discount` label with Danish `Rabat` in the 58 mm printed totals.

The admin new-order page fetches from `/api/admin/orders`, which selects order
columns with `*`. It displays stored order amounts rather than recalculating
campaign discounts. Do not change payment calculations to implement the UI.

#### Remaining verification before merge

1. Add and review this documentation update with the three local UI files.
2. Run `npx tsc --noEmit` and `git diff --check` after all edits.
3. Commit and push to `feature/discount-campaigns` only; wait for Vercel
   Preview to reach Ready.
4. Verify the financial breakdown on a **new pending** discounted order in
   Vercel Preview. An already accepted order cannot be used to revisit the
   pending-order card.
5. Verify the Danish `Rabat` line in the 58 mm browser print preview.
6. Verify the stored discount snapshot and final-total arithmetic using the
   **Preview** SQL Editor. Do not expose private order/customer information in
   documentation or source control.
7. Review remaining functional tests and environment separation before any
   explicitly approved merge/Production rollout.

## Security and Privacy Rules

### Authorization

- UI visibility is never sufficient authorization.
- Admin pages and APIs must enforce the admin role server-side.
- The trusted admin role is `user.app_metadata.role === "admin"`.
- Do not authorize admin access from client-controlled `user_metadata`.
- Supabase RLS must protect private tables where applicable.
- Service-role credentials must remain server-only.

### Customer data

Customer orders, profiles, addresses, messages, feedback, and replies are private.

Do not place real customer data in:

- source control
- fixtures
- screenshots committed to the repository
- operational-alert context
- application logs unless strictly necessary and appropriately protected
- this document

### Payment data

- Never store or log card credentials.
- Do not treat a browser redirect as proof of payment.
- Only authenticated and validated Nets events may confirm a charge.
- Webhook processing must remain idempotent.
- Always check whether an order already exists before replaying a webhook or
  manually recovering an order.

---

## 1. Order-Loss Prevention and Error Monitoring - Implemented

Branch: `feature/order-monitoring`

Status: verified in Preview on 2026-08-26, then merged, deployed, and verified
in Production on 2026-08-27.

### Coverage

The monitoring system covers:

- Payment creation and payment-total failures
- Authenticated Nets webhook validation failures
- Persistence of a verified payment before restaurant-order creation
- Paid checkout sessions without a corresponding order
- Order creation and checkout-finalization failures
- Duplicate webhook delivery without duplicate order creation
- Refund request, webhook, and persistence failures
- Admin order lookup and update failures
- Failed customer received, accepted, and rejected emails
- Paid orders remaining pending beyond the accepted threshold
- Immediate restaurant fallback email for each new paid order

Customer emails remain separate from restaurant notifications:

- Order received
- Order accepted
- Order rejected

### Database

Migration:

`supabase/migrations/20260825000000_add_operational_alerts.sql`

It adds:

- `public.operational_alerts`
- indexes for unresolved alerts, checkout sessions, and orders
- RLS without anon or authenticated access policies
- restaurant notification claim and sent timestamps on `public.orders`

Operational alerts are accessed only by trusted server-side code using the
Supabase service role.

Alert context must not contain personal data, payment credentials, secrets,
tokens, cookies, or complete webhook payloads.

### Restaurant email configuration

Server-only variables:

- `RESTAURANT_ALERT_EMAIL`
- `RESEND_API_KEY`
- `EMAIL_FROM`

Configure them separately in Preview and Production. Never document their values.

Database claim and sent timestamps prevent normal concurrent or duplicate
webhook processing from sending repeated restaurant notifications.

### Pending-order monitoring

The authenticated admin watcher checks for pending paid orders.

When an order remains pending beyond the configured operational threshold:

- a durable critical alert is recorded
- one restaurant notification is sent for that alert
- repeated polling does not repeatedly send the same alert
- accepting or rejecting the order resolves the alert

The immediate new-order email is sent server-side during webhook processing and
does not depend on the admin browser watcher.

### Operational recovery

When a critical payment or order alert is received:

1. Find the unresolved row in `public.operational_alerts`.
2. Use its `order_id` and `checkout_session_id` to inspect related records.
3. Verify the payment directly in Nets Easy.
4. Check whether an order already exists.
5. Confirm the webhook URL and authorization configuration.
6. Do not replay a webhook until idempotency and the existing checkout-session
   relationship have been checked.
7. For email failures, verify the relevant server-only email configuration and
   inspect `notification_error`.
8. Handle pending orders through the normal admin flow so their alerts resolve.
9. Mark historical alerts resolved rather than deleting them, preserving the
   audit history.

### Known limitation

There is no independent scheduled reconciliation job. The immediate restaurant
notification is server-side, but delayed pending-order escalation depends on the
authenticated admin watcher. Consider a scheduled reconciliation job if monitoring
must operate independently of an open admin browser.

---

## 2. Most Ordered Menu Section - Implemented

Branch: `feature/most-ordered`

Status: merged, deployed, and verified in Production on 2026-08-27.

### Design

The section is a manually curated restaurant selection, not sales analytics.
It resolves stable menu item IDs from the existing menu data, so product names,
prices, images, modifiers, translations, and availability remain sourced from one
place.

The configured item order controls presentation. Invalid or removed IDs must fail
safely and remain detectable during development.

Current curated item order:

`[3, 8, 16, 20, 47, 60, 200, 201]`

### Behavior

- Appears above standard menu categories
- Horizontal scrolling on mobile
- Desktop navigation controls where appropriate
- Localized `See all / Vis alle` and `Show less / Vis mindre`
- Expanded full-width grid
- Existing item modal and add-to-cart behavior
- Existing sold-out rules
- Danish and English UI

---

## 3. Private Order Feedback and Public Rating - Implemented

Branch: `feature/private-order-feedback`

Status: merged, deployed, and verified in Production on 2026-08-30.

### Eligibility

- Only completed orders are eligible.
- Feedback may be submitted for seven days after `completed_at`.
- Each order may create only one integer rating from 1 to 5.
- The customer cannot edit the submitted rating or private message.
- Submitted feedback and an admin reply remain viewable after the submission
  window closes.
- Public-name consent can be withdrawn independently.

### Customer experience

The dedicated feedback page contains:

- required 1-to-5 star rating
- optional private message to the restaurant
- optional consent to display the customer's first name and rating publicly
- Danish and English moderation guidance
- a secondary link to the complete order page

The written message is always private. There is no public written-review field in
the MVP.

### Public rating

The public response may expose only approved aggregate data and consented first
names with star ratings.

It must never expose:

- customer or order identifiers
- surnames
- email addresses
- private messages
- admin replies
- internal metadata

The public aggregate and consented names are displayed only after at least five
eligible ratings exist. English threshold messages are present in
`messages/en.json`.

### Admin experience

An authorized admin can:

- identify orders with new feedback
- view ratings and private messages
- remove an inappropriate private message without rewriting it
- preserve moderation time and responsible admin identity
- send one private reply
- see whether the feedback has been answered

Admin authorization is enforced server-side.

### Notifications

- Customer feedback invitation is scheduled after completion.
- The default delay is three hours.
- `FEEDBACK_INVITATION_DELAY_HOURS` can configure the server-side delay.
- Restaurant notification is sent for new feedback.
- Customer notification is sent for the one admin reply.
- Claims and sent timestamps prevent normal duplicate notifications.

Migration:

`supabase/migrations/20260829000000_schedule_feedback_invitations.sql`

### Guest-order authorization

Guest and authenticated feedback use the existing high-entropy order
`public_token`. Predictable order IDs, email addresses, or client-provided customer
identity must never authorize access.

---

## 4. Admin Accounting Report - Implemented

Branch: `feature/admin-accounting-report`

Status: merged and deployed.

### Purpose

Allow an authorized admin to create a financial summary for a selected date range
without exposing the report publicly.

### Main implementation

- Page: `app/(admin)/admin/accounting-report/`
- API: `app/api/admin/accounting-report/route.ts`
- Copenhagen date-range utilities: `lib/time/copenhagenDateRange.ts`
- Entry form on the admin orders page

### Behavior

- Admin selects a start and end date.
- Date boundaries are interpreted in `Europe/Copenhagen`.
- The API enforces the admin role server-side.
- The report summarizes order count, gross sales, completed refunds, and net sales.
- It includes payment-method, refund-status, and order-status breakdowns.
- Orders requiring accounting attention are listed separately.
- Responsive light and dark layouts are supported.
- Browser print styles produce a compact printable report suitable for saving as
  PDF.

Browser-generated page URL, date, and page-number headers and footers are controlled
by the browser print dialog. They are not HTML or CSS elements in the application.
Disable `Headers and footers` in the browser print dialog when a clean PDF is
required.

No database migration or new secret is required for this feature.

---

## 5. Admin Portal Isolation - Production Verified

Branch: `feature/admin-portal-isolation`

### Goal

Keep restaurant administration separate from the customer storefront while
preserving secure authentication, order monitoring, payment recovery, and password
reset behavior.

### Route and layout separation

- Admin pages live under the `(admin)` route group while retaining `/admin/...`
  public paths.
- Customer pages remain under the `(shop)` route group.
- The admin layout uses a dedicated `AdminHeader`.
- Customer Header, Footer, cart bar, and customer navigation are not rendered in
  the admin portal.
- Admin order monitoring remains available in the admin environment.
- Customer cart providers remain scoped to customer pages where required.

### Admin interface

- Dedicated desktop navigation for orders, menu management, and opening hours
- Responsive mobile hamburger navigation
- Theme control and logout
- Distinct monitor-and-settings administrator identity indicator
- Icon-based Store Status control with separate pickup and delivery details
- Danish-only admin UI; the customer storefront remains Danish and English
- Customer comments removed from the compact admin orders list
- Customer comments remain available in the detailed order view and printable
  order view

### Admin Store Status control

- `components/AdminStoreStatus.tsx` provides an admin-specific visual treatment.
- The control uses the existing `/api/store/service-status` endpoint and does not
  duplicate server-side opening-hours business rules.
- The indicator refreshes every 30 seconds and when the browser regains focus or
  becomes visible.
- Its compact popover shows pickup and delivery independently.
- The management link opens `/admin/opening-hours`.
- Loading and unavailable states remain visible without exposing internal errors.
- The public Store Status badge and admin control have separate presentation
  components while sharing the same source of truth.

### Authentication and routing

- Admin layout performs a server-side user and role check.
- Unauthenticated admin requests redirect to `/auth`.
- Authenticated non-admin users cannot access admin pages.
- Password login returns a role-aware destination.
- OAuth callback returns admins to `/admin/orders` and customers to customer pages.
- Password-reset callback keeps `/auth/reset-password` as its destination.
- Session refresh remains handled through `proxy.ts`.
- Customer Header no longer exposes admin navigation.

### Admin provisioning

- The public `app/api/auth/admin-register/route.ts` endpoint was removed.
- Admin roles are managed through the server-side
  `scripts/manage-admin-role.mjs` maintenance script.
- The script must use the intended environment's Supabase URL and service-role key.
- It displays the target project, account, current role, and requested action before
  requiring explicit confirmation.
- Preview and Production role changes must be performed independently.
- Never grant admin through `user_metadata` or a public registration endpoint.

### OAuth profile continuity

The OAuth callback creates the initial `profiles` row for a non-admin OAuth user
when it does not already exist. The operation is idempotent and does not overwrite
an existing profile.

This prevents authenticated OAuth customers from reaching checkout without the
profile row required by the order relationship.

Password registration also uses an idempotent `profiles` upsert. This allows
registration to work both when an environment has an existing `auth.users`
profile trigger and when profile creation is handled only by the application.

### Paid-order resilience

The Nets charge webhook also handles a missing OAuth profile defensively:

1. It attempts an idempotent profile insert from the stored checkout identity.
2. If the profile association still cannot be created, it records an operational
   warning.
3. It creates the paid restaurant order without the optional user association
   rather than losing an already-paid order.
4. Existing checkout-session uniqueness continues to prevent duplicate orders.

The payment remains the source of truth for payment status. This fallback must not
bypass charge, amount, currency, payment ID, authorization, or idempotency checks.

### Preview OAuth configuration

Supabase Preview must allow:

- the local callback URL
- the relevant Preview deployment callback pattern

A wildcard may be used for the project's Vercel Preview deployment callback URLs.
Production should use its exact production callback URL.

Supabase `Site URL` and redirect allowlists are environment configuration, not
source code.

### Vercel Preview protection and webhooks

Vercel Preview Deployment Protection can reject external webhooks with HTTP 401.
For Preview only, the payment creation flow adds the configured automation-bypass
secret to the webhook URL when both of these conditions are true:

- `VERCEL_ENV === "preview"`
- `VERCEL_AUTOMATION_BYPASS_SECRET` is configured

Never print or document the bypass-secret value. A manual replay that omits the
bypass parameter may be rejected even when the original Nets webhook can succeed.

### Preview verification completed

The following end-to-end behavior was verified:

- First Google OAuth login completed in one attempt after redirect configuration.
- Customer session and user icon updated correctly.
- Store-status badges stayed consistent before and after login.
- OAuth customer received a profile row.
- A previously paid checkout was recovered by an authenticated Nets retry.
- The checkout became completed and created exactly one order.
- Customer and restaurant received their new-order emails.
- A fresh paid order was created normally after the fix.
- The cart was cleared after successful payment.
- The admin saw and accepted the order.
- The customer received the accepted-order email.
- The admin marked the order delivered.
- The Preview unresolved operational-alert query returned no rows after historical
  test warnings were reviewed and marked resolved.

### Production rollout record

The administrator access migration was completed on 2026-09-04.

Completed verification:

- Admin-isolation changes were merged and the Production deployment reached Ready.
- The dedicated Production administrator received the trusted
  `app_metadata.role === "admin"` role.
- Password login routes the dedicated administrator directly to `/admin/orders`.
- Customer storefront chrome is absent from admin pages.
- Orders, menu management, opening hours, feedback, and accounting pages were
  smoke-tested with the dedicated administrator.
- Authenticated administrators are redirected away from customer-only pages.
- The previous account's admin role was revoked without deleting the
  authentication account.
- A clean-session test confirmed that the previous account is redirected away
  from `/admin/...` routes.
- A clean-session test confirmed that the dedicated administrator retains access
  to the admin portal.

### First real Production order verification

A real Production order completed the full lifecycle on 2026-09-04.

Verified behavior:

- MobilePay payment and charge identifiers were persisted.
- The restaurant order was created immediately after payment confirmation.
- All order items were present.
- The calculated subtotal matched the stored subtotal.
- Fees and final total matched exactly.
- Customer confirmation and restaurant notification emails were accepted.
- The administrator accepted and completed the order.
- The accepted-order email was accepted.
- The feedback invitation was scheduled three hours after completion.
- The Resend dashboard confirmed all three customer lifecycle emails.
- The order-specific unresolved operational-alert query returned no rows.
- The global Production unresolved operational-alert query returned no rows.

---

## 6. Structured Menu Allergens - Deferred

Suggested branch: `feature/menu-allergens`

### Business rule

Allergen values must come from the restaurant's verified recipes, ingredient
labels, and preparation process. Never infer allergens from names, descriptions,
common recipes, images, or similar products.

Cross-contamination information must come from the restaurant's actual kitchen
process.

### Expected behavior

- Structured, language-independent allergen identifiers
- Danish and English labels
- Display before purchase, including the item modal
- Existing product prices, modifiers, and availability preserved
- Missing allergen data remains distinguishable from an explicit "contains no allergens" declaration.

Production values must not be entered until the restaurant supplies verified data.

---

## 7. Printer Integration - Deferred

Suggested branch: `feature/order-printing`

Printer work remains paused until the restaurant selects the hardware.

Confirm before implementation:

1. Printer model and documentation
2. Paper width
3. Connection method
4. ESC/POS or other protocol support
5. Character encoding and Danish characters
6. Logo/image support
7. Auto-cut support
8. Cash-drawer requirements
9. Restaurant device and browser restrictions
10. Whether automatic printing requires a local bridge

Do not design a final receipt around an assumed paper width. Keep receipt data
separate from printer-specific layout and transport.

## 8. Admin Orders, Detailed Accounting and Optional A4 Printing - Feature Branch

**As of 2026-11-13.** Branch: `feature/admin-orders-report-a4`.
Status: implemented and locally tested; A4 pushed and Preview-verified;
latest accounting view-mode improvements locally verified and pending
confirmed commit/push/Preview test. **NOT merged to `main` or Production.**

### Scope and boundaries

Three related admin enhancements were developed together:

1. **All orders and pagination** on `/admin/orders`. An `Alle` filter includes
   the full order history rather than just a short recent list. The UI is
   paginated in groups of 20, with navigation and totals/counts. The existing
   admin order-processing flow must remain intact.
2. **Detailed accounting report** on `/admin/accounting-report`, retaining
   financial summary groups while adding per-order rows and payment-method
   filtering. Its later view-mode refinement makes `Oversigt` the default and
   shows the full order table only after `Vis detaljer` is selected.
3. **Optional A4 order confirmation** for accepted orders, separate from the
   existing 58 mm thermal/kitchen receipt. A4 is deliberately an additional
   action, not a replacement for or change to automatic printing on acceptance.

Do not modify payment capture, refund accounting, order creation, Nets webhook,
RLS, Supabase migrations, live customer data, or the original 58 mm print
layout merely to implement these display/reporting features. No new database
migration or environment secret was reported for this feature work.

### All-orders pagination

- Admin page: `app/(admin)/admin/orders/page.tsx` (verify current structure in
  repository before changing); admin data route:
  `app/api/admin/orders/paginated`.
- An `Alle` filter exposes historical orders; pages show 20 orders at a time.
- Admin order count and total amounts should follow the appropriate filtered
  dataset. Prev/next navigation must work at boundaries and preserve filters.
- The branch implementation was discussed as completed, but the latest
  conversation did **not** include a fresh end-to-end pagination test in
  Vercel Preview. Treat that final UI smoke test as outstanding until confirmed.

### Detailed accounting: data and existing reporting sections

Relevant files:

- `app/(admin)/admin/accounting-report/page.tsx`
- `app/(admin)/admin/accounting-report/accounting-report.module.css`
- `app/api/admin/accounting-report/route.ts` (existing source; do not change
  calculations for the view toggle)
- `lib/time/copenhagenDateRange.ts` (date boundaries)

The report remains admin-protected and date-range-based, using Copenhagen-local
boundaries. It retains `Antal ordrer`, `Bruttoomsætning`, `Gennemført refund`,
`Nettoomsætning`, `Betalingsmetoder`, `Refundoversigt`, `Ordrestatus`, and
conditional `Ordrer der kræver opmærksomhed` sections. Per-order detail rows
include order ID, date/time, status, payment method, gross amount, refund,
and net amount. Existing detail payment filters are `Alle`, `MobilePay`,
`Betalingskort`, and `Andre`. The existing filter is held in `paymentFilter`,
and `filteredOrderDetails` and `detailTotals` derive data from the fetched
report. Values are reported in Danish kroner and already supplied minor units.

**2026-11-13 view-mode refinement:**

- Added `const [showDetails, setShowDetails] = useState(false)` in the report
  page. This initializes the UI in **summary-only** mode.
- Added a toolbar button toggling `Vis detaljer` and `Skjul detaljer`, with
  `aria-expanded={showDetails}`. At the time of testing it reused
  `styles.printButton`; dedicated button styling was not a prerequisite.
- Wrapped **only** the `Ordredetaljer` section (including the payment filter,
  per-order table and total row) in `{showDetails && (...)}`. Do **not** wrap
  the `Betalingsmetoder`, refund summary, status breakdown, or attention orders
  sections in this condition.
- The button that already calls `window.print()` retains its label
  `Udskriv / Gem som PDF`. Browser print preview uses the current React
  document: summary view prints without the detail table; detailed view prints
  the summary plus that table. `Save as PDF` is chosen through the browser
  destination; a separate server-generated PDF/download mechanism was neither
  implemented nor required. Browser `Headers and footers` may be disabled for
  a clean PDF. A separate PDF save/reopen test is not recorded.
- The chosen detail payment filter may narrow rows and the detail subtotal.
  It must not silently recalculate the independent overall summary numbers.
- `showDetails` is state-only: no report API or financial arithmetic changes.

### Multi-page accounting print and repeated-total fix

Chrome may repeat a semantic `<tfoot>` at the end of **every printed page**
for a multi-page HTML table. The report's `Ordredetaljer` table contained
its `I alt` row inside `<tfoot>`, so the total appeared both on page one and
at the true end of the table on page two. The correct intended behavior is:

- `<thead>` repeats on continued pages for legible column headings.
- `I alt` appears **once**, after the final order in the final table page.
- Refunds and financial totals remain untouched; do not duplicate/suppress
  the summary section's separate legitimate totals.

In the final `@media print` block in the accounting CSS, immediately following
`.table thead { display: table-header-group; }`, added:

```css
.table tfoot {
    display: table-row-group;
}
```

This changes only footer pagination behavior, not the underlying totals.
The CSS already specifies A4 portrait with `@page { size: A4 portrait;
margin: 12mm; }`, repeats table headers, avoids splitting table rows,
hides toolbar controls in print and prints only the report content. Two
print media sections exist in that module; inspect both before adjustments.

### Detailed accounting print tests completed locally

Browser: Chrome, local `/admin/accounting-report`.

**October 2026 test:** date range `2026-10-01` to `2026-10-31`.

- 4 orders; `Brutto` 498.00 DKK, completed refunds 0.00 DKK and `Netto`
  498.00 DKK in the observed local test data.
- `Oversigt` generated one A4 page with summary sections and no
  `Ordredetaljer` table.
- `Detaljeret` generated one A4 page with the summary plus four individual
  rows, payment method and one correct final total.

**Long-range test:** date range `2026-05-01` to `2026-11-13`.

- 27 orders, gross `8.855,00 kr.`, completed refunds `201,00 kr.`,
  net `8.654,00 kr.` in test data. These are **test observations**, not
  permanent financial figures or Production accounts.
- Summary-only print rendered in **one A4 page**.
- Detailed print rendered in **two A4 pages**, retaining the summary,
  per-order rows, repeated table headings on page two, and the attention
  orders table.
- Before the CSS fix Chrome repeated `I alt` on both pages. After applying
  `tfoot { display: table-row-group; }`, screenshots verified the row
  disappeared from page one and appeared **once** at the end of the
  detailed table on page two, with the same correct gross/refund/net totals.
- No missing/cut-off rows or overlapping sections were evident in the
  supplied Chrome previews. Do a separate larger dataset test if many months
  or hundreds of orders become routine; 27 orders do not validate every size.

### Optional A4 accepted-order print: architecture and behavior

Main implementation:

- Route: `/admin/order-accepted/[orderId]/a4`
- Page: `app/(admin)/admin/order-accepted/[orderId]/a4/page.tsx`
- Scoped stylesheet:
  `app/(admin)/admin/order-accepted/[orderId]/a4/a4.module.css`
- Authorized admin data endpoint: `app/api/admin/orders/[id]/route.ts`
- Existing primary 58 mm receipt route and acceptance/automatic printing
  behavior must remain unchanged.

The page is componentized into `A4Header`, `A4Footer`, `A4Items`, `A4Totals`,
and `A4Sheet`. Each visible `A4Sheet` renders a standalone `<article>` with
header, page content, optional first-page customer information, item rows,
optional last-page totals and a bottom-aligned footer. `A4Footer` uses a
React `useId()`-derived SVG clipping ID to prevent collisions across repeated
page flags/graphics. The first page shows the customer information; the last
page shows totals. Header and footer appear on every A4 sheet.

**Pagination:** a separate hidden measurement `A4Sheet` is rendered outside
the viewport, preserving the full item list for DOM measurement. An effect
measures rendered item rows and reserves height for page content, customer
section, totals, fixed header and footer plus safety allowance. It builds
`OrderItem[][]` page groups in `sheets` and renders only those visible
sheets; it must **not** accidentally render another unsplit full copy. The
measurement area is hidden from printing.

**Physical dimensions and CSS:** print has `@page` A4 with 12 mm margins.
An inner document sheet is 186 mm wide by 273 mm tall, representing the
usable printable area. The screen presentation uses an outer 210 x 297 mm
white sheet with 12 mm padding. The hidden measurement sheet keeps the
186 x 273 mm inner layout. The table-row cell padding was unified across
screen/measurement/print with a higher-specificity rule:

```css
.documentPage .itemsTable th,
.documentPage .itemsTable td {
    padding: 8px 7px;
}
```

The layout uses a flex column sheet, expandable content, and bottom-aligned
footer; page breaks are explicit for print. Earlier larger screen-only cell
padding had made the screen render overflow/overlap despite an acceptable
print preview. Equalizing the padding fixed that difference without
increasing the safety allowance to a value that would unnecessarily force
three pages. The final accepted safety allowance was 24 px.

**A4 validation:**

- Short order `#30` with three item rows rendered on **one A4 page**, with
  total `455,00 kr.` in the test data.
- Long order `#32` with **27 rows** split into **two A4 sheets** (observed
  14 + 13 row grouping), including both repeated headers and footers,
  customer data on first page and total `2.415,00 kr.` on last page.
- Screen and Chrome Print Preview both showed exactly two sheets for the
  long order, without footer overlap or clipped totals, including when
  checked against the Vercel Preview deployment.
- Light and Dark admin themes were exercised; the physical A4 document
  stays white for legible printed output.
- Build and TypeScript passed before A4 push. The pushed A4 commits are
  `0c5b61e`, `11d0305`, and `60d8bb7`. The latest confirmed Git output
  showed both local and remote at `60d8bb7`, with no uncommitted files **at
  that earlier checkpoint**.

### Validation and deployment checkpoints

- Accounting view-mode changes: `npx tsc --noEmit` passed;
  `git diff --check` passed; `npm run build` succeeded under Next.js
  **16.2.10** with Turbopack. The last report showed two modified accounting
  files and no confirmed accounting-feature commit/push.
- Accounting report Print Preview: local 4-order and 27-order tests passed,
  including the repeated-footer correction. The `Save as PDF` destination
  was visible, but standalone exported-PDF inspection was not confirmed.
- A4: committed/pushed, Vercel Preview tested in two-page screen and print
  presentations. Vercel Preview readiness for subsequent accounting edits
  has **not** been confirmed in the shared terminal/screenshot record.
- Orders `Alle` pagination and amount display: a feature on this branch, but
  obtain one explicit Vercel Preview smoke test before merge.
- The primary thermal 58 mm receipt and new-order automatic acceptance
  print should be regression-tested before Production rollout. Do not assume
  the A4 option automatically changes printer defaults.

### Remaining actions before any merge

1. Check `git status -sb` and the accounting diff. Review the two changed
   accounting files for only the intended view toggle and print-footer fix.
2. If still local, commit both accounting files with a descriptive message
   (proposed: `feat(admin): add summary and detailed accounting report modes`)
   and push to `feature/admin-orders-report-a4`; **do not assert this step
   occurred until the resulting terminal output confirms it**.
3. Wait for the corresponding Vercel Preview deployment to be Ready. In
   Preview, verify summary/default mode, detail toggle, payment filters and
   A4 accounting print/PDF for both short and multi-page date ranges.
4. Verify `Alle` order pagination at 20 per page, counts, totals, filter
   interactions and page controls in Preview.
5. Re-test an accepted order's **optional** one-page and multi-page A4
   printing, plus existing 58 mm thermal receipt and unchanged acceptance
   workflow, in Preview.
6. Verify no confidential customer details are committed or leaked into
   public URLs/screenshots. Confirm correct Preview Supabase credentials
   and Nets test environment; never test by mutating Production records.
7. Only after explicit authorization, review the PR diff and merge into
   `main`; then verify a Production deployment and smoke tests separately.

---

## Testing Priorities

Critical automated or manual scenarios include:

- Guest pickup and delivery
- Authenticated pickup and delivery
- ASAP and scheduled orders
- Payment initialization
- Successful payment and webhook
- Duplicate webhook
- Paid checkout with simulated order-creation failure
- Missing OAuth profile during checkout completion
- Admin order visibility and authorization
- Admin accept, reject, and completion
- Cart clearing after successful payment
- Customer and restaurant notification emails
- Password recovery
- Google and Facebook OAuth
- Danish and English customer flows
- Public rating below and above its display threshold
- Admin accounting date boundaries around Copenhagen daylight-saving changes
- Mobile and desktop admin navigation
- Sold-out products
- Mobile menu and checkout

Playwright is a possible browser-level testing option if it matches the repository's
existing tooling. Inspect the test setup before adding a new dependency.

## Open Decisions and Risks

- Whether to add an independent scheduled reconciliation job
- Verified allergen data for every applicable menu item
- Printer hardware and paper width
- The Production `on_auth_user_created` trigger is not represented in repository
  migrations. Preview and Production schema parity should be reconciled through
  a dedicated, reviewed migration after the trigger function is verified.
- Supabase Security Advisor still reports warnings for the mutable
  `handle_updated_at` search path, public and authenticated execution of the
  `handle_new_user()` SECURITY DEFINER function, and disabled leaked-password
  protection.
- The original `orders` and `order_items` table definitions are not represented
  in repository migrations and should be reconciled as part of schema-baseline work.
- New tables created in the exposed `public` schema require explicit grants in
  their migrations under Supabase's October 30 Data API grant behavior.

## Next Actions

**Latest priority as of 2026-11-13:** Complete `feature/admin-orders-report-a4`
according to the detailed checklist in Section 8. In particular, the A4
changes are pushed and Preview tested, whereas the accounting-view changes
have no confirmed commit/push yet. Do not merge into `main` or deploy to
Production without an explicit decision and an updated Preview test.

**Other work from the 2026-10-16 snapshot, requiring status re-verification:**

1. Complete the `feature/discount-campaigns` UI/documentation review, commit
   and push to the feature branch, then test the new-order card and printed
   Danish receipt in Vercel Preview.
2. Verify stored discount snapshots and totals in Supabase **Preview**; finish
   the remaining discount test cases before requesting any merge approval.
3. Confirm the current status of the historical `fix/orders-order-items-rls`
   branch; this document's September 26 status may no longer be current.
4. Verify payment, order creation, Realtime notification, and acceptance flow
   with the next real Production order as a routine operational check.
5. Review the remaining Supabase Security Advisor warnings in a separate
   security branch, audit explicit Data API grants, and reconcile the
   Production auth-profile trigger and migration baseline.
6. Continue Production monitoring of payments, orders, emails, and alerts;
   consider independent scheduled reconciliation and admin MFA.
7. Keep allergen data and printer hardware integration deferred until the
   required restaurant-verified information and equipment are available.

## Documentation Update Rule

After every meaningful feature change, verification, push, or merge:

1. Update the completed-work summary.
2. Update branch and deployment status, explicitly distinguishing Local,
   Preview, merged `main`, and Production.
3. Record new database migrations and RLS policies.
4. Record environment-variable names without values.
5. Record operational recovery procedures.
6. Record unresolved risks and decisions.
7. Update `Last updated`.

Never place secrets, real customer data, deployment bypass values, account emails,
project identifiers, payment identifiers, or access tokens in this document.
