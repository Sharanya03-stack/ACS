
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
async function run() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Delete one installation to free up a charger (e.g. for Tata Dealer's charger)
  await admin.from('installations').delete().eq('charger_id', '4b2bdd95-f049-48a2-b520-0221b1997a8e');
  
  // Now query as dealer
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  await supabase.auth.signInWithPassword({ email: 'dealer@tata.com', password: 'password123' });
  
  const { data, error } = await supabase.from('chargers').select('id, serial_number, model, power_rating, customers ( name ), vehicles ( vin, model ), installations ( id )').or('power_rating.eq.3.3,power_rating.eq.3.3kW');
  console.log('Dealer Chargers data:', JSON.stringify(data, null, 2));
}
run();

