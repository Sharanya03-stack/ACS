import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const connectionString = process.env.DATABASE_URL!.replace(':[', ':').replace(']@', '@');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query(`
    SELECT polname, polcmd, polpermissive 
    FROM pg_policy 
    WHERE polrelid = 'public.installations'::regclass
  `);
  console.log(res.rows);

  const res2 = await client.query(`
    SELECT * FROM installations
  `);
  console.log("All installations:", res2.rows.length);
  if (res2.rows.length > 0) {
    console.log("Inst 0:", res2.rows[0]);
  }

  await client.end();
}
main().catch(console.error);
