const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  const adminClient = createClient(supabaseUrl, serviceKey);
  const dealerUser = (await adminClient.auth.admin.listUsers()).data.users.find(u => u.email === 'dealer@tata.com');
  
  await adminClient.auth.admin.updateUserById(dealerUser.id, { password: 'password123' });
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const client = createClient(supabaseUrl, anonKey);
  await client.auth.signInWithPassword({ email: dealerUser.email, password: 'password123' });

  // Call the function via RPC
  const { data: orgId, error } = await client.rpc('get_auth_org_id');
  console.log('get_auth_org_id returned:', orgId, error);
}
check();
