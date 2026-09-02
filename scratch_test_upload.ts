import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const file = new Blob(['test'], { type: 'image/png' });
  const { data, error } = await supabase.storage.from('installation-evidence').upload('test/test.png', file, { upsert: true });
  console.log("Upload error:", error);
}

run();
