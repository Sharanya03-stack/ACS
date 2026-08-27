import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const customersToDelete = [
  "1355003f-e867-4fed-8fca-10a0295f34a1",
  "533ed17c-282e-47cf-a1c1-dc95429b3ad1",
  "1436ab54-6ed2-4c2b-a96e-37b26e7b7255",
  "0b2201f3-70bd-490d-8721-4d73f5874ac7",
  "e003c6ff-c040-4bb0-a6f5-166619be11bb",
  "5b503ca0-217a-4076-8215-777064945288",
  "eb9b7a09-b4d1-4612-b816-2744ccec16f6",
  "4b5577be-357f-49e9-a66a-8e81508937d8",
  "3912f4ee-ea3c-41e7-bf00-7818a7cdc31f",
  "0136d0f2-c714-4e95-9e01-5f6bfc67114d",
  "6d12ff5e-c16c-4819-a7e3-d48a6c25b5cc",
  "9f4f288b-b7f7-476b-a7b7-15b4a8eedb9c",
  "ee5bdf50-c41a-419d-be40-fb12bf234d77"
];

const vehiclesToDelete = [
  "81e96f16-1d08-4460-93a2-e2847cd61330",
  "3bacb7e9-23f3-44eb-aacc-8d33aa384bee",
  "451d9e15-e4c7-46fc-ac85-f626aa89a082",
  "7be33f23-6f0e-42c8-bcba-6d5ec481be5e",
  "921e7ecf-d9a7-4898-a117-39eaaf0d5927",
  "b9e877e0-f50e-471b-aa70-c142ede85f05",
  "6716ffeb-bcd5-45bc-9cbb-28a2916c1d64",
  "6665ed40-3116-4e05-a57e-d4f63c4818fe",
  "d55b726f-d9c5-4c30-a4eb-6efedc9fd6a0",
  "c66eb67b-ea50-40a0-be07-0abe48b3996c",
  "73c4cc1b-42df-4293-bedb-e18646f64320",
  "a92ec21b-db93-41bb-ad3c-a991807cf587",
  "3702cc7a-3bb0-459b-a79b-fe8ec12068ab",
  "95ae3a58-262c-4556-8781-1059823726b6"
];

const chargersToDelete = [
  "8e5842d9-378a-41fe-a0e7-61c488dacd0f",
  "bd3aa3e4-609f-4c79-a221-66a435f67f1e",
  "32620009-8faa-4f39-90d6-44f7976b3770",
  "d7d8f2f9-fc18-40f2-b905-42bf8b83bd47",
  "c9a0934f-5f64-4d9b-99ec-b86a9459c0c8",
  "d1d924b6-37d4-4f39-b36a-d7df7258984d",
  "85d58173-40e1-468d-ad5b-a0d0905bee58",
  "1baf684a-9132-4030-8716-65384daa76aa",
  "ce3897c3-f8df-455c-bb5b-5cbd392d1b5c",
  "7fd53663-4d16-4cb8-94b4-1ec959831d75",
  "7e8d0827-09d3-42db-bf40-f7ee7791fb72",
  "80b3ba6c-5115-4890-87cb-1f143215f438",
  "e044f115-464f-4bcf-90f0-e54a78cfcf90"
];

const installationsToDelete = [
  "06b9e195-dea8-4d49-884b-72dffd0bf585",
  "6d64c2d9-0175-4da3-8a11-ac1bc36f9769",
  "4b29d6f5-a7db-4b1e-85d2-5525a1726fff",
  "af5bcb9b-f01f-48d1-9ce0-f1601f19ac8e",
  "2e101d0a-c978-470c-8aef-ae9d9fe04437",
  "12fb79d6-c39d-4dc2-8c2a-f06745a2b5ef",
  "bdd5e931-2520-4133-87ad-9a22f8b14541",
  "3b32816f-b4d6-48d7-96a9-cfd9a63926b1",
  "0fe55fb8-a3e3-4a35-9ed2-bc51a4f0d664",
  "ac94d894-3840-4e01-bb13-77dc81e42865"
];

async function run() {
  console.log('--- RUNNING DEPENDENCY CHECKS ---');

  // Find valid customers
  const safeCustomersToDelete: string[] = [];
  for (const cid of customersToDelete) {
    const { data: outsideVehicles } = await supabase.from('vehicles').select('id').eq('customer_id', cid).not('id', 'in', `(${vehiclesToDelete.join(',')})`);
    const { data: outsideChargers } = await supabase.from('chargers').select('id').eq('customer_id', cid).not('id', 'in', `(${chargersToDelete.join(',')})`);
    const { data: outsideInstallations } = await supabase.from('installations').select('id').eq('customer_id', cid).not('id', 'in', `(${installationsToDelete.join(',')})`);

    if (
      (outsideVehicles && outsideVehicles.length > 0) || 
      (outsideChargers && outsideChargers.length > 0) || 
      (outsideInstallations && outsideInstallations.length > 0)
    ) {
      console.log(`Customer ${cid} has legitimate outside dependencies. Skipping customer deletion.`);
    } else {
      safeCustomersToDelete.push(cid);
    }
  }

  // Same for vehicles
  const safeVehiclesToDelete: string[] = [];
  for (const vid of vehiclesToDelete) {
    const { data: outsideChargers } = await supabase.from('chargers').select('id').eq('vehicle_id', vid).not('id', 'in', `(${chargersToDelete.join(',')})`);
    const { data: outsideInstallations } = await supabase.from('installations').select('id').eq('vehicle_id', vid).not('id', 'in', `(${installationsToDelete.join(',')})`);
    
    if (
      (outsideChargers && outsideChargers.length > 0) || 
      (outsideInstallations && outsideInstallations.length > 0)
    ) {
      console.log(`Vehicle ${vid} has legitimate outside dependencies. Skipping vehicle deletion.`);
    } else {
      safeVehiclesToDelete.push(vid);
    }
  }

  // Same for chargers
  const safeChargersToDelete: string[] = [];
  for (const cid of chargersToDelete) {
    const { data: outsideInstallations } = await supabase.from('installations').select('id').eq('charger_id', cid).not('id', 'in', `(${installationsToDelete.join(',')})`);
    
    if (outsideInstallations && outsideInstallations.length > 0) {
      console.log(`Charger ${cid} has legitimate outside dependencies. Skipping charger deletion.`);
    } else {
      safeChargersToDelete.push(cid);
    }
  }

  console.log(`Verified. Safe to delete: 
  Customers: ${safeCustomersToDelete.length}
  Vehicles: ${safeVehiclesToDelete.length}
  Chargers: ${safeChargersToDelete.length}
  Installations: ${installationsToDelete.length}`);

  console.log('--- EXECUTING DELETIONS ---');

  // 1. Installation dependencies (checklists, reviews)
  for (const instId of installationsToDelete) {
    await supabase.from('installation_reviews').delete().eq('installation_id', instId);
    await supabase.from('installation_checklists').delete().eq('installation_id', instId);
    await supabase.from('audit_logs').delete().eq('entity_id', instId);
  }

  // 2. Installations
  const { error: iErr } = await supabase.from('installations').delete().in('id', installationsToDelete);
  if (iErr) console.error('Error deleting installations:', iErr);
  else console.log('Deleted installations.');

  // 3. Chargers
  for (const cid of safeChargersToDelete) {
    await supabase.from('audit_logs').delete().eq('entity_id', cid);
  }
  const { error: cErr } = await supabase.from('chargers').delete().in('id', safeChargersToDelete);
  if (cErr) console.error('Error deleting chargers:', cErr);
  else console.log('Deleted chargers.');

  // 4. Vehicles
  for (const vid of safeVehiclesToDelete) {
    await supabase.from('audit_logs').delete().eq('entity_id', vid);
  }
  const { error: vErr } = await supabase.from('vehicles').delete().in('id', safeVehiclesToDelete);
  if (vErr) console.error('Error deleting vehicles:', vErr);
  else console.log('Deleted vehicles.');

  // 5. Customers
  for (const custId of safeCustomersToDelete) {
    await supabase.from('audit_logs').delete().eq('entity_id', custId);
  }
  const { error: custErr } = await supabase.from('customers').delete().in('id', safeCustomersToDelete);
  if (custErr) console.error('Error deleting customers:', custErr);
  else console.log('Deleted customers.');

  console.log('--- VERIFICATION ---');

  const { data: verInst } = await supabase.from('installations').select('id').in('id', installationsToDelete);
  console.log(`Remaining identified installations: ${verInst?.length || 0}`);

  const { data: verChg } = await supabase.from('chargers').select('id').in('id', chargersToDelete);
  console.log(`Remaining identified chargers: ${verChg?.length || 0}`);

  const { data: verVeh } = await supabase.from('vehicles').select('id').in('id', vehiclesToDelete);
  console.log(`Remaining identified vehicles: ${verVeh?.length || 0}`);

  const { data: verCust } = await supabase.from('customers').select('id').in('id', customersToDelete);
  console.log(`Remaining identified customers: ${verCust?.length || 0}`);

  // Orphan checks
  // Chargers with missing vehicles
  const { data: allChargers } = await supabase.from('chargers').select('id, vehicle_id');
  const { data: allVehicles } = await supabase.from('vehicles').select('id');
  const vehicleIds = new Set((allVehicles || []).map(v => v.id));
  const orphanChargers = (allChargers || []).filter(c => !vehicleIds.has(c.vehicle_id));
  console.log(`Orphan chargers: ${orphanChargers.length}`);

  // Installations with missing chargers
  const { data: allInstallations } = await supabase.from('installations').select('id, charger_id');
  const chargerIds = new Set((allChargers || []).map(c => c.id));
  const orphanInstallations = (allInstallations || []).filter(i => !chargerIds.has(i.charger_id));
  console.log(`Orphan installations: ${orphanInstallations.length}`);
}

run();
