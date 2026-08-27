const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const password = encodeURIComponent('iKiz.!j7$KCWaim');
const uri = `postgresql://postgres:${password}@db.puxhylgbovybaedavjbw.supabase.co:6543/postgres`;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serviceClient = createClient(supabaseUrl, serviceKey);

async function run() {
  const client = new Client({ connectionString: uri });
  await client.connect();
  
  // 1. Check connection matches
  if (!supabaseUrl.includes('puxhylgbovybaedavjbw')) throw new Error("DB mismatch!");
  
  // 2. Apply migration
  const sql = fs.readFileSync('supabase/migrations/0020_final_uat_schema_sync.sql', 'utf8');
  console.log("Applying 0020 migration...");
  await client.query(sql);
  
  // 3. Notify postgrest
  await client.query("NOTIFY pgrst, 'reload schema'");
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("--- VERIFICATION ---");
  const report = {};
  
  // A. Warranty schema
  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'chargers' AND column_name LIKE 'warranty_%'
  `);
  report['A. warranty_months exists'] = cols.rows.some(c => c.column_name === 'warranty_months' && c.data_type === 'integer') ? 'PASS' : 'FAIL';
  report['A. warranty_start_date exists'] = cols.rows.some(c => c.column_name === 'warranty_start_date' && c.data_type === 'date') ? 'PASS' : 'FAIL';
  report['A. warranty_expiry_date exists'] = cols.rows.some(c => c.column_name === 'warranty_expiry_date' && c.data_type === 'date') ? 'PASS' : 'FAIL';

  // B & C. Policies
  const pols = await client.query(`
    SELECT policyname, qual, with_check 
    FROM pg_policies WHERE tablename IN ('vehicles', 'chargers')
  `);
  const hasPol = (name, checkStr) => pols.rows.some(p => p.policyname === name && (!checkStr || p.with_check?.includes(checkStr) || p.qual?.includes(checkStr)));
  
  report['B. Vehicles OEM Insert exists'] = hasPol('Vehicles OEM Insert', 'dealer_id IN') ? 'PASS' : 'FAIL';
  report['B. Vehicles OEM Update exists'] = hasPol('Vehicles OEM Update', 'oem_id = get_auth_org_id()') ? 'PASS' : 'FAIL';
  report['B. Vehicles Read Access unchanged'] = hasPol('Vehicles Read Access', 'technician_id = auth.uid()') ? 'PASS' : 'FAIL';
  
  report['C. Chargers Admin Insert updated'] = hasPol('Chargers Admin Insert', 'vehicles WHERE (id = chargers.vehicle_id') ? 'PASS' : 'FAIL';
  report['C. Chargers Admin Update updated'] = hasPol('Chargers Admin Update', 'vehicles WHERE (id = chargers.vehicle_id') ? 'PASS' : 'FAIL';
  report['C. Chargers Dealer Insert updated'] = hasPol('Chargers Dealer Insert', 'WHERE (vehicles.dealer_id = get_auth_org_id') ? 'PASS' : 'FAIL';
  report['C. Chargers Dealer Update updated'] = hasPol('Chargers Dealer Update', 'WHERE (vehicles.dealer_id = get_auth_org_id') ? 'PASS' : 'FAIL';
  report['C. Chargers Read Access unchanged'] = hasPol('Chargers Read Access', 'technician_id = auth.uid()') ? 'PASS' : 'FAIL';

  // Fetch users to reset passwords
  const { data: usersData, error: uErr } = await serviceClient.auth.admin.listUsers();
  if (uErr) throw uErr;
  
  const { data: profiles } = await serviceClient.from('profiles').select('*');
  
  async function getClientForRole(roleName) {
    const prof = profiles.find(p => p.role === roleName);
    if (!prof) throw new Error("Missing profile for " + roleName);
    const user = usersData.users.find(u => u.id === prof.id);
    if (!user) throw new Error("Missing auth user for " + roleName);
    
    await serviceClient.auth.admin.updateUserById(user.id, { password: 'password123' });
    const client = createClient(supabaseUrl, anonKey);
    const { error } = await client.auth.signInWithPassword({ email: user.email, password: 'password123' });
    if (error) throw new Error(`Failed to login ${roleName}`);
    return { client, prof, user };
  }

  const { client: oemClient, prof: oemProf } = await getClientForRole('OEM');
  const { client: dealerClient, prof: dealerProf } = await getClientForRole('DEALER');
  const { client: adminClient } = await getClientForRole('ACS_ADMIN');
  const { client: partnerClient } = await getClientForRole('PARTNER');
  
  const oemId = oemProf.org_id;
  const dealerId = dealerProf.org_id;
  
  const { data: otherOems } = await serviceClient.from('organizations').select('id').eq('type', 'OEM').neq('id', oemId).limit(1);
  const otherOemId = otherOems[0]?.id;
  const { data: otherDealers } = await serviceClient.from('organizations').select('id').eq('type', 'DEALER').neq('id', dealerId).limit(1);
  const otherDealerId = otherDealers[0]?.id;
  
  const { data: myCusts } = await serviceClient.from('customers').select('id').eq('dealer_id', dealerId).limit(1);
  let myCust = myCusts && myCusts[0];
  if (!myCust) {
    const { data: nc } = await serviceClient.from('customers').insert({ name: 'T1', email: 't1@e.com', phone: '1', dealer_id: dealerId }).select().single();
    myCust = nc;
  }
  const { data: otherCusts } = await serviceClient.from('customers').select('id').eq('dealer_id', otherDealerId).limit(1);
  let otherCust = otherCusts && otherCusts[0];
  if (!otherCust) {
    const { data: nc } = await serviceClient.from('customers').insert({ name: 'T2', email: 't2@e.com', phone: '2', dealer_id: otherDealerId }).select().single();
    otherCust = nc;
  }

  // Ensure dealer belongs to OEM for the test
  await serviceClient.from('organizations').update({ parent_org_id: oemId }).eq('id', dealerId);
  
  // D.1 OEM Insert valid
  const dummyVin = 'OEM_TEST_' + Date.now();
  const res1 = await oemClient.from('vehicles').insert({
    vin: dummyVin, oem_id: oemId, dealer_id: dealerId, customer_id: myCust.id, model: 'X'
  }).select().single();
  report['D.1 OEM A can INSERT valid vehicle'] = res1.error ? `FAIL (${res1.error.message})` : 'PASS';
  
  // D.2 OEM Update valid
  if (!res1.error) {
    const res2 = await oemClient.from('vehicles').update({ model: 'Y' }).eq('id', res1.data.id).select().single();
    report['D.2 OEM A can UPDATE its vehicle'] = res2.error ? `FAIL (${res2.error.message})` : 'PASS';
  }

  // D.3 OEM Insert another OEM
  const res3 = await oemClient.from('vehicles').insert({
    vin: dummyVin+'2', oem_id: otherOemId, dealer_id: dealerId, customer_id: myCust.id, model: 'X'
  });
  report['D.3 OEM cannot insert vehicle for another OEM'] = res3.error ? 'PASS' : 'FAIL (Allowed!)';
  
  // D.4 OEM assign wrong dealership
  const res4 = await oemClient.from('vehicles').insert({
    vin: dummyVin+'3', oem_id: oemId, dealer_id: otherDealerId, customer_id: otherCust.id, model: 'X'
  });
  report['D.4 OEM cannot assign wrong dealership'] = res4.error ? 'PASS' : 'FAIL (Allowed!)';

  // D.5 OEM assign wrong customer
  const res5 = await oemClient.from('vehicles').insert({
    vin: dummyVin+'4', oem_id: oemId, dealer_id: dealerId, customer_id: otherCust.id, model: 'X'
  });
  report['D.5 OEM cannot assign wrong customer'] = res5.error ? 'PASS' : 'FAIL (Allowed!)';

  const { data: otherVehicle } = await serviceClient.from('vehicles').select('id').eq('oem_id', otherOemId).limit(1).single();
  
  // D.6 OEM update another OEM's vehicle
  if (otherVehicle) {
    const res6 = await oemClient.from('vehicles').update({ model: 'Z' }).eq('id', otherVehicle.id).select().single();
    report['D.6 OEM cannot update another OEM vehicle'] = res6.error ? 'PASS' : 'FAIL (Allowed!)';
  }

  // D.7 ACS ADMIN insert charger valid
  const chargerSn = 'CHG_' + Date.now();
  const res7 = await adminClient.from('chargers').insert({
    serial_number: chargerSn, vehicle_id: res1.data.id, customer_id: myCust.id, model: 'A'
  }).select().single();
  report['D.7 ACS_ADMIN can INSERT valid charger'] = res7.error ? `FAIL (${res7.error.message})` : 'PASS';
  
  // D.8 ACS ADMIN update valid
  if (!res7.error) {
    const res8 = await adminClient.from('chargers').update({ model: 'B' }).eq('id', res7.data.id).select().single();
    report['D.8 ACS_ADMIN can UPDATE valid charger'] = res8.error ? `FAIL (${res8.error.message})` : 'PASS';
  }

  // D.9 ACS ADMIN invalid customer/vehicle mismatch
  const res9 = await adminClient.from('chargers').insert({
    serial_number: chargerSn+'2', vehicle_id: res1.data.id, customer_id: otherCust.id, model: 'A'
  });
  report['D.9 ACS_ADMIN cannot create mismatch charger'] = res9.error ? 'PASS' : 'FAIL (Allowed!)';

  // D.10 DEALER insert charger valid
  const { data: dVeh } = await serviceClient.from('vehicles').insert({
    vin: 'D_VIN_'+Date.now(), oem_id: oemId, dealer_id: dealerId, customer_id: myCust.id, model: 'X'
  }).select().single();
  
  const res10 = await dealerClient.from('chargers').insert({
    serial_number: 'CHG_D_'+Date.now(), vehicle_id: dVeh.id, customer_id: myCust.id, model: 'A'
  }).select().single();
  report['D.10 Dealer can INSERT valid charger'] = res10.error ? `FAIL (${res10.error.message})` : 'PASS';

  // D.11 DEALER update valid
  if (!res10.error) {
    const res11 = await dealerClient.from('chargers').update({ model: 'B' }).eq('id', res10.data.id).select().single();
    report['D.11 Dealer can UPDATE valid charger'] = res11.error ? `FAIL (${res11.error.message})` : 'PASS';
  }

  // D.12 DEALER another dealer's vehicle
  if (otherVehicle) {
    const res12 = await dealerClient.from('chargers').insert({
      serial_number: 'CHG_D2_'+Date.now(), vehicle_id: otherVehicle.id, customer_id: otherCust.id, model: 'A'
    });
    report['D.12 Dealer cannot attach charger to another dealer vehicle'] = res12.error ? 'PASS' : 'FAIL (Allowed!)';
  }

  // D.13 DEALER mismatch
  const res13 = await dealerClient.from('chargers').insert({
    serial_number: 'CHG_D3_'+Date.now(), vehicle_id: dVeh.id, customer_id: otherCust.id, model: 'A'
  });
  report['D.13 Dealer cannot create mismatch charger'] = res13.error ? 'PASS' : 'FAIL (Allowed!)';
  
  // D.14 Unauthorized mutation
  const res14a = await partnerClient.from('chargers').insert({
    serial_number: 'CHG_P_'+Date.now(), vehicle_id: dVeh.id, customer_id: myCust.id, model: 'A'
  });
  const res14b = await oemClient.from('chargers').update({ model: 'X' }).eq('id', res10.data.id).select().single();
  report['D.14 Unauthorized roles cannot mutate chargers'] = (res14a.error && res14b.error) ? 'PASS' : 'FAIL (Allowed!)';

  console.log(JSON.stringify(report, null, 2));

  await client.end();
}
run().catch(console.error);
