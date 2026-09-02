const { Client } = require('pg');
const password = encodeURIComponent('iKiz.!j7$KCWaim');
const uri = `postgresql://postgres:${password}@db.puxhylgbovybaedavjbw.supabase.co:6543/postgres`;
const client = new Client({ connectionString: uri, ssl: { rejectUnauthorized: false } });
async function check() {
  await client.connect();
  const res = await client.query(`SELECT id, name, type, parent_org_id FROM organizations WHERE type = 'PARTNER'`);
  console.log(res.rows);
  await client.end();
}
check();
