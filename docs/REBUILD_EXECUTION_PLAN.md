# HabitUp Rebuild Execution Plan

## Status

- Current phase: implementation complete, pending deployment of new Supabase migrations and physical-device acceptance.
- Product behavior: authentication, onboarding, navigation, shared UI states, tests and release configuration updated.
- Release gate: apply migrations 25 and 26 in the target Supabase project, configure final legal URLs and validate preview builds on physical devices.

## Canonical Product Loop

```text
Account
  -> role onboarding
  -> client publishes request
  -> professional sends quote
  -> client accepts quote
  -> project is created
  -> project chat and progress
  -> completion
  -> verified review
```

## Route Ownership Target

### Public and authentication stack

- `/`: session bootstrap only.
- `/(auth)/welcome`: optional first-run introduction.
- `/(auth)/login`: sign in.
- `/(auth)/register`: account creation.
- `/(auth)/verify-email`: pending email verification and resend.
- `/(auth)/forgot-password`: request password recovery.
- `/(auth)/reset-password`: set and confirm the new password.

The authentication stack never renders product tabs.

### Client tabs

- `/(client)/home`
- `/(client)/search`
- `/(client)/leads/index`
- `/(client)/projects/index`
- `/(client)/profile`

Client detail and form routes remain in the client stack but are explicitly hidden from the tab bar:

- `leads/create`
- `leads/[id]`
- `projects/[id]`
- `professional/[id]`

### Professional tabs

- `/(professional)/home`
- `/(professional)/leads/available`
- `/(professional)/projects/index`
- `/(professional)/portfolio/index`
- `/(professional)/profile`

Professional routes hidden from the tab bar:

- `onboarding`
- `verification`
- `leads/[id]`
- `projects/[id]`
- `portfolio/add`

### Shared stack

- `/chat/[projectId]`
- `/notifications`
- not-found and unavailable-resource states.

## Authentication State Target

```text
booting
  -> signedOut
  -> emailUnverified
  -> profileIncomplete
  -> authenticatedClient | authenticatedProfessional

Any authenticated state
  -> recoverableProfileError
  -> retry without deleting the valid auth session
```

Only an explicit logout, revoked refresh token or confirmed invalid session clears persisted authentication.

## Registration Data Boundary

Account creation collects:

- first name;
- last name;
- email;
- phone;
- password;
- password confirmation (validation only, never persisted);
- user role;
- locality or postal code;
- acceptance of terms and privacy;
- optional and separate marketing consent.

Professional business data belongs to progressive onboarding, not account creation.

## Keep, Refactor, Replace, Remove

### Keep as foundations

- Expo SDK 54, Expo Router and React Native.
- Supabase Auth, PostgreSQL, RLS, Realtime and Storage.
- Zustand as a small client-side session store.
- React Hook Form and Zod.
- Existing domain separation between screens, hooks and services.
- Existing database migrations as immutable history.

### Refactor

- `app/_layout.tsx`: providers and a single navigation gate.
- `app/index.tsx`: passive bootstrap screen without duplicate routing policy.
- Client and professional tab layouts: explicit visible and hidden routes.
- `authStore` and `useAuth`: explicit auth states and recoverable errors.
- `auth.service.ts`: typed results, email verification and password recovery lifecycle.
- Base UI controls: tokens, accessibility, keyboard behavior and complete states.
- Services and hooks: consistent query state and user-facing errors.

### Replace

- Login, registration, email confirmation and password recovery screens.
- The current professional onboarding composition.
- Generic full-page spinners with layout-specific skeletons.
- Raw backend error messages with a normalized error vocabulary.
- The current generic gradient bootstrap screen.

### Remove after replacements are verified

- Duplicate redirect logic.
- Automatic tab exposure for internal and dynamic routes.
- Decorative gradients and repeated hard-coded color decisions.
- Silent catch paths that leave blank or stale screens.
- Placeholder test command once a real test runner exists.

No existing migration or production data is deleted as part of this cleanup.

## Delivery Phases

1. Product, design and architecture baseline.
2. Authentication and session lifecycle.
3. Progressive onboarding.
4. Navigation and screen loading reliability.
5. Shared mobile design system.
6. Client core loop.
7. Professional core loop.
8. Data, security and observability hardening.
9. Automated QA, device validation and performance.
10. Store preparation and controlled release.

Each phase ends with lint, typecheck, relevant automated tests, device-size verification and a user review gate.

## Phase 1 Acceptance Gate

Phase 1 will not be accepted until all of the following work end to end:

- create an account with matching passwords and required legal acceptance;
- prevent duplicate submissions;
- explain email confirmation and resend it safely;
- open confirmation and recovery links through the app;
- sign in with clear error states;
- restore a persisted session without navigation flashes;
- survive a temporary profile or network failure without logging out;
- sign out explicitly;
- request and complete password recovery;
- route client and professional accounts to the correct next step;
- pass automated validation, service and navigation tests.
