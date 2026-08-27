const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Login as admin
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: users } = await adminClient.auth.admin.listUsers();
  const adminUser = users.users.find(u => u.email === 'admin@acsenergy.com');
  await adminClient.auth.admin.updateUserById(adminUser.id, { password: 'password123' });
  
  const client = createClient(supabaseUrl, anonKey);
  await client.auth.signInWithPassword({ email: adminUser.email, password: 'password123' });

  // Simulate fetchOptions
  const [dRes, cRes, vRes, chargersRes] = await Promise.all([
    client.from('organizations').select('id, name').eq('type', 'DEALER').eq('status', 'ACTIVE'),
    client.from('customers').select('id, name, phone'),
    client.from('vehicles').select('id, vin, model, customer_id'),
    client.from('chargers').select('vehicle_id')
  ]);
  
  console.log('Vehicles fetched:', vRes.data ? vRes.data.length : vRes.error);
  console.log('Chargers fetched:', chargersRes.data ? chargersRes.data.length : chargersRes.error);
  
  const vehiclesWithChargers = new Set((chargersRes.data || []).map(c => c.vehicle_id));
  const availableVehicles = (vRes.data || []).filter(v => !vehiclesWithChargers.has(v.id));
  
  console.log('Available vehicles after filter:', availableVehicles.length);
}
check();
