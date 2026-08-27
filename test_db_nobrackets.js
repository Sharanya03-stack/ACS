const { Client } = require('pg');
const password = encodeURIComponent('iKiz.!j7$KCWaim'); // no brackets
const uri = `postgresql://postgres:${password}@db.puxhylgbovybaedavjbw.supabase.co:6543/postgres`;
async function check() {
  const client = new Client({ connectionString: uri });
  await client.connect();
  const res = await client.query('SELECT NOW()');
  console.log(res.rows[0]);
  
  const q1 = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chargers' ORDER BY ordinal_position`);
  console.log('--- COLUMNS ---');
  console.log(q1.rows);
  
  const q2 = await client.query(`SELECT current_database(), current_schema()`);
  console.log('--- DB INFO ---');
  console.log(q2.rows);

  const q3 = await client.query(`SELECT to_regclass('public.chargers')`);
  console.log('--- REGCLASS ---');
  console.log(q3.rows);

  await client.end();
}
check().catch(console.error);
