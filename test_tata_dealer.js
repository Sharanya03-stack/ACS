
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  await supabase.auth.signInWithPassword({ email: 'dealer@tata.com', password: 'password123' });
  const { data, error } = await supabase.from('chargers').select('id, serial_number, model, power_rating, customers ( name ), vehicles ( vin, model ), installations ( id )').or('power_rating.eq.3.3,power_rating.eq.3.3kW');
  console.log('Data length:', data ? data.length : 0);
  console.log('Data:', JSON.stringify(data, null, 2));
}
run();

