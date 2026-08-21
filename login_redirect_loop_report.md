# Login Redirect Loop Investigation Report

## 1. Root Cause
The application uses the `profiles` table to determine the `role` of the authenticated user. This logic is used in `src/app/(auth)/login/page.tsx`, `src/utils/supabase/middleware.ts`, and `src/app/page.tsx`.

During investigation, we discovered that while the `auth.users` table contained the required test users (e.g., `admin@acsenergy.com`), the `public.profiles` and `public.organizations` tables in the remote Supabase database were entirely empty (0 rows).

Because the user profile was missing:
1. The user successfully authenticated via `signInWithPassword` in `login/page.tsx`.
2. The client-side logic queried `profiles` for the user's role, but returned `null`.
3. Without a valid role, the client fell back to routing to the root path (`router.push("/")`).
4. The root page (`src/app/page.tsx`) attempted to load the profile via SSR, failed (due to 0 rows), and redirected the user back to `/login`.
5. If the user tried to bypass this by navigating directly to `/admin/dashboard`, `src/app/(dashboard)/layout.tsx` also failed to fetch the profile and explicitly redirected them back to `/login`.

This created a continuous redirect loop. The underlying authentication architecture and middleware are functioning correctly and securely—they are properly rejecting authenticated users who lack authorization roles in the database.

## 2. Files Changed
No core application code needed to be modified, as the issue was purely state-based in the remote database.

- **`seed.js` (NEW)**: Created and executed a one-off Node.js script using the `SUPABASE_SERVICE_ROLE_KEY` to populate the `public.organizations` and `public.profiles` tables for the 5 core test users (`admin@acsenergy.com`, `oem@tata.com`, `dealer@tata.com`, `partner@voltcharge.com`, `tech@voltcharge.com`).
- **`check_db.js` (NEW)**: Created and executed temporary diagnostic scripts to verify database state and RLS behaviors.

## 3. Test Results
- **Static Verification**: Audited `src/utils/supabase/middleware.ts`, `src/app/(dashboard)/layout.tsx`, and `src/app/(auth)/login/page.tsx`. All route protection and redirect logic is logically sound.
- **Database Inspection**: Verified via API that `auth.users` contained 26 users, but `profiles` contained 0 rows.
- **Seeding Execution**: Successfully executed `seed.js` to create the missing organization and profile records.
- **Authentication Validation**: Executed a script that authenticates as `admin@acsenergy.com` using `signInWithPassword` and successfully fetched the user's profile, proving that RLS policies are evaluating correctly and there is no infinite recursion in `get_auth_role()`.
- **Build Verification**: Ran `npm run build`, which compiled successfully without errors.

The login redirect loop is fully resolved for the test users. You can now log into the application using the predefined UI credentials.
