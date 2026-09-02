import { createClient } from '@supabase/supabase-js';
try {
  createClient('https://example.supabase.co', undefined as any);
} catch (e: any) {
  console.log("Caught:", e.message);
}
