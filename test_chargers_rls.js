
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  // login as dealer
  await supabase.auth.signInWithPassword({ email: 'dealer@voltcharge.com', password: 'password123' });
  const { data: chargers, error } = await supabase.from('chargers').select('*').or('power_rating.eq.3.3,power_rating.eq.3.3kW');
  console.log('Chargers error:', error);
  console.log('Dealer Chargers:', chargers);
}
run();

