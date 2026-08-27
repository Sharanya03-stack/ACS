const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const password = encodeURIComponent('iKiz.!j7$KCWaim');
const uri = `postgresql://postgres:${password}@db.puxhylgbovybaedavjbw.supabase.co:6543/postgres`;
const client = new Client({ connectionString: uri });

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT p.id as user_id, p.role, o.id as org_id, o.name, o.type, o.parent_org_id 
    FROM profiles p 
    LEFT JOIN organizations o ON p.org_id = o.id 
    WHERE p.role = 'DEALER'
  `);
  console.log('Dealers:', res.rows);
  
  const oemIds = [...new Set(res.rows.map(r => r.parent_org_id).filter(id => id))];
  if (oemIds.length > 0) {
    const res2 = await client.query(`SELECT id, name, type FROM organizations WHERE id = ANY($1)`, [oemIds]);
    console.log('Parent Orgs:', res2.rows);
  }
  
  await client.end();
}
check();
