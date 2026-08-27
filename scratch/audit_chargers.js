const { Client } = require('pg');
const client = new Client({
  host: 'db.puxhylgbovybaedavjbw.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '[iKiz.!j7$KCWaim]',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected!');
  
  const res = await client.query("SELECT policyname, qual, with_check FROM pg_policies WHERE tablename = 'chargers' AND cmd = 'INSERT'");
  console.log('INSERT Policies:', res.rows);
  
  const res2 = await client.query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'chargers'");
  console.log('Columns:', res2.rows);
  
  await client.end();
}
run().catch(console.error);
