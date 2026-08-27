import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- 2. TATA OEM PROFILE ---');
  const { data: oemRes } = await supabase.from('organizations').select('id, name').eq('name', 'Tata Motors (OEM)').single();
  const oemId = oemRes?.id;
  
  if (oemId) {
    const { data: profileRes } = await supabase.from('profiles').select('id, role, org_id').eq('org_id', oemId).single();
    console.log(profileRes);

    console.log('--- 3. TATA DEALERSHIPS ---');
    const { data: dealerRes } = await supabase.from('organizations').select('id, name, type, parent_org_id, deleted_at').eq('parent_org_id', oemId);
    console.log(dealerRes);
  }
}
main().catch(console.error);
