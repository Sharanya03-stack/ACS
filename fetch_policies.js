const { Client } = require('pg');
const password = encodeURIComponent('iKiz.!j7$KCWaim');
const uri = `postgresql://postgres:${password}@db.puxhylgbovybaedavjbw.supabase.co:6543/postgres`;

async function check() {
  const client = new Client({ connectionString: uri });
  await client.connect();
  
  const policies = await client.query(`
    SELECT tablename, policyname, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename IN ('vehicles', 'chargers') 
    ORDER BY tablename, policyname
  `);
  
  const columns = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'chargers' 
      AND column_name IN ('warranty_months', 'warranty_start_date', 'warranty_expiry_date')
  `);
  
  console.log(JSON.stringify({
    policies: policies.rows,
    warranty_columns: columns.rows.map(r => r.column_name)
  }, null, 2));

  await client.end();
}
check().catch(console.error);
