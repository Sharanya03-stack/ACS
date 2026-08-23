# Phase 3H — Reporting, Filters, Search & Excel Export

This plan details the implementation of server-side filtering, searching, pagination, and Excel export for the Installation workflows across all dashboards (Admin, OEM, Dealer, Partner, Technician).

## User Review Required
No critical architectural breaking changes, but the strategy for data fetching will change from loading all rows into Client Components to server-side paginated queries. Please confirm that a CSV file (which opens directly in Excel) is sufficient for the "Excel Export", as it avoids adding heavy node modules like `xlsx` and keeps the build lean.

## Proposed Changes

### 1. Supabase Query Layer (Data Fetching)

We will implement a unified data-fetching utility `getInstallations` in `src/utils/queries.ts` (or similar) that handles:
- **Pagination**: `.range(offset, offset + limit - 1)`
- **Filtering**: By `status`, `category`, and organization IDs (`oem_id`, `dealer_id`, `partner_id`, `technician_id`).
- **Date Range**: `.gte('created_at', start).lte('created_at', end)`
- **Search**: Uses Supabase relational filtering to match `customer.first_name`, `customer.last_name`, `vehicles.vin`, `chargers.serial_number`, or `installations.id`.
- **Joins**: Instead of querying all tables separately, we will use Supabase joins (`customer:customers(*)`, etc.) to fetch exactly what is needed for the page.

### 2. Dashboard Page Server Components

Files to modify:
- `src/app/(dashboard)/admin/installations/page.tsx`
- `src/app/(dashboard)/dealer/installations/page.tsx`
- `src/app/(dashboard)/partner/dashboard/page.tsx`
- `src/app/(dashboard)/technician/dashboard/page.tsx`
- `src/app/(dashboard)/oem/dashboard/page.tsx`

We will update these files to:
- Read `searchParams` (`page`, `search`, `status`, etc.).
- Call the unified data-fetching utility.
- Pass the paginated `installations` and a `totalPages` count to the Client Components.

### 3. Dashboard Client Components (UI)

We will update the Client Components (e.g., `AdminInstallationsClient.tsx`, `PartnerDashboardClient.tsx`, etc.) to:
- Remove client-side in-memory filtering.
- Add a new `<InstallationFilters>` component for search inputs, status dropdowns, and date pickers.
- Add a `<Pagination>` component to navigate pages (using `router.push('?page=2...')`).
- Add an `Export to Excel` button.

### 4. Excel Export Action

We will create a Server Action in `src/app/actions/exportInstallations.ts`:
- Takes the current filter/search parameters.
- Re-runs the unified query *without* pagination (or a very high limit like 10,000 to prevent timeouts).
- Relies exclusively on the authenticated user's session, guaranteeing that RLS policies enforce tenant isolation (e.g. OEMs only export their own OEM data).
- Formats the dataset into a CSV string and returns it to the client for download.

### 5. Dashboard Metrics

We will update the dashboard metric cards to dynamically calculate totals based on the authorized dataset. We will fetch a lightweight aggregate of `status` counts to display "Total", "Pending", "In Progress", "Verified", etc.

## Verification Plan

### Automated Tests
- Run `npm run build` to ensure no TypeScript regressions.

### Manual Verification
- Log in as `ACS_ADMIN` and verify global search and export works.
- Log in as `DEALER` and confirm that filtering and exporting ONLY shows their own dealership's data.
- Test the Search input with a specific customer name and VIN.
- Verify Pagination controls correctly update the URL and load the next page of results.
- Export data and verify the CSV contains the correct filtered rows.
