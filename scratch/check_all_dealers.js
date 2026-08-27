const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const password = encodeURIComponent('iKiz.!j7$KCWaim');
const uri = `postgresql://postgres:${password}@db.puxhylgbovybaedavjbw.supabase.co:6543/postgres`;
const client = new Client({ connectionString: uri });

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT id, name, type, parent_org_id 
    FROM organizations
    WHERE type = 'DEALER'
  `);
  console.log('All Dealers:', res.rows);
  
  await client.end();
}
check();
