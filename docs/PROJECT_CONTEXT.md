# GastronomiaPizzaApp — Project Context

Last updated: 2026-08-27

## Purpose

GastronomiaPizzaApp is the online ordering application for Gastronomia3300.

Production website:

`https://gastronomia3300.dk`

This document preserves project context, completed work, important decisions, known risks, and the agreed roadmap. It must be updated as meaningful features are merged.

The repository implementation remains the technical source of truth. Verify exact file names, routes, database table names, environment variables, and scripts in the repository before changing them.

## Known Technology Stack

The project uses:

- Next.js
- React
- TypeScript
- Supabase for authentication and application data
- Nets for online payment processing
- Vercel for Preview and Production deployments
- Danish and English localization
- `lucide-react` and `react-icons` for icons

The project has separate Preview and Production concerns. Environment-specific URLs, Supabase projects, OAuth callbacks, and secrets must not be mixed.

## Product Scope

The application supports the main restaurant ordering flow, including:

- Customer menu browsing
- Product details and modifiers
- Shopping cart
- Pickup orders
- Delivery orders
- ASAP orders
- Scheduled orders
- Guest ordering
- Authenticated customer ordering
- Online payment
- Order management
- Customer emails
- Customer profile functionality
- Danish and English customer-facing pages
- Legal/information pages
- Admin handling of incoming orders

## Completed Work

Based on the current project history, the following areas have already been implemented or corrected:

- Main customer ordering flow
- Menu and category presentation
- Cart and checkout
- Pickup and delivery choices
- ASAP and scheduled order choices
- Guest order flow
- Customer account and profile flow
- Password recovery
- Google OAuth
- Facebook OAuth
- Nets payment integration
- Admin order handling
- Order/customer email behavior
- Danish and English localization of customer pages
- Legal and informational pages
- Menu category icon updates
- Corrections to incorrectly mapped translation IDs/keys
- General lint-related cleanup completed during the previous work
- Order-loss prevention, durable operational alerts, and restaurant fallback emails
- Production verification of restaurant new-order emails and pending-order alert resolution
- Curated Most Ordered menu section, popular labeling, and category filtering
- Production menu price corrections completed on 2026-08-27

Before modifying any of these areas, inspect the existing code and confirm the current behavior.

## Important Operational Notes

### OAuth

Google and Facebook authentication use Supabase providers.

For any future OAuth credential rotation:

1. Create the new secret without disabling the old one.
2. Update and test Preview.
3. Update and test Production.
4. Only after both environments work, disable or delete the old secret.
5. Never commit an OAuth secret to Git or paste it into project documentation.

OAuth callback URLs must remain correct for each Supabase environment.

### Payments and Orders

Nets payment and order creation are business-critical.

The application must prevent these failures from becoming silent:

- Payment creation fails.
- A Nets webhook fails.
- Payment succeeds but the order is not created or not visible.
- A webhook is delivered more than once.
- An order email fails.
- An admin order API operation fails.
- A paid or pending order remains unnoticed by the restaurant.

Webhook and order handling must remain idempotent and authorized.

### Customer Data

Customer orders, profiles, messages, and feedback are private.

Authorization must be enforced through server-side checks and Supabase RLS where applicable. UI visibility alone must never be treated as authorization.

Do not put real customer data into source control, logs, fixtures, screenshots, or documentation.

## Current Agreed Roadmap

The order-monitoring and Most Ordered features have been implemented, merged, and verified in Production.

Structured menu allergens remain deferred until verified restaurant recipe, ingredient-label, and preparation data is available. The current implementation order is:

1. Private order feedback and public aggregate rating — in progress
2. Structured menu allergens after verified data is available
3. Printer integration after hardware and paper-width selection

Each roadmap item should use a separate branch and pull request.

---

## 1. Order-Loss Prevention and Error Monitoring — Implemented

Branch:

`feature/order-monitoring`

Status:

Implemented and verified in Preview on 2026-08-26, then merged, deployed, and verified in Production on 2026-08-27. The Production database migration and required environment variables are configured.

### Implemented Coverage

The monitoring system now covers:

- Payment creation and payment-total failures
- Authenticated Nets webhook validation failures
- Persistence of a verified payment before restaurant-order creation
- Paid checkout sessions without a corresponding order
- Order creation and checkout-finalization failures
- Duplicate Nets webhook delivery without duplicate order creation
- Refund request, refund webhook, and refund-state failures
- Admin order lookup and update failures
- Failed customer received, accepted, and rejected emails
- Paid orders remaining pending for more than five minutes
- Immediate fallback email notification for each new paid order

Customer emails remain separate:

- Order received
- Order accepted
- Order rejected

Restaurant emails do not replace customer emails.

### Database

The monitoring schema is created by:

`supabase/migrations/20260825000000_add_operational_alerts.sql`

The migration adds:

- The `public.operational_alerts` table
- Indexes for unresolved alerts, checkout sessions, and orders
- RLS enabled without anon or authenticated policies
- `restaurant_notification_email_claimed_at` on `public.orders`
- `restaurant_notification_email_sent_at` on `public.orders`

Operational alerts are accessed only by server-side code using the Supabase service role.

Alert context must not contain customer personal data, payment credentials, secrets, tokens, cookies, or complete webhook payloads.

### Restaurant Email Configuration

The server-only environment variable is:

`RESTAURANT_ALERT_EMAIL`

Its value must be configured separately in Vercel Preview and Production and must never be committed.

Restaurant email delivery also requires the existing server-only variables:

- `RESEND_API_KEY`
- `EMAIL_FROM`

A new paid order triggers a fallback restaurant email. Database claim and sent timestamps prevent concurrent or repeated webhook processing from normally sending duplicate restaurant emails.

Critical operational alerts may also send an email to the restaurant. Warning alerts remain durably recorded in the database unless their call site explicitly requests notification.

### Pending-Order Monitoring

The authenticated admin watcher checks the oldest pending order every five seconds.

When a paid order remains pending for at least five minutes:

- A critical `pending-order-unhandled` alert is recorded.
- One critical restaurant email is sent for that alert.
- Repeated polling does not repeatedly send the same alert email.
- Accepting or rejecting the order resolves the alert automatically.

The immediate new-order restaurant email is sent by the server during webhook processing and does not depend on the admin browser watcher.

### Preview and Production Verification

The following checks passed in Preview on 2026-08-26:

- ESLint completed with no new errors.
- TypeScript completed with `npx tsc --noEmit`.
- `git diff --check` completed successfully.
- The Next.js production build completed successfully.
- A guest ASAP pickup order completed through Nets.
- A guest scheduled pickup order completed through Nets.
- Immediate restaurant new-order emails were delivered.
- A five-minute pending-order alert was delivered once.
- Accepting the pending order resolved its alert.
- Customer received and accepted email timestamps were recorded.
- Rejecting a second order recorded the rejected-email timestamp.
- A successful rejected email did not create a false operational alert.
- Restaurant email claims were released after successful delivery.
  Production rollout completed and was verified on 2026-08-27:

- The Production migration created `public.operational_alerts` and the restaurant-notification order columns.
- `RESTAURANT_ALERT_EMAIL` was configured for Production alongside the existing Resend variables.
- The merged Production deployment reached `Ready`.
- Three consecutive real paid orders delivered immediate `[Ny ordre]` restaurant emails.
- An order handled before the five-minute threshold did not create a pending-order alert.
- Orders `#14` and `#15` created critical pending-order alerts after the threshold.
- Both Production pending-order alerts sent notifications without `notification_error`.
- Handling orders `#14` and `#15` resolved their alerts automatically.

### Operational Recovery

When a critical alert is received:

1. Find the unresolved row in `public.operational_alerts`.
2. Use `order_id` and `checkout_session_id` to inspect the related records.
3. Verify the payment state directly in Nets Easy.
4. Check whether an order already exists before retrying or manually creating anything.
5. Do not treat a browser redirect as proof of payment.
6. Do not manually replay a webhook until duplicate-order protection and the existing checkout-session relationship have been checked.
7. For restaurant email failures, verify `RESTAURANT_ALERT_EMAIL`, `RESEND_API_KEY`, `EMAIL_FROM`, and the alert’s `notification_error`.
8. For a pending order, handle it through the normal Admin accept or reject flow so the alert resolves automatically.

### Known Limitation

There is currently no independent scheduled reconciliation job.

The immediate paid-order restaurant email is server-side, but the five-minute pending-order escalation depends on the authenticated admin watcher calling the pending-order endpoint. A future background reconciliation job may be added if monitoring must continue independently of the admin browser.

---

Suggested branch:

`feature/order-monitoring`

### Goal

Make sure a paid or unhandled order cannot fail silently or remain unnoticed without an actionable alert.

### Required Investigation

Before implementation, map the existing flow for:

- Payment initialization
- Nets payment completion
- Nets webhook processing
- Order creation
- Admin order visibility
- Pending order alerts
- Customer and restaurant emails
- Admin order status updates

Document where errors are currently caught, logged, retried, or ignored.

### Expected Coverage

Monitoring should cover at least:

- Payment initialization failures
- Invalid or failed Nets webhooks
- Paid transactions without a corresponding order
- Duplicate webhook delivery
- Order creation failures
- Failed order/customer emails
- Failed admin order API operations
- Orders remaining pending or unconfirmed beyond an acceptable time

### Alerting

The application already has browser-based order alert behavior, but browser audio alone is not sufficient because:

- The restaurant device may sleep.
- The browser may block sound.
- The internet connection may be interrupted.
- The page may be closed or suspended.

A fallback alert should be selected after reviewing the current architecture. Possible options include:

- Restaurant email alert
- Push notification
- Repeated pending-order alert
- External error monitoring
- A reconciliation job that detects paid transactions without orders

Sentry is a possible monitoring provider, but it is not yet a confirmed dependency. Compare the existing infrastructure and project needs before selecting a service.

### Definition of Done

- Critical failures are recorded with actionable context.
- Secrets and unnecessary personal data are not logged.
- Duplicate events do not create duplicate orders.
- There is a detectable path for “paid but no order.”
- Long-pending orders trigger an appropriate fallback.
- The relevant failure scenarios are tested.
- Operational recovery steps are documented.

---

## 2. Structured Menu Allergens

Suggested branch:

`feature/menu-allergens`

### Goal

Allow customers to see accurate allergen information before ordering.

### Business Rule

Allergen values must come from the restaurant’s real recipes, ingredient labels, and preparation process.

Never infer or guess allergens from:

- Product names
- Product descriptions
- Common recipes
- Images
- Similar restaurant products

Cross-contamination information must also come from the restaurant’s actual kitchen process.

### Expected Behavior

- Store allergens as structured product data.
- Keep allergen identifiers stable and language-independent.
- Provide Danish and English labels.
- Show allergen information in the relevant menu/product interface.
- Show it clearly inside the existing `ItemModal`.
- Preserve current product data, prices, modifiers, and sold-out behavior.
- Ensure missing allergen data is distinguishable from “contains no allergens.”

### Required Input Before Completion

The restaurant must provide the verified allergen mapping for each relevant menu product. Implementation can prepare the data structure and UI, but production allergen values must not be fabricated.

### Definition of Done

- The data model is structured and maintainable.
- Verified allergen values can be assigned to menu items.
- Danish and English displays are complete.
- The information is visible before purchase.
- Mobile and desktop layouts are verified.
- No allergen value has been guessed.

---

## 3. Most Ordered Menu Section — Implemented

Branch:

`feature/most-ordered`

Status:

Implemented, merged, deployed, and verified in Production on 2026-08-27.

### Goal

Display a manually curated selection of popular products using the existing menu data.

This is a curated restaurant selection, not a sales-analytics feature.

### Product Selection

The final ordered menu item IDs are:

```tsx
[3, 8, 16, 20, 47, 60, 200, 201]

Suggested branch:

`feature/most-ordered`

### Goal

Display a manually curated selection of popular products above the normal menu categories.

This is not a sales analytics feature.

### Product Selection

The restaurant already knows which products sell most frequently. The list will therefore be maintained manually as an ordered list of stable menu item IDs.

Possible product types discussed include:

- Popular pizzas such as pepperoni and salad pizza
- French fries
- Cola or other popular drinks
- Mayonnaise and chili dips

The final item IDs and display order must be confirmed from the real menu data before implementation.

### Data Rules

- Do not copy complete product objects into the Most Ordered configuration.
- Do not duplicate product names, prices, images, modifiers, or availability.
- Resolve the selected IDs from the existing menu data.
- The configured ID order controls the display order.
- Invalid or removed IDs must fail safely and should be detectable during development.
- Price, translation, image, and sold-out changes must automatically appear in this section.

### Initial Layout

The section appears above all standard menu categories.

On both mobile and desktop:

- The initial layout is a horizontal row.
- Only this section scrolls horizontally.
- Normal menu sections keep their current layout.
- Mobile supports touch/swipe scrolling.
- Desktop may include previous and next navigation buttons.

### Expanded Layout

The section has a localized `See all / Vis alle` control.

When selected:

- Horizontal scrolling is removed.
- All curated items appear in a full-width grid.
- The grid follows the same visual behavior as normal menu item cards.
- The section remains above normal categories.
- The control changes to localized `Show less / Vis mindre`.
- Selecting it restores the horizontal layout.

### Product Interaction

- Selecting a product opens the existing `ItemModal`.
- Existing modifiers and add-to-cart behavior are reused.
- Sold-out products follow the existing sold-out rules.
- Accessibility and keyboard behavior must be preserved.
- Danish and English titles and controls must be supported.

### Definition of Done

- The list is manually configurable through stable IDs.
- No sales tracking or analytics has been introduced.
- Mobile horizontal scrolling works correctly.
- Desktop horizontal navigation works correctly.
- Expand and collapse behavior works correctly.
- Products use the existing source data and modal.
- Sold-out behavior is correct.
- Danish and English are complete.

---

## 4. Private Order Feedback and Public Rating — In Progress

Branch:

`feature/private-order-feedback`

### Goal

Allow a verified customer to rate a completed order, optionally send a private message to the restaurant, and receive one private admin reply.

The restaurant’s aggregate rating is public. Individual written feedback and admin replies remain private.

### Eligibility

- Only an order with `completed` status is eligible.
- Pending, accepted, ready, cancelled, or rejected orders are not eligible.
- Each completed order can submit only one rating.
- Ratings must be integers from 1 to 5.
- The final submission and editing windows still require confirmation.

### Customer Experience

After an eligible order is completed, the customer can access feedback from the relevant order in the Profile or order-detail flow.

The feedback form contains:

- A required 1-to-5 star rating
- An optional private message to the restaurant
- An optional consent control for publicly displaying the customer’s first name and star rating

The public-display consent must not be preselected.

The customer must clearly understand that:

- The star rating contributes to the public aggregate.
- The written message is always private.
- Only the first name and star rating may be public when explicit consent is given.
- The surname, photo, order number, email, and private message are never public.

There is no public written-review field in the MVP.

### Public Rating Experience

The public rating system includes:

- The restaurant’s average rating
- The total number of eligible ratings
- A verified-order label
- Consented first names and star ratings without written comments

The full rating summary is displayed on the home page.

A compact aggregate-rating badge is displayed on the menu page.

Public responses must not expose complete feedback rows, customer identifiers, order identifiers, private messages, admin replies, or internal metadata.

The minimum rating count required before displaying the public aggregate still requires confirmation.

### Admin Experience

An authorized admin can:

- See when an order has new feedback
- Identify the related order
- View the customer’s rating
- View the optional private message
- Send one private reply
- See whether the feedback has been answered

The admin reply is sent only once. The customer cannot continue a multi-message thread in the MVP.

Admin access and reply authorization must be enforced server-side.

### Notifications

The intended notification flow is:

- An eligible customer receives a feedback invitation after the order is completed.
- The restaurant receives a notification when new feedback is submitted.
- The customer receives a notification when the admin sends the private reply.

Email delivery must use deduplication or durable sent timestamps so retries do not normally send duplicate messages.

The rating and reply are completed inside the application. Email is used only for notification and secure navigation.

### Privacy and Authorization

- Private feedback is visible only to the owner of the related order and authorized admins.
- Another customer must not read or modify the feedback.
- Order ownership and admin authorization must be verified server-side.
- Supabase RLS must protect the underlying private data.
- Predictable order IDs must never authorize feedback access.
- Public-name consent must be explicit and independently withdrawable.
- Withdrawing public-name consent must remove the individual public display without exposing or deleting private order history incorrectly.
- The Privacy Policy must describe the public aggregate and optional first-name display.
- Public APIs must return only approved aggregate and consented display data.

### Guest Orders

Guest feedback authorization is not yet finalized.

Before implementation, inspect the existing public order token and order-claim flows.

The final design must use either:

- A verified account that owns or has securely claimed the order, or
- A proven high-entropy, order-specific guest authorization mechanism

Never authorize feedback using only a predictable order ID, email address, or client-provided customer identity.

### Remaining Decisions

Before finalizing the schema, confirm:

- How long after completion a customer may submit feedback
- How long the customer may edit before the feedback is locked
- The secure guest-order authorization flow
- The minimum number of ratings before public display
- Rating and feedback retention rules
- Public-name consent withdrawal behavior

### Definition of Done

- Only completed orders can receive feedback.
- Each order can create only one valid 1-to-5 rating.
- Ownership and admin access are enforced at the database and API layers.
- Another customer cannot read or modify the feedback.
- The public average and count are calculated correctly.
- Only consented first names and star ratings are individually public.
- Private messages and admin replies never appear in public responses.
- Admin can send only one private reply.
- Relevant notification emails are deduplicated.
- Danish and English UI text is complete.
- RLS, authorization, aggregate, and duplicate-submission tests pass.
- ESLint, TypeScript, `git diff --check`, and the production build pass.

---

## 5. Printer Integration — Deferred

Suggested future branch:

`feature/order-printing`

Printer work is paused until the restaurant selects the actual hardware.

The following details are currently unknown:

- Printer model
- Paper width
- Connection method
- ESC/POS compatibility
- Browser, network, Bluetooth, USB, or local bridge requirements
- Restaurant tablet/device platform

Do not design the final receipt around an assumed 50 mm, 58 mm, 70 mm, or 80 mm printer.

When hardware is selected, first confirm:

1. Printer model and technical documentation
2. Paper width
3. Supported character encoding
4. Danish character support
5. Image/logo support
6. Connection method
7. Auto-cut support
8. Cash drawer requirements, if any
9. Browser/device restrictions
10. Whether automatic printing requires a local print bridge

Receipt data should eventually be separated from printer-specific layout and transport.

## Testing Priorities

Critical automated or manual scenarios should include:

- Guest pickup order
- Guest delivery order
- Authenticated pickup order
- Authenticated delivery order
- ASAP order
- Scheduled order
- Payment initialization
- Successful payment/webhook
- Duplicate webhook
- Payment success with simulated order creation failure
- Admin order visibility
- Admin accept/reject/completion flow
- Password recovery
- Google OAuth
- Facebook OAuth
- Danish customer flow
- English customer flow
- Sold-out menu product
- Mobile menu and checkout
- Desktop menu and checkout

Playwright is a suitable option for browser-level tests if it matches the repository’s existing tooling. Do not add it without first inspecting the current test setup.

## Open Decisions

The following decisions still require confirmation:

- Whether to add an independent scheduled reconciliation job for paid checkout sessions
- Verified allergen data for each menu item
- Customer feedback submission and editing windows
- Secure guest-order feedback authorization
- Minimum rating count before the public aggregate is displayed
- Feedback retention and withdrawal of public-name consent
- Printer hardware and paper width

## Next Action

Implement and verify:

`feature/private-order-feedback`

The agreed MVP scope is:

- One 1-to-5 rating per completed order
- An optional private customer message
- One private admin reply
- A public aggregate rating and rating count
- Optional public display of the customer’s first name and star rating with explicit consent
- No public written reviews
- No multi-message thread
- No customer surname, photo, order number, or private message in public responses
- A full rating summary on the home page
- A compact aggregate-rating badge on the menu page
- Customer and admin email notifications for the relevant feedback events

Before creating the database schema, inspect the existing authenticated-order ownership, guest-order token, profile, admin-order, email, and RLS flows. Do not expose individual feedback rows through a public API; public access must return only the approved aggregate and consented display fields.

## Documentation Update Rule

After every meaningful merged feature:

1. Update the completed-work section.
2. Update the roadmap status.
3. Record new database migrations and RLS policies.
4. Record new environment variable names without their values.
5. Record operational recovery procedures.
6. Record unresolved risks and decisions.
7. Update the `Last updated` date.

Never place secrets or real customer data in this document.
```
