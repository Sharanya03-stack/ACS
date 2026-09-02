
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
async function run() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // 1. Create a customer for dealer
  const { data: customer, error: cErr } = await admin.from('customers').insert({
    dealer_id: '8fb9c1f5-6ffa-408e-a6b3-b07b6bb3332c',
    name: 'Unassigned Customer',
    phone: '1234567891'
  }).select('id').single();
  if (cErr) console.log('Customer error:', cErr);
  
  // 2. Create a vehicle
  const { data: vehicle, error: vErr } = await admin.from('vehicles').insert({
    customer_id: customer.id,
    vin: 'VIN-UNASSIGNED2',
    model: 'Test Model'
  }).select('id').single();
  if (vErr) console.log('Vehicle error:', vErr);
  
  // 3. Create a 3.3kW charger
  const { data: charger, error: chErr } = await admin.from('chargers').insert({
    customer_id: customer.id,
    vehicle_id: vehicle.id,
    serial_number: 'CHG-UNASSIGNED2',
    model: '3.3kW AC Wallbox',
    power_rating: '3.3kW',
    supplied_date: new Date().toISOString()
  }).select('id').single();
  if (chErr) console.log('Charger error:', chErr);
  
  console.log('Created unassigned charger:', charger.id);
  
  // 4. Test query as dealer
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  await supabase.auth.signInWithPassword({ email: 'dealer@tata.com', password: 'password123' });
  
  const { data, error } = await supabase.from('chargers').select('id, serial_number, model, power_rating, customers ( name ), vehicles ( vin, model ), installations ( id )').or('power_rating.eq.3.3,power_rating.eq.3.3kW');
  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data, null, 2));
}
run();

