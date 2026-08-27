const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) { console.log('No DIRECT_URL'); return; }
  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query(`SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'chargers'`);
  console.log(res.rows);
  await client.end();
}
main();
