
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  // Login as tech001
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'tech@voltcharge.com',
    password: 'password123'
  });
  
  if (error) {
    console.error('Login error:', error);
    return;
  }
  
  console.log('Logged in as:', data.user.id);
  
  // Now try to fetch the profile
  const { data: profile, error: profErr } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
  console.log('Profile fetch error:', profErr);
  console.log('Profile data:', profile);
}
run();

