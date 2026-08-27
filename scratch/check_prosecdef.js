const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const password = encodeURIComponent('iKiz.!j7$KCWaim');
const uri = `postgresql://postgres:${password}@db.puxhylgbovybaedavjbw.supabase.co:6543/postgres`;
const client = new Client({ connectionString: uri });

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT proname, prosecdef FROM pg_proc WHERE proname IN ('get_auth_role', 'get_auth_org_id')
  `);
  console.log(res.rows);
  await client.end();
}
check();
