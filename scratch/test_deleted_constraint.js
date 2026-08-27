const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Find a vehicle with NO chargers
  const { data: chargers } = await adminClient.from('chargers').select('vehicle_id');
  const chargerVehicles = chargers.map(c => c.vehicle_id);

  const { data: vehicles } = await adminClient.from('vehicles').select('id, customer_id');
  const emptyVehicle = vehicles.find(v => !chargerVehicles.includes(v.id));

  if (!emptyVehicle) { console.log('No empty vehicle'); return; }

  console.log('Testing with vehicle:', emptyVehicle.id);

  // Insert a DELETED charger
  await adminClient.from('chargers').insert({
    serial_number: 'DEL_' + Date.now(),
    model: 'Del Model',
    power_rating: 7.4,
    vehicle_id: emptyVehicle.id,
    customer_id: emptyVehicle.customer_id,
    supplied_date: new Date().toISOString(),
    deleted_at: new Date().toISOString()
  });

  // Now try to insert an ACTIVE charger
  const { data, error } = await adminClient.from('chargers').insert({
    serial_number: 'ACT_' + Date.now(),
    model: 'Act Model',
    power_rating: 7.4,
    vehicle_id: emptyVehicle.id,
    customer_id: emptyVehicle.customer_id,
    supplied_date: new Date().toISOString()
  }).select();

  console.log('Result of inserting active after deleted:', error ? error : 'Success!');
}
check();
