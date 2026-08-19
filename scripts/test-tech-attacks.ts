import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

async function runTests() {
  console.log('--- TECHNICIAN DIRECT ATTACK TESTS ---\n');

  const stamp = Date.now();

  // Setup: Ensure two partners and two techs exist
  const { data: partnerA, error: errPA } = await adminSupabase.from('organizations').insert({ type: 'PARTNER', name: 'Attack Test Partner A ' + stamp, parent_org_id: null }).select().single();
  if (errPA) console.error('Partner A Insert Error:', errPA);
  const { data: partnerB, error: errPB } = await adminSupabase.from('organizations').insert({ type: 'PARTNER', name: 'Attack Test Partner B ' + stamp, parent_org_id: null }).select().single();
  if (errPB) console.error('Partner B Insert Error:', errPB);
  const { data: oem, error: oemErr } = await adminSupabase.from('organizations').insert({ type: 'OEM', name: 'Test OEM ' + stamp }).select().single();
  if (oemErr) console.error('OEM Insert Error:', oemErr);
  const { data: dealer, error: dealerErr } = await adminSupabase.from('organizations').insert({ type: 'DEALER', name: 'Test Dealer ' + stamp, parent_org_id: oem?.id }).select().single();
  if (dealerErr) console.error('Dealer Insert Error:', dealerErr);
  
  // Create dummy auth users
  const { data: authA } = await adminSupabase.auth.admin.createUser({ email: `testtecha_${stamp}@voltcharge.com`, password: 'password123', email_confirm: true });
  const { data: authB } = await adminSupabase.auth.admin.createUser({ email: `testtechb_${stamp}@voltcharge.com`, password: 'password123', email_confirm: true });
  
  const techAId = authA?.user?.id;
  const techBId = authB?.user?.id;

  // Set roles to TECHNICIAN
  await adminSupabase.from('profiles').upsert({ id: techAId, role: 'TECHNICIAN', org_id: partnerA!.id, name: 'Tech A', phone: '1111111111' });
  await adminSupabase.from('profiles').upsert({ id: techBId, role: 'TECHNICIAN', org_id: partnerB!.id, name: 'Tech B', phone: '2222222222' });

  // Pick random valid foreign keys
  const { data: customer, error: errCust } = await adminSupabase.from('customers').insert({ name: 'Test', phone: stamp.toString().slice(-10), email: `${stamp}@a.com`, address: 'a', city: 'a', state: 'a', pincode: '123456', dealer_id: dealer!.id }).select().single();
  if (errCust) console.error("Customer error:", errCust);
  
  const { data: vehicle, error: errVeh } = await adminSupabase.from('vehicles').insert({ vin: stamp.toString(), model: 'a', sale_date: '2020-01-01', delivery_date: '2020-01-01', customer_id: customer!.id, dealer_id: dealer!.id, oem_id: oem!.id }).select().single();
  if (errVeh) console.error("Vehicle error:", errVeh);
  
  const { data: charger, error: errCharger } = await adminSupabase.from('chargers').insert({ serial_number: stamp.toString(), model: 'a', power_rating: 'a', supplied_date: '2020-01-01', vehicle_id: vehicle!.id, customer_id: customer!.id }).select().single();
  if (errCharger) console.error("Charger error:", errCharger);

  const oem_id = oem!.id;
  const dealer_id = dealer!.id;
  const customer_id = customer!.id;
  const vehicle_id = vehicle!.id;
  const charger_id = charger!.id;

  // Create two jobs
  const { data: jobA, error: errJobA } = await adminSupabase.from('installations').insert({
    customer_id, vehicle_id, charger_id, dealer_id, oem_id,
    partner_id: partnerA!.id, technician_id: techAId, status: 'TECHNICIAN_ASSIGNED'
  }).select().single();
  if (errJobA) console.error("Job A error:", errJobA);

  const { data: jobB, error: errJobB } = await adminSupabase.from('installations').insert({
    customer_id, vehicle_id, charger_id, dealer_id, oem_id,
    partner_id: partnerB!.id, technician_id: techBId, status: 'TECHNICIAN_ASSIGNED'
  }).select().single();
  if (errJobB) console.error("Job B error:", errJobB);

  console.log(`Tech A: ${techAId}`);
  console.log(`Tech B: ${techBId}`);
  console.log(`Job A: ${jobA!.id}`);
  console.log(`Job B: ${jobB!.id}\n`);

  // Sign in as Tech A
  const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  await authClient.auth.signInWithPassword({ email: authA!.user!.email!, password: 'password123' });

  // TEST 1: Tech A SELECT Job B -> FAIL (Returns empty)
  console.log('Test 1: Tech A attempts to SELECT Job B');
  const { data: selectB } = await authClient.from('installations').select('id').eq('id', jobB!.id);
  if (!selectB || selectB.length === 0) console.log('✅ PASS: Job B hidden from Tech A');
  else console.log('❌ FAIL: Tech A can see Job B', selectB);

  // TEST 2: Tech A UPDATE Job B status -> FAIL
  console.log('Test 2: Tech A attempts to UPDATE Job B status');
  await authClient.from('installations').update({ status: 'IN PROGRESS' }).eq('id', jobB!.id);
  const { data: verifyB } = await adminSupabase.from('installations').select('status').eq('id', jobB!.id).single();
  if (verifyB?.status !== 'IN PROGRESS') console.log('✅ PASS: Tech A cannot update Job B');
  else console.log('❌ FAIL: Tech A updated Job B!');

  // TEST 3: Tech A UPDATE own job technician_id -> B -> FAIL
  console.log('Test 3: Tech A attempts to reassign their own job to Tech B');
  const { error: reassignErr } = await authClient.from('installations').update({ technician_id: techBId }).eq('id', jobA!.id);
  if (reassignErr) console.log('✅ PASS: Tech A cannot change technician_id (Error: ' + reassignErr.message + ')');
  else {
    const { data: verifyA } = await adminSupabase.from('installations').select('technician_id').eq('id', jobA!.id).single();
    if (verifyA?.technician_id !== techBId) console.log('✅ PASS: Update silently rejected (Row Level Security updated 0 rows)');
    else console.log('❌ FAIL: Tech A reassigned job!');
  }

  // TEST 4: Tech A INSERT note on Job B -> FAIL
  console.log('Test 4: Tech A attempts to INSERT note on Job B');
  const { error: noteErr } = await authClient.from('installation_notes').insert({
    installation_id: jobB!.id,
    content: 'Hacked note'
  });
  if (noteErr) console.log('✅ PASS: Tech A cannot insert note on Job B (Error: ' + noteErr.message + ')');
  else console.log('❌ FAIL: Tech A inserted note!');

  // TEST 5: Tech A UPDATE own job status valid -> PASS
  console.log('Test 5: Tech A valid status update on own job');
  const { error: validErr } = await authClient.from('installations').update({ status: 'IN_PROGRESS' }).eq('id', jobA!.id);
  if (validErr) console.log('❌ FAIL: Tech A valid update failed', validErr.message);
  else console.log('✅ PASS: Tech A can update own job');

  // TEST 6: Tech A UPDATE own job dealer_id -> FAIL
  console.log('Test 6: Tech A attempts to change dealer_id on own job');
  const { error: dealerUpdateErr } = await authClient.from('installations').update({ dealer_id: oem!.id }).eq('id', jobA!.id);
  if (dealerUpdateErr) console.log('✅ PASS: Tech A cannot change dealer_id (Error: ' + dealerUpdateErr.message + ')');
  else {
    const { data: verifyDealer } = await adminSupabase.from('installations').select('dealer_id').eq('id', jobA!.id).single();
    if (verifyDealer?.dealer_id !== oem!.id) console.log('✅ PASS: Update silently rejected');
    else console.log('❌ FAIL: Tech A changed dealer_id!');
  }
  
  // TEST 7: Tech A INSERT note with fake created_by -> FAIL
  console.log('Test 7: Tech A attempts to INSERT note with fake created_by');
  const { error: fakeAuthorErr } = await authClient.from('installation_notes').insert({
    installation_id: jobA!.id,
    created_by: techBId,
    content: 'Hacked note author'
  });
  if (fakeAuthorErr) console.log('✅ PASS: Tech A cannot fake created_by (Error: ' + fakeAuthorErr.message + ')');
  else console.log('❌ FAIL: Tech A faked author!');

  console.log('\n--- TESTS COMPLETE ---');
}

runTests();
