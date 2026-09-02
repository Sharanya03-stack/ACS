
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data } = await supabase.from('profiles').select('*').eq('id', 'f3fc5f10-4a3e-4c0f-91c9-b980514ae059').single();
  console.log(data);
  // Restore the profile
  const { error } = await supabase.from('profiles').update({ deleted_at: null, status: 'ACTIVE' }).eq('id', 'f3fc5f10-4a3e-4c0f-91c9-b980514ae059');
  console.log('Restore error:', error);
}
run();

