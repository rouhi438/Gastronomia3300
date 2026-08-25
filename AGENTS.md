# GastronomiaPizzaApp — Repository Instructions

## Scope

These instructions apply to the entire repository unless a more specific nested `AGENTS.md` overrides them.

Before starting any task, read:

1. This file.
2. `docs/PROJECT_CONTEXT.md`.
3. The relevant existing implementation, configuration, database migrations, and tests.

## Source of Truth

- For Next.js-specific changes, consult the official documentation matching the installed Next.js version before relying on memory, especially for routing, caching, authentication, server actions, middleware, and deployment behavior.

- The current repository code, database migrations, and `package.json` are the technical source of truth.
- `docs/PROJECT_CONTEXT.md` records project decisions, completed work, risks, and roadmap.
- If documentation and implementation disagree, inspect the code and report the discrepancy before making assumptions.
- Do not invent component names, database tables, environment variables, routes, scripts, or business rules.
- Inspect the existing patterns before creating new abstractions.

## Project Priorities

Protect the following flows above all other concerns:

1. Successful creation and visibility of paid orders.
2. Correct payment and webhook processing.
3. Correct admin order handling.
4. Customer authentication and authorization.
5. Privacy and protection of customer data.
6. Stable menu, cart, delivery, pickup, and scheduling behavior.

Do not modify these flows as a side effect of an unrelated feature.

## Security and Secrets

- Never commit secrets, passwords, access tokens, OAuth client secrets, payment credentials, Supabase service-role keys, or `.env` contents.
- Never place real customer data in documentation, fixtures, screenshots, logs, or tests.
- Client-side code may only use values explicitly intended to be public.
- Supabase service-role credentials must remain server-only.
- Do not log full payment payloads, authorization headers, cookies, tokens, or personal customer information.
- Keep Preview and Production credentials and callbacks separate where applicable.
- Do not change Production services or configuration unless the user explicitly requests it.

## Existing Architecture

Preserve the existing stack and conventions:

- Next.js and React
- TypeScript
- Supabase for backend data and authentication
- Nets for payment processing
- Vercel for Preview and Production deployments
- Danish and English localization
- Existing icon libraries, including `lucide-react` and `react-icons`

Do not add a new dependency when the existing stack can handle the requirement cleanly. Explain the reason before adding any significant dependency.

## Implementation Rules

- Prefer small, focused changes.
- Reuse existing components, hooks, utilities, API patterns, styles, and types.
- Avoid duplicating menu item information.
- Treat stable menu item IDs as references and resolve current product data from the existing menu source.
- Preserve existing product pricing, availability, sold-out behavior, modifiers, and `ItemModal` behavior.
- Keep customer-facing text in the localization system.
- When adding or changing a translation key, update both Danish and English translations.
- Do not silently rename or reuse translation keys for a different meaning.
- Keep responsive behavior correct on mobile and desktop.
- Preserve accessibility: semantic controls, keyboard access, visible focus, meaningful labels, and appropriate ARIA attributes.
- Avoid broad refactors while implementing a focused feature unless the refactor is required and explicitly explained.

## Orders and Payments

Order and payment handling are critical.

- Nets webhook processing must remain secure and idempotent.
- Do not trust a browser redirect alone as proof of payment.
- Repeated webhook delivery must not create duplicate orders or duplicate side effects.
- A paid order must never fail silently.
- Order status transitions must follow the existing business rules.
- Admin accept, reject, and completion actions must remain authorized and auditable.
- Any change affecting payment, order creation, or webhook handling requires focused testing.
- Preserve guest and authenticated checkout unless the task explicitly changes them.

## Authentication and Authorization

- Authentication is managed through Supabase.
- Existing email/password recovery and Google/Facebook OAuth behavior must be preserved.
- Authorization must be enforced on the server and through Supabase RLS where applicable.
- Hiding a UI element is not sufficient authorization.
- A customer may only access their own protected orders, profile information, feedback, and conversations.
- Admin-only operations must be verified as admin operations on the server.

## Database and Supabase

- Inspect existing migrations and RLS policies before changing the database.
- Store schema changes as repository migrations when the project already uses migrations.
- New customer-owned tables must have appropriate RLS enabled before release.
- Add indexes and constraints where they enforce important business rules.
- Do not rely only on client-side validation for ownership or uniqueness.
- Do not make destructive Production database changes without explicit approval and a recovery plan.

## Feature Decisions

### Most Ordered

- This is a manually curated list, not an analytics feature.
- Do not collect or calculate sales statistics for it.
- Store only stable menu item IDs in the curated configuration.
- Resolve the latest names, translations, images, prices, availability, and modifiers from the existing menu data.
- Place the section above normal menu categories.
- Default view: horizontal scrolling on mobile and desktop.
- Desktop may include previous/next controls.
- Mobile must support touch scrolling.
- `See all / Vis alle` expands the section into the normal full-width menu grid.
- Expanded state uses `Show less / Vis mindre` to return to horizontal mode.
- Product selection must open the existing `ItemModal`.
- Existing sold-out behavior must apply.

### Allergens

- Allergens must be structured data associated with menu items.
- Never guess allergens from a product name or description.
- All allergen information must come from the restaurant’s actual recipes and ingredients.
- Display allergen information clearly in the customer menu and `ItemModal`.
- Labels and explanatory text must exist in Danish and English.

### Private Order Feedback

- This is private order feedback, not a public review system.
- Feedback is associated with a specific completed order.
- A customer may submit a 1–5 star rating and an optional message.
- The admin may view and reply to the feedback.
- The conversation is visible only to the order owner and authorized admins.
- Enforce ownership and admin access in the database/API, not only in the UI.
- Public comments, public review pages, and public customer conversations are out of scope.
- Guest-order eligibility must be decided before implementation. Do not weaken authorization to support anonymous access.

### Printing

- Printer integration is deferred until the physical printer, connection method, and paper width are known.
- Do not hardcode a 50 mm, 58 mm, 70 mm, or 80 mm receipt format yet.
- A future implementation should separate order receipt data from printer-specific rendering and transport.

## Git Workflow

Before changing files:

- Check the current branch and working tree.
- Preserve unrelated user changes.
- Do not discard, reset, overwrite, or clean uncommitted work.
- Create focused feature branches from an up-to-date `main`.
- Do not combine unrelated features in one branch or pull request.

Preferred branch names:

- `docs/project-context`
- `feature/order-monitoring`
- `feature/menu-allergens`
- `feature/most-ordered`
- `feature/private-order-feedback`
- `feature/order-printing`

Use concise Conventional Commit-style messages, for example:

- `docs: add project context and development guidelines`
- `feat: add monitoring for unhandled orders`
- `feat: display structured menu allergens`
- `feat: add most ordered menu section`
- `feat: add private order feedback`

## Verification

Before claiming that a change is complete:

1. Inspect `package.json` and the repository lockfile to identify the correct package manager and available scripts.
2. Run the relevant lint command.
3. Run type checking if the repository provides it.
4. Run relevant automated tests.
5. Run a production build when the change can affect routing, rendering, environment handling, or deployment.
6. Manually verify the affected customer and admin flows.
7. Check both Danish and English.
8. Check both mobile and desktop behavior where UI is involved.

Do not invent test commands. Use the scripts actually defined in the repository.

If a check cannot be run, state exactly which check was not run and why.

## Documentation Maintenance

After merging a meaningful feature:

- Update `docs/PROJECT_CONTEXT.md`.
- Move completed roadmap items to the completed section.
- Record important architectural or business decisions.
- Record new migrations, environment requirements, operational steps, and known risks.
- Never include secret values in documentation.
