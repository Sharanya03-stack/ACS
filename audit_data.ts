import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log('--- CUSTOMERS ---');
  const { data: customers, error: cErr } = await supabase.from('customers').select('*');
  console.log(JSON.stringify(customers?.length ? customers : cErr, null, 2));

  console.log('--- VEHICLES ---');
  const { data: vehicles, error: vErr } = await supabase.from('vehicles').select('*');
  console.log(JSON.stringify(vehicles?.length ? vehicles : vErr, null, 2));

  console.log('--- CHARGERS ---');
  const { data: chargers, error: chErr } = await supabase.from('chargers').select('*');
  console.log(JSON.stringify(chargers?.length ? chargers : chErr, null, 2));

  console.log('--- INSTALLATIONS ---');
  const { data: installations, error: iErr } = await supabase.from('installations').select('*');
  console.log(JSON.stringify(installations?.length ? installations : iErr, null, 2));
}
run();
