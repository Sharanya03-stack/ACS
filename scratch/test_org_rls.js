const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  const adminClient = createClient(supabaseUrl, serviceKey);
  
  // Login as dealer
  const { data: { user }, error: uErr } = await adminClient.auth.admin.listUsers();
  const dealerUser = user || (await adminClient.auth.admin.listUsers()).data.users.find(u => u.email === 'dealer@tata.com');
  
  await adminClient.auth.admin.updateUserById(dealerUser.id, { password: 'password123' });
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const client = createClient(supabaseUrl, anonKey);
  await client.auth.signInWithPassword({ email: dealerUser.email, password: 'password123' });

  const { data: p } = await client.from('profiles').select('org_id').single();
  console.log('Profile org_id:', p?.org_id);
  
  const { data: org, error } = await client.from('organizations').select('parent_org_id').eq('id', p.org_id).single();
  console.log('Org Query Result:', org, error);
}
check();
