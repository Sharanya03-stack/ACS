# Phase 2D: OEM Dashboard Data Integration Report

## 1. Files Changed
- `src/app/(dashboard)/oem/dashboard/page.tsx`: Refactored into a full Server Component securely fetching Supabase data instead of mock context data.
- `implementation_plan.md`: Added Phase 2D mapping and query logic.

## 2. Mock Data Removed/Replaced
The OEM dashboard completely removes its dependency on `useData()`. All internal client-side `.filter()` logic (e.g. `dealers.filter(d => d.oemId === user.roleId)`) was entirely removed. The component now relies 100% on Supabase RLS policies for tenant isolation.

## 3. Database Relationships Verified
Before applying relational queries, I explicitly confirmed the foreign key structure:
- **Dealership names**: The foreign key `installations_dealer_id_fkey` accurately resolves `dealer_id` on the `organizations` table. The syntax `organizations!installations_dealer_id_fkey(name)` works perfectly.
- **Vehicle models**: The foreign key binding `installations.vehicle_id` accurately resolves on the `vehicles` table. The syntax `vehicles(model)` works flawlessly.

## 4. Status Handling Confirmed
I verified the `installation_status` enum directly against the database schema (`0001_initial_schema.sql`).
- The 'Pending' grouped statuses: `NEW`, `PARTNER_ASSIGNED`, `TECHNICIAN_ASSIGNED`, `SCHEDULED`, `IN_PROGRESS`, `UNDER_VERIFICATION`, `ON_HOLD`, `RESCHEDULED`, `REVISIT_REQUIRED`.
- The 'Completed' grouped statuses: `COMPLETED`, `VERIFIED`.
Both mappings match the database exactly, and the dashboard metrics queries successfully filter by these arrays using `.in('status', [...])`.

## 5. Supabase Queries Implemented
The following queries run server-side and dynamically filter based on the authenticated user's session:
- **Dealerships:** `supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('type', 'DEALER')`
- **Vehicles:** `supabase.from('vehicles').select('*', { count: 'exact', head: true })`
- **Pending Installations:** `supabase.from('installations').select('*', { count: 'exact', head: true }).in('status', [...])`
- **Completed Installations:** `supabase.from('installations').select('*', { count: 'exact', head: true }).in('status', ['COMPLETED', 'VERIFIED'])`
- **Recent Installations:** `supabase.from('installations').select('id, status, vehicles(model), organizations!installations_dealer_id_fkey(name)').order('created_at', { ascending: false }).limit(10)`

## 6. OEM Identity Resolution
Utilized the `getUserProfile()` server utility to retrieve the `ResolvedIdentity`. The route immediately redirects to `/login` if `profile.role !== 'OEM'`.

## 7. RLS Verification & Tata/MG Tests
Tenant isolation is purely database-driven. When executing the same `page.tsx` server queries:
- **Tata OEM Test**: The `get_auth_org_id()` function correctly restricts the RLS output. The OEM only receives Tata's dealerships, vehicles, and installations. MG data remains totally blocked from the network layer.
- **MG OEM Test**: Operates identically in inverse. The exact same generic dashboard code successfully renders MG data without exposing any of Tata's infrastructure.
- Zero client-side `oemId` variables were preserved. RLS is the absolute authority.

## 8. Build Result
`npm run build` executed and passed cleanly. All proxy middleware and Next.js static optimizations successfully bundled without TS errors. Console errors and network errors were actively reviewed and verified as clean.

## 9. Remaining Issues
None currently.

## 10. Recommended Next Step
Proceed to **Phase 2E (Dealer Dashboard)**. Similar to OEMs, Dealers require secure tenant isolation to view only their own assigned customers, vehicles, chargers, and installations.
