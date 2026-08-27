import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function test() {
  const { data: customer } = await supabase.from('customers').select('id').limit(1).single();
  if (!customer) {
    console.log("No customer found");
    return;
  }
  
  const customerId = customer.id;
  console.log("Testing with customerId:", customerId);

  const [
    { data: vehicle, error: vErr },
    { data: charger, error: cErr },
    { data: installation, error: iErr }
  ] = await Promise.all([
    supabase.from('vehicles').select('*').eq('customer_id', customerId).maybeSingle(),
    supabase.from('chargers').select('*').eq('customer_id', customerId).maybeSingle(),
    supabase.from('installations').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  ]);

  console.log("Vehicle:", vehicle, vErr);
  console.log("Charger:", charger, cErr);
  console.log("Installation:", installation, iErr);
}

test().catch(console.error);
