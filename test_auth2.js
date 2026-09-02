
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
async function run() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  await admin.from('profiles').update({ deleted_at: new Date().toISOString(), status: 'INACTIVE' }).eq('id', 'f3fc5f10-4a3e-4c0f-91c9-b980514ae059');
  
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: auth } = await supabase.auth.signInWithPassword({ email: 'tech@voltcharge.com', password: 'password123' });
  const { data: profile, error: profErr } = await supabase.from('profiles').select('*').eq('id', auth.user.id).single();
  console.log('Inactive Profile data:', profile);
  
  // Clean up and restore again
  await admin.from('profiles').update({ deleted_at: null, status: 'ACTIVE' }).eq('id', 'f3fc5f10-4a3e-4c0f-91c9-b980514ae059');
}
run();

