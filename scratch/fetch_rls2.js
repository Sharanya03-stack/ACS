const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const connectionString = "postgresql://postgres:iKiz.!j7$KCWaim@db.puxhylgbovybaedavjbw.supabase.co:5432/postgres";
  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query(`SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'chargers'`);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
main();
