const { Client } = require('pg');
const password = encodeURIComponent('[iKiz.!j7$KCWaim]');
const uri = `postgresql://postgres:${password}@db.puxhylgbovybaedavjbw.supabase.co:6543/postgres`;
async function check() {
  const client = new Client({ connectionString: uri });
  await client.connect();
  const res = await client.query('SELECT NOW()');
  console.log(res.rows[0]);
  
  const policies = await client.query(`SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE tablename IN ('vehicles', 'chargers') ORDER BY tablename, policyname`);
  console.log('--- CURRENT POLICIES ---');
  policies.rows.forEach(p => {
    console.log(`\nTable: ${p.tablename} | Policy: ${p.policyname} | Action: ${p.cmd}`);
    if (p.qual) console.log(`USING: ${p.qual}`);
    if (p.with_check) console.log(`WITH CHECK: ${p.with_check}`);
  });
  
  await client.end();
}
check().catch(console.error);
