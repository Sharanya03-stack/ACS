import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error("Missing keys in .env.local");
  process.exit(1);
}

async function createAuthClient(email: string, password = 'password123') {
  const client = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Failed to login as ${email}: ${error.message}`);
  
  return client;
}

async function main() {
  console.log("=== Running Comprehensive RLS Security Tests ===\n");

  const adminClient = createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Fetch Orgs
  const { data: orgs } = await adminClient.from('organizations').select('id, name');
  const tataOrg = orgs?.find(o => o.name === 'Tata Motors');
  const mgOrg = orgs?.find(o => o.name === 'MG Motor');
  const tataDealer = orgs?.find(o => o.name === 'Tata Dealership Pune');
  const mgDealer = orgs?.find(o => o.name === 'MG Dealership Mumbai');
  const partnerOrg = orgs?.find(o => o.name === 'VoltCharge Partners');

  // Fetch Users
  const { data: profiles } = await adminClient.from('profiles').select('id, name, role');
  const techProfile = profiles?.find(p => p.role === 'TECHNICIAN');

  console.log("PROFILES:");
  console.log(profiles);

  if (!tataOrg || !mgOrg || !tataDealer || !mgDealer || !partnerOrg || !techProfile) {
    console.error("Missing seed data! Please run seed.ts first.");
    process.exit(1);
  }

  // Set up data
  const { data: custTata } = await adminClient.from('customers').insert({
    dealer_id: tataDealer.id, name: 'Tata Customer', phone: '123', address: '123', city: 'Pune', state: 'MH', pincode: '411001'
  }).select().single();
  const { data: vehTata } = await adminClient.from('vehicles').insert({
    vin: `VIN-TATA-${Date.now()}`, customer_id: custTata!.id, dealer_id: tataDealer.id, oem_id: tataOrg.id, model: 'Nexon', sale_date: '2026-01-01', delivery_date: '2026-01-01'
  }).select().single();
  const { data: chrTata } = await adminClient.from('chargers').insert({
    serial_number: `SN-TATA-${Date.now()}`, vehicle_id: vehTata!.id, customer_id: custTata!.id, model: 'Type 2', power_rating: '7.2kW', supplied_date: '2026-01-01'
  }).select().single();
  const { data: tataInst } = await adminClient.from('installations').insert({
    customer_id: custTata!.id, vehicle_id: vehTata!.id, charger_id: chrTata!.id, dealer_id: tataDealer.id, oem_id: tataOrg.id, partner_id: partnerOrg.id, technician_id: techProfile.id
  }).select().single();

  const { data: custMg } = await adminClient.from('customers').insert({
    dealer_id: mgDealer.id, name: 'MG Customer', phone: '123', address: '123', city: 'Mum', state: 'MH', pincode: '400001'
  }).select().single();
  const { data: vehMg } = await adminClient.from('vehicles').insert({
    vin: `VIN-MG-${Date.now()}`, customer_id: custMg!.id, dealer_id: mgDealer.id, oem_id: mgOrg.id, model: 'ZS', sale_date: '2026-01-01', delivery_date: '2026-01-01'
  }).select().single();
  const { data: chrMg } = await adminClient.from('chargers').insert({
    serial_number: `SN-MG-${Date.now()}`, vehicle_id: vehMg!.id, customer_id: custMg!.id, model: 'Type 2', power_rating: '7.2kW', supplied_date: '2026-01-01'
  }).select().single();
  const { data: mgInst } = await adminClient.from('installations').insert({
    customer_id: custMg!.id, vehicle_id: vehMg!.id, charger_id: chrMg!.id, dealer_id: mgDealer.id, oem_id: mgOrg.id
  }).select().single();


  // Helpers
  const testResults: any[] = [];
  function recordTest(name: string, role: string, expected: boolean, actual: boolean) {
    const passed = expected === actual;
    testResults.push({ name, role, expected, actual, passed });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}`);
  }

  try {
    // 1. ACS Admin
    const adminUserClient = await createAuthClient('admin@acsenergy.com');
    const { data: adminInst } = await adminUserClient.from('installations').select('id');
    const adminHasAll = adminInst?.some(i => i.id === tataInst!.id) && adminInst?.some(i => i.id === mgInst!.id);
    recordTest('1. ACS Admin can access authorized platform-wide data.', 'ACS_ADMIN', true, !!adminHasAll);

    // 2. Tata OEM
    const tataClient = await createAuthClient('oem@tata.com');
    const { data: tataOEMInst } = await tataClient.from('installations').select('id');
    recordTest('2. Tata OEM can access Tata data.', 'OEM', true, !!tataOEMInst?.some(i => i.id === tataInst!.id));
    recordTest('3. Tata OEM CANNOT access MG data.', 'OEM', false, !!tataOEMInst?.some(i => i.id === mgInst!.id));

    // 4 & 5. MG OEM
    const mgClient = await createAuthClient('oem@mg.com');
    const { data: mgOEMInst } = await mgClient.from('installations').select('id');
    recordTest('4. MG OEM can access MG data.', 'OEM', true, !!mgOEMInst?.some(i => i.id === mgInst!.id));
    recordTest('5. MG OEM CANNOT access Tata data.', 'OEM', false, !!mgOEMInst?.some(i => i.id === tataInst!.id));

    // 6. Tata Dealer
    const tataDealerClient = await createAuthClient('dealer@tata.com');
    const { data: tataDealerInst } = await tataDealerClient.from('installations').select('id');
    recordTest('6. Tata Dealer can access its own dealership data.', 'DEALER', true, !!tataDealerInst?.some(i => i.id === tataInst!.id));
    recordTest('7. Tata Dealer CANNOT access another dealership\'s data.', 'DEALER', false, !!tataDealerInst?.some(i => i.id === mgInst!.id));

    // 8. MG Dealer
    const mgDealerClient = await createAuthClient('dealer@mg.com');
    const { data: mgDealerInst } = await mgDealerClient.from('installations').select('id');
    recordTest('8. MG Dealer CANNOT access Tata dealership data.', 'DEALER', false, !!mgDealerInst?.some(i => i.id === tataInst!.id));

    // 9 & 10. Partner
    const partnerClient = await createAuthClient('partner@voltcharge.com');
    const { data: partnerInst } = await partnerClient.from('installations').select('id');
    recordTest('9. Installation Partner can access only assigned installations.', 'PARTNER', true, !!partnerInst?.some(i => i.id === tataInst!.id));
    recordTest('10. Installation Partner CANNOT access unrelated installations.', 'PARTNER', false, !!partnerInst?.some(i => i.id === mgInst!.id));

    // 11 & 12. Tech
    const techClient = await createAuthClient('tech@voltcharge.com');
    const { data: techInst } = await techClient.from('installations').select('id');
    recordTest('11. Technician can access only assigned installations.', 'TECHNICIAN', true, !!techInst?.some(i => i.id === tataInst!.id));
    recordTest('12. Technician CANNOT access another technician\'s installations.', 'TECHNICIAN', false, !!techInst?.some(i => i.id === mgInst!.id)); // MgInst has no tech, so unassigned.

    // ---------------------------------------------------------
    // MUTATION TESTS (INSERT / UPDATE / DELETE)
    // ---------------------------------------------------------
    console.log("\n--- Testing Mutations ---");

    // 13. Dealer INSERT authorization    // 13. Customer Insert
    const { data: insCust1, error: insCustErr1 } = await tataDealerClient.from('customers').insert({
      name: 'New Tata Customer', email: 'tata@new.com', phone: '111', dealer_id: tataDealer.id, address: '123 Street', city: 'Pune', state: 'MH', pincode: '411001'
    }).select();
    if (insCustErr1) console.error("Insert Customer Error:", insCustErr1);
    recordTest('13. Tata Dealer can INSERT own customer', 'DEALER', true, !!(insCust1 && insCust1.length > 0));
    
    if (insCust1) await adminClient.from('customers').delete().eq('id', insCust1[0].id); // cleanup

    // 14. Dealer INSERT authorization (Other OEM's customer)
    const { error: insErr2 } = await tataDealerClient.from('customers').insert({
      dealer_id: mgDealer.id, name: 'MG New Customer', phone: '111', address: '123', city: 'Pune', state: 'MH', pincode: '400001'
    }).select();
    recordTest('14. Tata Dealer CANNOT INSERT MG customer', 'DEALER', false, !insErr2);

    // 15. Dealer UPDATE authorization
    const { data: updCust1, error: updErr1 } = await tataDealerClient.from('customers').update({ name: 'Tata Updated' }).eq('id', custTata!.id).select();
    recordTest('15. Tata Dealer can UPDATE own customer', 'DEALER', true, !!(!updErr1 && updCust1?.length));

    // 16. Dealer UPDATE authorization (Cannot update MG)
    const { data: updCust2, error: updErr2 } = await tataDealerClient.from('customers').update({ name: 'Hacked' }).eq('id', custMg!.id).select();
    recordTest('16. Tata Dealer CANNOT UPDATE MG customer', 'DEALER', false, !!(updCust2 && updCust2.length > 0));

    // 17. OEM UPDATE authorization (Cannot update another OEM)
    const { data: updCust3, error: updErr3 } = await tataClient.from('customers').update({ name: 'Hacked' }).eq('id', custMg!.id).select();
    recordTest('17. Tata OEM CANNOT UPDATE MG customer', 'OEM', false, !!(updCust3 && updCust3.length > 0));

    // 18. DELETE authorization (Dealer cannot delete)
    const { count: delCount1 } = await tataDealerClient.from('customers').delete({ count: 'exact' }).eq('id', custTata!.id);
    recordTest('18. Tata Dealer CANNOT DELETE customer', 'DEALER', false, (delCount1 || 0) > 0);

    // 19. ACS Admin -> DELETE customer
    const { data: dummyCust, error: dummyErr } = await adminUserClient.from('customers').insert({ dealer_id: tataDealer.id, name: 'Dummy', phone: '00', address: '1', city: 'Pune', state: 'MH', pincode: '1' }).select().single();
    if (dummyErr) console.error("Admin Insert Dummy Error:", dummyErr);
    
    const { count: delCount2 } = await adminUserClient.from('customers').delete({ count: 'exact' }).eq('id', dummyCust?.id);
    recordTest('19. ACS Admin can DELETE customer', 'ACS_ADMIN', true, (delCount2 || 0) > 0);

    // 20. Partner -> unrelated installation
    const { data: updPart, error: updPartErr } = await partnerClient.from('installations').update({ status: 'CANCELLED' }).eq('id', mgInst!.id).select();
    recordTest('20. Partner CANNOT UPDATE unrelated installation', 'PARTNER', false, !!(updPart && updPart.length > 0));

    // 21. Technician -> unrelated installation
    const { data: updTech1, error: updTechErr1 } = await techClient.from('installations').update({ status: 'IN_PROGRESS' }).eq('id', mgInst!.id).select();
    recordTest('21. Technician CANNOT UPDATE unrelated installation', 'TECHNICIAN', false, !!(updTech1 && updTech1.length > 0));

    // 22. Technician updating own installation
    const { data: updTech2, error: updTechErr2 } = await techClient.from('installations').update({ status: 'IN_PROGRESS' }).eq('id', tataInst!.id).select();
    recordTest('22. Technician can UPDATE own installation status', 'TECHNICIAN', true, !!(!updTechErr2 && updTech2?.length));

    // 23. Technician attempting to change ownership/assignment fields (Field Escalation Protection)
    // Try to change dealer_id to mgDealer
    const { data: updTechEscalation, error: updTechEscalationErr } = await techClient.from('installations').update({ dealer_id: mgDealer.id }).eq('id', tataInst!.id).select();
    recordTest('23. Technician CANNOT change installation dealer_id', 'TECHNICIAN', false, !!(updTechEscalation && updTechEscalation.length > 0));

    // 24. Unauthorized role attempting mutations (e.g. Technician trying to create a Customer)
    const { error: techInsCustErr } = await techClient.from('customers').insert({ dealer_id: tataDealer.id, name: 'Rogue Tech' }).select();
    recordTest('24. Technician CANNOT INSERT customer', 'TECHNICIAN', false, !techInsCustErr);

    // Cleanup created data
    if (insCust1?.length) await adminClient.from('customers').delete().eq('id', insCust1[0].id);
  } catch (err) {
    console.error("Test execution failed:", err);
  }

  // Cleanup top level
  await adminClient.from('installations').delete().in('id', [tataInst!.id, mgInst!.id]);
  await adminClient.from('chargers').delete().in('id', [chrTata!.id, chrMg!.id]);
  await adminClient.from('vehicles').delete().in('id', [vehTata!.id, vehMg!.id]);
  await adminClient.from('customers').delete().in('id', [custTata!.id, custMg!.id]);

  console.log("\n=== Test Results ===");
  testResults.forEach(r => {
    console.log(`- ${r.name} (Role: ${r.role}) | Expected: ${r.expected}, Actual: ${r.actual} | Result: ${r.passed ? 'PASS' : 'FAIL'}`);
  });
  
  if (testResults.some(r => !r.passed)) {
    console.log("\nOVERALL: FAIL");
    process.exit(1);
  } else {
    console.log("\nOVERALL: PASS");
    process.exit(0);
  }
}

main();
