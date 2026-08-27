const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
async function check() {
  const connectionString = process.env.DATABASE_URL.replace(':5432', ':6543');
  const client = new Client({ connectionString });
  await client.connect();
  const policies = await client.query(`SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE tablename IN ('vehicles', 'chargers') ORDER BY tablename, policyname`);
  console.log(JSON.stringify(policies.rows, null, 2));
  await client.end();
}
check().catch(console.error);
