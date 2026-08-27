const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const password = encodeURIComponent('iKiz.!j7$KCWaim');
const uri = `postgresql://postgres:${password}@db.puxhylgbovybaedavjbw.supabase.co:6543/postgres`;
const client = new Client({ connectionString: uri });

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT event_object_table, trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'profiles'
  `);
  console.log('Triggers:', res.rows);
  
  await client.end();
}
check();
