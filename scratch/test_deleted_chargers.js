const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await adminClient.from('chargers').select('vehicle_id').not('deleted_at', 'is', null).limit(1);
  console.log('Deleted chargers:', data);
  // Let's just find ALL active chargers
  const { data: activeChargers } = await adminClient.from('chargers').select('vehicle_id').is('deleted_at', null);
  console.log('Total active chargers:', activeChargers.length);
}
check();
