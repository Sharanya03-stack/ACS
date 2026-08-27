import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- 2. ALL ORGANIZATIONS ---');
  const { data: orgs, error: e1 } = await supabase.from('organizations').select('id, name, type');
  console.log('Orgs error:', e1);
  console.log('Orgs:', orgs?.filter(o => o.type === 'OEM' || o.type === 'DEALER'));

  console.log('--- 3. ALL PROFILES ---');
  const { data: profiles, error: e2 } = await supabase.from('profiles').select('id, role, org_id');
  console.log('Profiles error:', e2);
  console.log('Profiles:', profiles);

}
main().catch(console.error);
