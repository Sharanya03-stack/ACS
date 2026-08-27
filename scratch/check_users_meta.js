const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const password = encodeURIComponent('iKiz.!j7$KCWaim');
const uri = `postgresql://postgres:${password}@db.puxhylgbovybaedavjbw.supabase.co:6543/postgres`;
const client = new Client({ connectionString: uri });

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT u.id, u.raw_app_meta_data, p.role, p.org_id 
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE p.role = 'DEALER'
  `);
  console.log('Users:', JSON.stringify(res.rows, null, 2));
  
  await client.end();
}
check();
