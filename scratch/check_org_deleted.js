const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const password = encodeURIComponent('iKiz.!j7$KCWaim');
const uri = `postgresql://postgres:${password}@db.puxhylgbovybaedavjbw.supabase.co:6543/postgres`;
const client = new Client({ connectionString: uri });

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT id, deleted_at FROM organizations WHERE id = '8fb9c1f5-6ffa-408e-a6b3-b07b6bb3332c'
  `);
  console.log(res.rows);
  await client.end();
}
check();
