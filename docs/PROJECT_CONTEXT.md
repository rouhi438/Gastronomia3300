# GastronomiaPizzaApp - Project Context

Last updated: 2026-09-06

## Purpose

GastronomiaPizzaApp is the online ordering application for Gastronomia 3300.

Production website: `https://gastronomia3300.dk`

This document preserves project context, completed work, important decisions,
operational procedures, known risks, and the agreed roadmap. Update it whenever
a meaningful feature is merged.

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
- Admin accounting report
- Admin portal isolation deployed to Production
- OAuth profile continuity and paid-order fallback deployed to Production
- Icon-based admin Store Status control deployed to Production
- English public-rating threshold messages
- Removal of customer comments from the compact admin order list only
- Menu category icon and translation-key corrections
- Production menu price corrections completed on 2026-08-27

Before changing any completed area, inspect the current code and verify existing
behavior.

## Current Branch and Deployment State

### Main

Admin accounting, admin portal isolation, the registration-profile conflict fix,
and the admin Store Status control have been merged. Their Production deployments
reached Ready.

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

Branch: `fix/order-receipt-print-visibility`

Status at the time of this update:

- Customer comments moved directly below the order header and before order items.
- Comments use a prominent double border on screen and a high-contrast black double border in print.
- The print-only border around the order header was removed while preserving the bordered pickup/delivery badge.
- Requested-time values print on a separate centered line beneath a left-aligned label and separator.
- Previous-order counts are visible in both the admin detail view and its printed receipt.
- Guest order history falls back to normalized email and then phone when no authenticated user ID exists.
- Previous-order counts remain absent from public customer receipts.
- Desktop receipt and browser Print Preview were verified locally.
- `git diff --check`, ESLint, TypeScript, and the Next.js production build passed.
- Preview and Production deployment pending.

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
- Production migration to the new dedicated admin account
- The Production `on_auth_user_created` trigger is not represented in repository
  migrations. Preview and Production schema parity should be reconciled through
  a dedicated, reviewed migration after the trigger function is verified.

## Next Actions

1. Commit and push `fix/order-receipt-print-visibility`.
2. Verify the admin receipt and browser Print Preview in the Preview deployment.
3. Merge the receipt branch and wait for the Production deployment to reach Ready.
4. Smoke-test a Production admin receipt containing a customer comment.
5. Implement the collapsible accounting-report panel in a separate feature branch.
6. Continue routine monitoring of Production payments, orders, emails, and alerts.
7. Reconcile the Production `on_auth_user_created` trigger with reviewed database migrations before making related schema changes.
8. Consider multi-factor authentication for the dedicated administrator as a future security-hardening task.

## Documentation Update Rule

After every meaningful merged feature:

1. Update the completed-work summary.
2. Update branch and deployment status.
3. Record new database migrations and RLS policies.
4. Record environment-variable names without values.
5. Record operational recovery procedures.
6. Record unresolved risks and decisions.
7. Update `Last updated`.

Never place secrets, real customer data, deployment bypass values, account emails,
project identifiers, payment identifiers, or access tokens in this document.
