import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function main() {
  await client.connect();
  console.log('--- 1. PG POLICIES FOR CUSTOMERS ---');
  const res1 = await client.query(`SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'customers'`);
  console.table(res1.rows);
  console.log('--- 2. TATA OEM PROFILE ---');
  const oemRes = await client.query(`SELECT id FROM public.organizations WHERE name = 'Tata Motors (OEM)'`);
  const oemId = oemRes.rows[0]?.id;
  if(oemId){
    const profileRes = await client.query(`SELECT p.id, p.role, p.org_id, u.email FROM public.profiles p JOIN auth.users u ON p.id = u.id WHERE p.org_id = $1 LIMIT 1`, [oemId]);
    console.table(profileRes.rows);
    console.log('--- 3. TATA DEALERSHIPS ---');
    const dealerRes = await client.query(`SELECT id, name, type, parent_org_id, deleted_at FROM public.organizations WHERE parent_org_id = $1`, [oemId]);
    console.table(dealerRes.rows);
  }
  console.log('--- 4. TRIGGERS ON CUSTOMERS ---');
  const trigRes = await client.query(`SELECT tgname, proname FROM pg_trigger JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid WHERE relname = 'customers' AND tgisinternal = false;`);
  console.table(trigRes.rows);
  await client.end();
}
main().catch(console.error);
