const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: vehicles } = await adminClient.from('vehicles').select('id, vin, model');
  const { data: chargers } = await adminClient.from('chargers').select('vehicle_id');
  
  const chargerVehicleIds = new Set(chargers.map(c => c.vehicle_id));
  const vehiclesWithoutChargers = vehicles.filter(v => !chargerVehicleIds.has(v.id));

  console.log('Total vehicles:', vehicles.length);
  console.log('Total chargers:', chargers.length);
  console.log('Distinct vehicle_ids in chargers:', chargerVehicleIds.size);
  console.log('Vehicles without chargers:', vehiclesWithoutChargers.length);
  
  if (vehiclesWithoutChargers.length > 0) {
      console.log('Available vehicles:', vehiclesWithoutChargers.map(v => v.vin).slice(0, 5));
  } else {
      console.log('No available vehicles.');
  }
}
check();
