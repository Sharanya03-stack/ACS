# Phase 2 Progress & Audit Report

## 1. Current Folder Structure
- `src/app/(auth)`: Contains `login/page.tsx`, which was updated in Phase 1 to use real Supabase auth but relies on mock dropdown credentials.
- `src/app/(dashboard)`: Contains role-specific dashboards `[role]/`, `admin/`, `oem/`, `dealer/`, `partner/`, and `technician/`.
- `src/components/`: Contains UI components.
- `src/lib/`: Contains `data-context.tsx` (the central mock data provider) and `auth.tsx` (the mock auth context).
- `src/utils/supabase/`: Contains the correct Supabase SSR clients (`client.ts`, `server.ts`, `middleware.ts`).

## 2. Existing Supabase Configuration
- Supabase SSR is correctly installed and configured.
- Environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are set up in `.env.local` and `.env.example`.
- Authentication uses real Supabase users via email/password.

## 3. Existing Authentication Implementation
- `src/app/(auth)/login/page.tsx` executes real Supabase sign-in, but still loads the `role` and redirects client-side.
- The global layout currently wraps the app in a mock `<AuthProvider>` (`src/lib/auth.tsx`) and mock `<DataProvider>` (`src/lib/data-context.tsx`).
- Phase 2 must transition from the mock `AuthContext` to Supabase server-side session checks (via `server.ts` and `middleware.ts`).

## 4. Existing Mock Data Sources
- `src/lib/data-context.tsx` holds arrays of `OEM`, `Dealer`, `Customer`, `Vehicle`, `Charger`, `Partner`, `Technician`, and `Installation`.
- Pages throughout the app import `useData()` from this context to read/mutate data locally in React state.

## 5. Existing Dashboard Routes
- `admin/dashboard`
- `oem/dashboard`
- `dealer/dashboard`
- `partner/dashboard`
- `technician/dashboard`

## 6. Existing Role/Permission Implementation
- Currently relies on `src/lib/auth.tsx` where the active mock user profile sets permissions.
- Phase 1 solved this at the database level using `0002_rls_mutations.sql`. Phase 2 must just query data and let Supabase reject unauthorized operations.

## 7. Database Tables Currently Used
The SQL schema perfectly matches the models:
- `organizations` (Replaces `oems`, `dealers`, `partners`)
- `profiles` (Replaces `technicians` array and `users`)
- `customers`
- `vehicles`
- `chargers`
- `installations`

## 8. Missing Pieces Required for Phase 2
1. A real global `useSupabaseUser()` hook or migrating completely to Server Components + Server Actions.
2. Replacing `useData()` everywhere with actual Supabase SDK queries (`supabase.from(...)`).
3. Configuring Supabase Storage bucket (`installation_photos`) for Phase 2J since it wasn't added in the schema yet.

## 9. Recommended Implementation Order
*   **PHASE 2A**: Finalize Supabase client + authentication (Strip `auth.tsx` and move to real SSR session guarding in `middleware.ts`).
*   **PHASE 2B**: Profile + role loading (Centralized hooks/server utils for checking identity).
*   **PHASE 2C**: ACS Admin dashboard (Wire up dashboard statistics).
*   **PHASE 2D**: OEM dashboard (Filter visually by `org_id` / rely on RLS).
*   **PHASE 2E**: Dealer dashboard (Manage customers, vehicles, chargers).
*   **PHASE 2F**: Partner dashboard (Installation assignment tracking).
*   **PHASE 2G**: Technician dashboard (Installation workflow).
*   **PHASE 2H**: Customers / Vehicles / Chargers (Connect pages).
*   **PHASE 2I**: Installation workflow (Connect pages).
*   **PHASE 2J**: Technician image uploads / notes (Setup storage bucket and API routes).
*   **PHASE 2K**: Error/loading/empty states.
*   **PHASE 2L**: End-to-end RBAC testing.
