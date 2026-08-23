# Theme Management & Preference Persistence

**Status:** Accepted | **Date:** 2026-08-23

## The Decision

Implement application-wide visual theming supporting **System**, **Light**, and **Dark** modes using a **hybrid client-database architecture**:
1. **Client Rendering & Hydration:** Utilize `next-themes` (`ThemeProvider`) configured for class-based Tailwind CSS v4 styling (`.dark` modifier with OKLCH design tokens) and flash-of-unstyled-content (FOUC) prevention.
2. **Database Persistence:** Extend the PostgreSQL `profiles` table in `@/lib/db/schema/profiles.ts` with a `theme` enum column (`'system' | 'light' | 'dark'`) defaulting to `'system'`, synced asynchronously via Next.js Server Actions on user change.
3. **Dual Surface Affordance:** Provide both an instant-access header quick-switcher (accessible to guests and authenticated learners) and a dedicated visual appearance card within the `/settings` dashboard.

## Rationale & Alternatives

* **Why Tri-State (System, Light, Dark):** Honoring the operating system preference (`system`) prevents blinding high-contrast flashes when new learners land on the site, while explicit overrides give learners full control.
* **Why Hybrid Persistence (Postgres + `next-themes`):** Authenticated learners retain their visual preferences across devices and fresh browsers without relying solely on ephemeral cookies or local device state. Unauthenticated visitors are seamlessly served via browser storage without schema dependencies.
* **Why Optimistic Client Switching:** Instantaneous (0ms perceived lag) visual transitions are critical for UX; asynchronous Server Action synchronization updates PostgreSQL without blocking UI interactions.
* **Rejected Client-Only LocalStorage:** Fails to sync across learner devices (e.g. desktop to tablet/mobile) and breaks user expectations when clearing browser caches.
* **Rejected Blocking Server Actions:** Causes noticeable UI latency during simple visual toggles, degrading the active learning experience.
* **Trade-off:** Requires maintaining both client-side theme provider state and a profile database sync mechanism.
