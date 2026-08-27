const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: chargers, error } = await adminClient
    .from('chargers')
    .select('id, serial_number, vehicle_id, customer_id, deleted_at')
    .is('deleted_at', null)
    .limit(1);
  
  if (chargers && chargers.length > 0) {
    console.log('Existing charger found:', chargers[0]);
    const { data: duplicateTest, error: dupError } = await adminClient
        .from('chargers')
        .insert({
            serial_number: 'DUP_TEST_' + Date.now(),
            model: 'Dup Model',
            power_rating: 7.4,
            vehicle_id: chargers[0].vehicle_id,
            customer_id: chargers[0].customer_id,
            supplied_date: new Date().toISOString()
        })
        .select();
    
    console.log('Result of trying to insert another charger for this vehicle:', duplicateTest, dupError);
  }
}
check();
