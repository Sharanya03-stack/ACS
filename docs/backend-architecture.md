# ACS Energy Platform — Backend Architecture Blueprint

This document details the backend architecture, database schema, data models, and API strategy for the ACS Energy EV Charger Installation Platform. It serves as the blueprint for migrating the frontend prototype into a production-ready application.

---

## 1. System Architecture

**Recommendation: Supabase (PostgreSQL) + Next.js Server Actions / Route Handlers**

- **Database:** PostgreSQL (via Supabase) — robust relational data mapping.
- **Authentication:** Supabase Auth (`auth.users`).
- **Authorization:** PostgreSQL Row Level Security (RLS) enforcing the permission matrix at the database level.
- **Storage:** Supabase Storage for secure installation photos.
- **API Layer:** Next.js Server Actions for authenticated mutations. Route Handlers for specific HTTP flows (webhooks, file streams).

---

## 2. Entity List

1. **Profile:** Extends `auth.users` with role, organization, and profile data.
2. **Organization:** Represents OEMs, Dealers, and Partners.
3. **Customer:** The end-user receiving the EV and charger.
4. **Vehicle:** The EV sold to the customer.
5. **Charger:** The physical EV charger hardware.
6. **Installation:** The core job ticket.
7. **Installation Note:** Comments and status updates on an installation.
8. **Installation Checklist:** The 10-point quality checklist items.
9. **Installation Photo:** Metadata for images uploaded to storage.
10. **Audit Log:** Immutable record of critical system actions.

---

## 3. Complete Database Schema

*Note: Most entities include `deleted_at` and `deleted_by` to support the Soft-Delete Strategy.*

**1. organizations**
- `id` (UUID, PK)
- `type` (Enum: `OEM`, `DEALER`, `PARTNER`, `ACS`)
- `name` (String)
- `parent_org_id` (UUID, FK -> organizations.id, nullable)
- `contact_email`, `contact_phone`, `address`, `status`
- `created_at`, `updated_at`, `deleted_at`, `deleted_by`

**2. profiles**
- `id` (UUID, PK, FK -> auth.users.id)
- `role` (Enum: `ACS_ADMIN`, `OEM`, `DEALER`, `PARTNER`, `TECHNICIAN`)
- `org_id` (UUID, FK -> organizations.id, nullable for ACS_ADMIN)
- `name`, `phone`, `status`
- `created_at`, `updated_at`, `deleted_at`, `deleted_by`

**3. customers**
- `id` (UUID, PK)
- `dealer_id` (UUID, FK -> organizations.id)
- `name`, `phone`, `email`, `address`, `gps_location`
- `created_at`, `updated_at`, `deleted_at`, `deleted_by`

**4. vehicles**
- `id` (UUID, PK)
- `vin` (String, Unique)
- `customer_id` (UUID, FK -> customers.id)
- `model`, `sale_date`, `delivery_date`
- `created_at`, `updated_at`, `deleted_at`, `deleted_by`

**5. chargers**
- `id` (UUID, PK)
- `serial_number` (String, Unique)
- `vehicle_id` (UUID, FK -> vehicles.id)
- `model`, `power_rating`
- `created_at`, `updated_at`, `deleted_at`, `deleted_by`

**6. installations**
- `id` (UUID, PK)
- `status` (Enum)
- `customer_id`, `vehicle_id`, `charger_id` (UUIDs, FKs)
- `dealer_id`, `oem_id` (UUIDs, FKs - denormalized)
- `partner_id` (UUID, FK -> organizations.id, nullable)
- `technician_id` (UUID, FK -> profiles.id, nullable)
- `scheduled_date`, `started_at`, `completed_at`, `verified_at`
- `rejection_reason` (String, nullable)
- `created_at`, `updated_at`, `deleted_at`, `deleted_by`

**7. installation_notes**
- `id` (UUID, PK)
- `installation_id` (UUID, FK)
- `created_by` (UUID, FK -> profiles.id)
- `content`
- `created_at`, `updated_at`, `deleted_at`, `deleted_by`

---

## 4. Entity Relationships

- **auth.users ↔ profiles:** 1:1 relationship.
- **organizations (OEM) ↔ organizations (Dealer):** 1:N via `parent_org_id`.
- **organizations ↔ profiles:** 1:N via `org_id`.
- **organizations (Dealer) ↔ customers:** 1:N via `dealer_id`.
- **customers ↔ vehicles:** 1:N via `customer_id`.
- **vehicles ↔ chargers:** 1:1 via `vehicle_id`.
- **installations ↔ organizations / profiles / customers:** N:1 mapping the job to the respective stakeholders.

---

## 5. Profiles / Auth Model

The system utilizes Supabase Auth natively. 
- The `auth.users` table handles email/password and authentication sessions.
- The `profiles` table maps 1:1 to `auth.users.id`. It contains business-level identity (`role`, `org_id`, `name`). 
- **DO NOT** create an independent users table.

---

## 6. Organization Hierarchy

- **ACS Admin:** Independent (`org_id` = null) with global access.
- **OEM:** Top-level organization.
- **Dealership:** Belongs to one OEM (`parent_org_id` = OEM_ID).
- **Installation Partner:** Independent organization assigned to jobs dynamically via `installations.partner_id`.
- **Technician:** A profile where `role = TECHNICIAN` and `org_id = Partner_ID`.

---

## 7. RBAC

- **ACS Admin:** Global access.
- **OEM User:** Access restricted to their OEM data.
- **Dealer User:** Access restricted to their dealership data.
- **Partner User:** Operational access restricted to assigned installations and their technicians.
- **Technician:** Access strictly limited to their assigned installations.

---

## 8. Detailed RLS Strategy

Authorization will be strictly enforced at the PostgreSQL RLS level. We will **NOT** rely on JWT metadata (`auth.jwt().user_metadata.org_id`). Instead, policies will join against the `profiles` table using `auth.uid()`.

### Example RLS Strategy
```sql
-- Example: Read access to Installations
CREATE POLICY "Installations Read Access" ON installations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'ACS_ADMIN' OR
      (profiles.role = 'OEM' AND installations.oem_id = profiles.org_id) OR
      (profiles.role = 'DEALER' AND installations.dealer_id = profiles.org_id) OR
      (profiles.role = 'PARTNER' AND installations.partner_id = profiles.org_id) OR
      (profiles.role = 'TECHNICIAN' AND installations.technician_id = profiles.id)
    )
  )
);
```

### Data Isolation
- **OEM Isolation:** Tata OEM cannot see MG OEM data because the RLS policy strictly checks `installations.oem_id = profiles.org_id`. 
- **Dealer Isolation:** A dealer only sees records where `dealer_id` matches their `org_id`.
- **Partner Isolation:** Partners only see installations where `partner_id` matches their `org_id`.
- **Technician Isolation:** Technicians only see installations where `technician_id` exactly matches their profile `id` (`auth.uid()`).

### Enforcing OEM ↔ Dealer Consistency
The `installations` table stores both `dealer_id` and `oem_id`. An invariant must exist: `installation.oem_id` must match the OEM parent of `installation.dealer_id`.
- **Enforcement:** A database Trigger `BEFORE INSERT OR UPDATE` on `installations` will verify that `NEW.oem_id == (SELECT parent_org_id FROM organizations WHERE id = NEW.dealer_id)`. Alternatively, a strict FK check or secure Server Action validation will enforce this.

---

## 9. Installation State Machine

**Transitions:**
- `NEW` → `PARTNER_ASSIGNED` (By: ACS, Dealer. Required: `partner_id`)
- `PARTNER_ASSIGNED` → `TECHNICIAN_ASSIGNED` (By: Partner. Required: `technician_id`)
- `TECHNICIAN_ASSIGNED` → `SCHEDULED` (By: Partner, Tech. Required: `scheduled_date`)
- `SCHEDULED` → `IN_PROGRESS` (By: Tech. Action: Start job)
- `IN_PROGRESS` → `COMPLETED` (By: Tech. Required: All required checklist items = YES/NA, Required photos uploaded)
- `COMPLETED` → `UNDER_VERIFICATION` (By: System/ACS immediately upon completion review queue)
- `UNDER_VERIFICATION` → `VERIFIED` (By: ACS)

**Alternative Paths:**
- `UNDER_VERIFICATION` → `REVISIT_REQUIRED` (By: ACS, Dealer, Partner. Required: `rejection_reason`)
- `REVISIT_REQUIRED` → `SCHEDULED` (By: Partner, Tech. Required: new `scheduled_date`)
- Any pre-completion state → `CANCELLED` (By: ACS, Dealer)
- Any active state → `ON_HOLD` (By: ACS, Partner, Dealer)

---

## 10. Installation Checklist Schema

**Table: `installation_checklists`**
- `id` (UUID, PK)
- `installation_id` (UUID, FK)
- `item_code` (String, e.g., `WIRING_CHECK`)
- `item_name` (String)
- `status` (Enum: `PENDING`, `YES`, `NO`, `N/A`)
- `is_required` (Boolean)
- `remarks` (String, nullable)
- `checked_by` (UUID, FK -> profiles.id)
- `checked_at` (Timestamp)
- `created_at`, `updated_at`

**Rules:**
- **Updates:** Only the assigned Technician can update checklist items while the installation is `IN_PROGRESS` or `REVISIT_REQUIRED`.
- **Locking:** Once the installation reaches `COMPLETED`, checklist items are locked and read-only.
- **Completion Validation:** An installation cannot transition to `COMPLETED` unless all items where `is_required = true` have a status of `YES` or `N/A`. A `NO` or `PENDING` blocks completion.

---

## 11. Photo/Storage Architecture

**Storage Bucket:** Supabase Storage (`installation-photos`).

**Upload Flow:**
1. Technician initiates upload from the app.
2. Server Action / Route Handler verifies Authorization (Must be Technician AND `installation.technician_id == auth.uid()`).
3. App uploads directly to Supabase Storage via signed URL or secure path.
4. Supabase DB trigger or secondary server action writes metadata to `installation_photos`.

**Table: `installation_photos` (Metadata)**
- `id` (UUID, PK)
- `installation_id` (UUID, FK)
- `uploaded_by` (UUID, FK -> profiles.id)
- `category` (String, e.g., 'METER_BOX')
- `storage_path` (String)
- `file_type` (String)
- `file_size` (Integer)
- `uploaded_at` (Timestamp)

**Rules:**
- **Formats:** JPEG, PNG.
- **Maximum Size:** 5MB per file.
- **File Naming:** `{installation_id}/{category}_{timestamp}.jpg`
- **Read Permissions:** ACS (all), OEM/Dealer (own installations), Partner (assigned), Tech (assigned).
- **Delete/Replace:** Technicians can delete/replace their own photos *only* if the installation is not yet `COMPLETED`.

---

## 12. Audit Logging

**Table: `audit_logs`**
Records critical actions immutably. Should be populated via PostgreSQL Triggers for consistency, ensuring no action is missed.
- `id`, `user_id`, `action`, `entity_type`, `entity_id`, `old_value`, `new_value`, `created_at`.
- **Immutability:** RLS prevents DELETE or UPDATE on this table. 

---

## 13. Soft-Delete Strategy

Normal application operations will utilize soft deletes. 
- Business entities (`customers`, `vehicles`, `chargers`, `installations`, `organizations`, `profiles`) include `deleted_at` (Timestamp) and `deleted_by` (UUID).
- RLS policies will universally append `AND deleted_at IS NULL` for standard `SELECT` queries.
- **Restrictions:** Completed or verified installations cannot be soft-deleted. Audit logs cannot be deleted at all.

---

## 14. Server Actions vs Route Handlers

- **Next.js Server Actions:** Will be used for all standard authenticated application mutations (e.g., Create Customer, Update Status, Assign Tech, Submit Checklist). Server Actions provide strong typing and seamless integration with React forms/transitions.
- **Next.js Route Handlers (`/api/*`):** Will be strictly reserved for HTTP endpoints where standard REST interfaces are required, such as webhook receivers, specialized file upload streaming flows, external integrations, or future public APIs.

---

## 15. API / Action Specification

*Example Server Actions:*

- `createInstallation(data: InstallationInput)`
  - **Allowed:** ACS, Dealer. 
  - **Behavior:** Validates inputs, determines OEM constraint, inserts into `installations`.
- `assignPartner(installationId, partnerId)`
  - **Allowed:** ACS.
  - **Behavior:** Updates `partner_id`, changes status to `PARTNER_ASSIGNED`.
- `updateInstallationStatus(installationId, status)`
  - **Behavior:** Enforces state machine transitions. Validates checklist and photos for `COMPLETED`.
- `updateChecklistItem(itemId, status, remarks)`
  - **Allowed:** Assigned Technician.
  - **Behavior:** Updates `installation_checklists` record if installation is unlocked.

---

## 16. Frontend-to-Backend Mapping

- `src/lib/data-context.tsx` → Will be entirely removed. Data will be fetched server-side in Server Components or client-side via React hooks calling Server Actions.
- Dashboards → Server Components will securely fetch aggregated stats directly from Supabase, respecting RLS.
- Forms → Will be updated to use Next.js `useActionState` or direct Server Action invocations.

---

## 17. Migration Order

1. `organizations`
2. `profiles`
3. `customers`
4. `vehicles`
5. `chargers`
6. `installations`
7. `installation_notes`
8. `installation_checklists`
9. `installation_photos`
10. `audit_logs`

---

## 18. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-secret-service-key" # DO NOT EXPOSE TO CLIENT
```

---

## 19. Security Considerations

- RLS must be heavily tested to ensure data isolation.
- Prevent IDOR (Insecure Direct Object Reference) by relying on RLS rather than application-layer filtering.
- Prevent State Machine bypass via strict database constraints or centralized server-action logic.

---

## 20. Client Confirmation Questions

Before implementing specific features, confirm:
1. **"Optional" OEM Creation:** Keep OFF for MVP.
2. **"Limited" Editing:** Implemented as instructed: Dealer can edit Customer info / scheduled date. OEM can edit priority / remarks. Restricted heavily once `IN_PROGRESS`.
3. **Partner Assignment Acceptance:** After ACS assigns an installation partner, does the partner automatically accept the job, or should the partner explicitly accept/reject the assignment? (If explicit, we need new statuses: `PARTNER_ACCEPTED` / `PARTNER_REJECTED`).

---

## 21. Phase 1 Implementation Plan

1. Create Supabase Project.
2. Setup database schema (`.sql` migration scripts).
3. Implement Row Level Security (RLS) policies.
4. Integrate Supabase Auth into the Next.js app (replace `auth.tsx` with `@supabase/ssr`).

---

### Architecture Status

The blueprint has been comprehensively reviewed and corrected based on all guidelines. 

**Status:** The backend blueprint is now finalized and READY FOR IMPLEMENTATION. 

Pending your explicit approval, we will proceed to Phase 1: Supabase Setup and Database Migrations.
