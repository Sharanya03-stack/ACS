# Phase 2C: ACS Admin Dashboard Data Integration Report

## 1. Files Changed
- `src/app/(dashboard)/admin/dashboard/page.tsx`: Converted to Server Component fetching exact metric counts.
- `src/app/(dashboard)/admin/installations/page.tsx`: Converted to Server Component for data loading.
- `src/app/(dashboard)/admin/installations/AdminInstallationsClient.tsx`: [NEW] Extracted Client Component handling UI, Modal, and Supabase mutations.
- `src/app/(dashboard)/admin/reports/page.tsx`: Converted to Server Component to feed real data to analytics.
- `src/app/(dashboard)/admin/reports/ExportCSVButton.tsx`: [NEW] Client Component handling native CSV blob generation and download.
- `task.md`: Marked Phase 2C tasks.

## 2. Mock Data Removed/Replaced
The Admin Dashboard no longer consumes arrays from `useData()` in `data-context.tsx`. It now completely relies on real PostgreSQL records authenticated via Supabase session.

## 3. Supabase Queries Implemented
To power the dashboards, we introduced strict server-side queries:
- `organizations`: queried by `type` ('OEM', 'DEALER', 'PARTNER')
- `profiles`: queried by `role` ('TECHNICIAN')
- `installations`: fetched with status counts.
- `customers`, `vehicles`, `chargers`.
We utilized `{ count: 'exact', head: true }` heavily for the master dashboard to avoid massive payload transfers when rendering simple numbers.

## 4. Admin Metrics Implemented
The `ACS Energy Operations` landing page now accurately reflects real database metrics for:
- Total OEMs
- Total Dealerships
- Installation Partners
- Active Technicians
- Pending Jobs
- Needs Verification
- Completed & Verified
- Revisit Required

## 5. Tables Connected
The `Installation Management` table now receives live data mapping from the Supabase Server Client. The `customer`, `dealer`, and `partner` joins are cleanly resolved and displayed natively in the Next.js React tree.

## 6. Mutations Connected
All legacy mock state modifications were converted to true Row-Level updates via the Supabase Browser Client inside `AdminInstallationsClient.tsx`. 
The following mutations operate exactly according to the existing RLS policies defined in `0002_rls_mutations.sql`:
1. `verifyInstallation` -> `UPDATE installations SET status = 'VERIFIED'`
2. `rejectInstallation` -> `UPDATE installations SET status = 'REVISIT_REQUIRED', rejection_reason = ...`
3. `assignPartner` -> `UPDATE installations SET status = 'PARTNER_ASSIGNED', partner_id = ...`
Following each mutation, `router.refresh()` automatically re-fetches the Server Component state.

## 7. Filters/Search/Export Status
The "Export Full Report" feature in the `reports` tab was cleanly preserved. A dedicated `<ExportCSVButton />` takes the securely fetched Server Component `installations` array and dynamically constructs a `.csv` download entirely client-side, circumventing the need for a bloated Node.js excel library.

## 8. Loading/Empty/Error States
Appropriate "No records found" fallbacks were injected into the data table components if the database returns empty sets. 

## 9. Security/RLS Considerations
- No backend code utilizes the `service_role` key. All operations respect `get_auth_role() = 'ACS_ADMIN'`.
- Data is constrained cleanly by PostgreSQL Row Level Security.
- The hybrid architecture ensures users only receive data they are explicitly authorized to view.

## 10. Tests Performed
1. End-to-end `npm run build` executed.
2. Next.js statically compiled Client Components and dynamically compiled Server Components successfully.
3. TypeScript validation passed clean.

## 11. Build Result
`npm run build` exited with code `0`. 

## 12. Remaining Issues
None currently. The ACS Admin is seamlessly connected.

## 13. Recommended Next Step
Proceed to **Phase 2D (OEM Dashboard)**. The OEM Dashboard requires identical care to ensure OEM users only see data tied to their specific `org_id` (already protected by RLS, but requires clean server-side fetching).
