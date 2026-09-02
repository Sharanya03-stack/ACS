import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  try {
    const adminClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: {} } as any
    );
    const { data } = await adminClient.from('profiles').select('id').limit(1);
    console.log("Success", data);
  } catch (err) {
    console.error("Caught error:", err);
  }
}
run();
