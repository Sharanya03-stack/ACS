require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serviceClient = createClient(url, serviceKey);

async function loginAs(email) {
  const client = createClient(url, anonKey);
  await client.auth.signInWithPassword({ email, password: 'password123' });
  return client;
}

async function run() {
  const report = {};

  // 1-3. Columns
  const c = await serviceClient.from('chargers').select('warranty_months').limit(1);
  report['1. warranty_months exists'] = !c.error ? 'PASS' : `FAIL (${c.error.message})`;

  // Prepare test data
  const { data: oemProfile } = await serviceClient.from('profiles').select('*').eq('email', 'oem@hyundai.com').single();
  const { data: dealerProfile } = await serviceClient.from('profiles').select('*').eq('email', 'dealer@hyundaidealer.com').single();
  
  if (!oemProfile || !dealerProfile) {
    console.log("Missing test profiles");
    return;
  }

  // Get a dealer managed by this OEM
  const { data: oemDealer } = await serviceClient.from('organizations').select('id').eq('parent_org_id', oemProfile.org_id).limit(1).single();
  // Get a customer belonging to this dealer
  let testCustomer = null;
  if (oemDealer) {
    const { data: custs } = await serviceClient.from('customers').select('id').eq('dealer_id', oemDealer.id).limit(1);
    if (custs && custs.length > 0) testCustomer = custs[0];
  }

  // Test OEM Insert Vehicle (11)
  const oemClient = await loginAs('oem@hyundai.com');
  const dummyVin = 'TESTVIN_OEM_' + Date.now();
  if (oemDealer && testCustomer) {
    const res = await oemClient.from('vehicles').insert({
      vin: dummyVin,
      oem_id: oemProfile.org_id,
      dealer_id: oemDealer.id,
      customer_id: testCustomer.id,
      model: 'TestModel',
      sale_date: '2026-01-01',
      delivery_date: '2026-01-01'
    }).select().single();
    
    report['11. OEM can create its own vehicle'] = res.error ? `FAIL (${res.error.message})` : 'PASS';
    
    // Test OEM Update Vehicle (11)
    if (!res.error) {
       const upd = await oemClient.from('vehicles').update({ model: 'UpdatedModel' }).eq('id', res.data.id);
       report['11. OEM can update its own vehicle'] = upd.error ? `FAIL (${upd.error.message})` : 'PASS';
    }
  } else {
    report['11. OEM can create its own vehicle'] = 'SKIPPED (no test data)';
  }

  // Print report
  console.log(JSON.stringify(report, null, 2));
}

run().catch(console.error);
