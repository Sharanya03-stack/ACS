const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: users } = await adminClient.auth.admin.listUsers();
  const adminUser = users.users.find(u => u.email === 'admin@acsenergy.com');
  
  await adminClient.auth.admin.updateUserById(adminUser.id, { password: 'password123' });
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const client = createClient(supabaseUrl, anonKey);
  await client.auth.signInWithPassword({ email: adminUser.email, password: 'password123' });

  // Get a dealer and a customer to associate
  const { data: dealer } = await adminClient.from('organizations').select('id, parent_org_id').eq('type', 'DEALER').limit(1).single();
  const { data: customer } = await adminClient.from('customers').select('id').limit(1).single();

  const { data, error } = await client.from('vehicles').insert({
    vin: 'TESTVINACSADMIN99',
    model: 'Nexon EV',
    sale_date: '2026-08-25',
    delivery_date: '2026-08-25',
    dealer_id: dealer.id,
    oem_id: dealer.parent_org_id,
    customer_id: customer.id
  }).select();

  console.log('Result:', data, error);
}
check();
