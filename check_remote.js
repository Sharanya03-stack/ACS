const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const cols = await client.query(`SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name IN ('vehicles', 'chargers', 'customers', 'organizations') ORDER BY table_name, ordinal_position`);
  const fks = await client.query(`SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name IN ('vehicles', 'chargers', 'customers', 'organizations')`);
  const policies = await client.query(`SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE tablename IN ('vehicles', 'chargers') ORDER BY tablename, policyname`);

  const fs = require('fs');
  fs.writeFileSync('remote_output.json', JSON.stringify({cols: cols.rows, fks: fks.rows, policies: policies.rows}, null, 2));
  await client.end();
}
check().catch(console.error);
