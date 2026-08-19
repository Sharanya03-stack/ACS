# Phase 2E: Dealer Dashboard Data Integration Plan

This phase connects the Dealer dashboard and its sub-pages to the live Supabase backend. The dealer dashboard allows dealers to view their sales (vehicles) and track installations, as well as register new sales which automatically provisions customer, vehicle, charger, and installation records.

## User Review Required
No major architectural shifts, but please review the component mapping to ensure all required fields are preserved properly. RLS will act as the absolute boundary. The mutation for New Vehicle Sale will be implemented using Server Actions for secure processing.

## Proposed Changes

### UI Component to Database Mapping

1. **Dealer Dashboard (`src/app/(dashboard)/dealer/dashboard/page.tsx`)**
   - **Current:** Uses `useData()` and filters by `user?.roleId`.
   - **New:** Server Component using `getUserProfile()`.
   - **Total EV Sales:** `supabase.from('vehicles').select('*', { count: 'exact', head: true })`
   - **Pending Installations:** `supabase.from('installations').select('*', { count: 'exact', head: true }).not('status', 'in', '("COMPLETED","VERIFIED","CANCELLED","FAILED")')`
   - **Completed Installations:** `supabase.from('installations').select('*', { count: 'exact', head: true }).in('status', ['COMPLETED', 'VERIFIED'])`
   - **RLS Expected Result:** RLS naturally limits to `dealer_id = get_auth_org_id()`.

2. **Dealer Installations (`src/app/(dashboard)/dealer/installations/page.tsx`)**
   - **Current:** Uses `useData()`, filters by `dealerId`.
   - **New:** Server Component fetching live relational data.
   - **Query:** `supabase.from('installations').select('id, status, created_at, vehicles(model), customers(name, phone)')`
   - **RLS Expected Result:** Only rows where `dealer_id = get_auth_org_id()` are returned.

3. **Dealer Sales / New Request (`src/app/(dashboard)/dealer/sales/page.tsx`)**
   - **Current:** Uses `useData()` and `createVehicleSale` to write to mock context.
   - **New:** Client Component for the form, wired to a Server Action. The Server Action (`createSaleRequest`) will:
     1. Retrieve the authenticated user's `dealer_id` and the dealer's `parent_org_id` (OEM).
     2. Insert `customer` record (RLS verifies `dealer_id = auth_org_id`).
     3. Insert `vehicle` record (RLS verifies `dealer_id` and valid `customer_id`).
     4. Insert `charger` record (RLS verifies `customer_id`).
     5. Insert `installation` record (RLS verifies `dealer_id`).
   - **RLS Expected Result:** The mutations will succeed if the server explicitly passes the authenticated user's `org_id` as the `dealer_id`. Any attempt to pass an arbitrary `dealer_id` will fail RLS.

### Component Structure Changes

#### [MODIFY] src/app/(dashboard)/dealer/dashboard/page.tsx
Convert to a Server Component and fetch aggregate counts directly via Supabase using exact counting.

#### [MODIFY] src/app/(dashboard)/dealer/installations/page.tsx
Convert to a Server Component, load `installations` securely, displaying `vehicles` and `customers` fields via foreign key expansion.

#### [MODIFY] src/app/(dashboard)/dealer/sales/page.tsx
Refactor to use a Server Action `createSaleAction(formData)` defined in a separate file (e.g. `actions.ts`) or within the page file using `"use server"`. The form will securely insert the records in a single transaction-like flow.

#### [NEW] src/app/(dashboard)/dealer/sales/actions.ts
Will contain the `createSaleAction` logic to interact with the Supabase client and perform the INSERTS for Customer, Vehicle, Charger, and Installation.

## Verification Plan

### Automated Tests
- Run `npm run build` and resolve any TS errors.
- Check console logs.

### Manual Verification
- Test login as Tata Dealer and verify that ONLY Tata Dealer's customers, vehicles, and installations are visible.
- Test login as MG Dealer and verify the same.
- Test submitting a new sale via the Sales form and ensure it populates across all relevant tables seamlessly without RLS errors.
