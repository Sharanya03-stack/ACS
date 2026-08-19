# Phase 2B: Profile + Role Resolution Report

## 1. Files Changed
- **`src/utils/supabase/server.ts`**: Added a new robust, strongly typed server-side utility `getUserProfile()`.
- **`src/app/page.tsx`**: Refactored the root route to use the new `getUserProfile()` utility for server-side role resolution and redirection.
- **`task.md`**: Marked Phase 2B as completed.

## 2. Profile Resolution Architecture
The newly created `getUserProfile()` function operates in Server Components/Actions contexts. It sequentially:
1. Validates the Supabase Auth session (`supabase.auth.getUser()`).
2. Fetches the linked `profiles` table row securely.
3. If an `org_id` exists on the profile, it fetches the corresponding `organizations` table row.
4. Returns a fully typed `ResolvedIdentity` object `(user, profile, role, organization)` or `null` gracefully on unauthenticated or missing/invalid profiles.

## 3. Role Resolution Architecture
Role resolution relies exclusively on the `profiles.role` column populated from the database. The frontend makes no assumptions. `getUserProfile()` strictly types the role as one of the supported Enums (`ACS_ADMIN`, `OEM`, `DEALER`, `PARTNER`, `TECHNICIAN`) and routes accordingly.

## 4. Relationship Mapping
- **ACS_ADMIN**: Resolves the profile with no strict org requirements.
- **OEM / DEALER / PARTNER**: Resolves the profile and joins their respective `organization` row via `org_id`.
- **TECHNICIAN**: Resolves the profile and joins the partner's `organization` row via `org_id`. (A Technician belongs to an Installation Partner).
- The `getUserProfile()` structure safely accommodates these combinations via the unified `organization` property.

## 5. AuthContext Dependencies Remaining
12 Client Components still consume `useAuth()` (including `Sidebar`, `Header`, `ProfileClient`, and various dashboard pages). As per instructions, these remain untouched in Phase 2B to maintain UI compatibility. We will incrementally convert these to Server Components utilizing `getUserProfile()` in upcoming phases.

## 6. MOCK_USERS Dependencies Remaining
`MOCK_USERS` in `src/lib/auth.tsx` is completely decoupled from identity validation. It currently only exists as a UI crutch to label users inside the Client dropdown, which will be safely stripped as we replace `AuthContext`.

## 7. Tests Performed
- **TypeScript compilation**: Clean, ensuring all `UserRole` and `OrgType` interfaces perfectly mirror the PostgreSQL Schema.
- **Architecture mapping**: Verified `0001_initial_schema.sql` relationships.

## 8. Build Result
`npm run build` executed and passed type-checking safely.

## 9. Issues Discovered
None currently. SSR isolation handles unauthenticated, unauthorized, or invalid states naturally without throwing uncaught UI exceptions.

## 10. Recommendation for Phase 2C
**Proceed to Phase 2C (ACS Admin Dashboard)**. 
- Convert `src/app/(dashboard)/admin/page.tsx` into a Server Component.
- Fetch statistics (Total Customers, Vehicles, Installations, etc.) directly using `getUserProfile()` and `supabase` server SDK.
- Render the numbers on the UI securely.
