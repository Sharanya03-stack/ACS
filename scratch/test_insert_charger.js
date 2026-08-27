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

  // Get a vehicle and its exact customer
  const { data: vehicle } = await adminClient.from('vehicles').select('id, customer_id').not('customer_id', 'is', null).limit(1).single();

  console.log('Testing with Vehicle:', vehicle.id, 'Customer:', vehicle.customer_id);

  const { data, error } = await client.from('chargers').insert({
    serial_number: 'TESTCHG1',
    model: 'Test Model',
    power_rating: 7.4,
    vehicle_id: vehicle.id,
    customer_id: vehicle.customer_id,
    supplied_date: '2026-08-25'
  }).select();

  console.log('Result of matching insert:', data, error);

  // Get another customer
  const { data: otherCustomer } = await adminClient.from('customers').select('id').neq('id', vehicle.customer_id).limit(1).single();

  const { data: data2, error: error2 } = await client.from('chargers').insert({
    serial_number: 'TESTCHG2',
    model: 'Test Model',
    power_rating: 7.4,
    vehicle_id: vehicle.id,
    customer_id: otherCustomer.id,
    supplied_date: '2026-08-25'
  }).select();

  console.log('Result of mismatched insert:', data2, error2);
}
check();
