import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isTestCustomer(c: any) {
  const n = (c.name || '').toLowerCase();
  const e = (c.email || '').toLowerCase();
  const a = (c.address || '').toLowerCase();
  
  if (n.includes('test') || n.includes('qqqq') || n.includes('tester')) return true;
  if (e.includes('test')) return true;
  return false;
}

function isTestVehicle(v: any) {
  const vin = (v.vin || '').toUpperCase();
  const m = (v.model || '').toLowerCase();
  
  if (vin.includes('TEST') || vin.includes('FULL') || vin.startsWith('VIN-TEST')) return true;
  if (m.includes('test')) return true;
  // some generated looking VINs?
  if (vin === 'NFJFJF' || vin === 'MKOOOO' || vin === 'DSGDSBF') return true;
  return false;
}

function isTestCharger(ch: any) {
  const sn = (ch.serial_number || '').toUpperCase();
  const m = (ch.model || '').toLowerCase();
  
  if (sn.includes('TEST') || sn.includes('CHG-') || sn.length < 5) return true; // assuming short are fake
  if (m.includes('test')) return true;
  return false;
}

async function run() {
  const { data: customers } = await supabase.from('customers').select('*');
  const { data: vehicles } = await supabase.from('vehicles').select('*');
  const { data: chargers } = await supabase.from('chargers').select('*');
  const { data: installations } = await supabase.from('installations').select('*');

  const testCustomers = (customers || []).filter(isTestCustomer);
  const testVehicles = (vehicles || []).filter(v => isTestVehicle(v) || testCustomers.some(c => c.id === v.customer_id));
  const testChargers = (chargers || []).filter(c => isTestCharger(c) || testVehicles.some(v => v.id === c.vehicle_id) || testCustomers.some(cust => cust.id === c.customer_id));
  const testInstallations = (installations || []).filter(i => 
    testCustomers.some(c => c.id === i.customer_id) || 
    testVehicles.some(v => v.id === i.vehicle_id) || 
    testChargers.some(c => c.id === i.charger_id)
  );

  console.log(JSON.stringify({
    customers: testCustomers.map(c => ({
      id: c.id, name: c.name, phone: c.phone, email: c.email, dealer_id: c.dealer_id, created_at: c.created_at, reason: isTestCustomer(c) ? 'Name/Email indicates test' : 'Orphan/Linked to test'
    })),
    vehicles: testVehicles.map(v => ({
      id: v.id, vin: v.vin, model: v.model, customer_id: v.customer_id, dealer_id: v.dealer_id, oem_id: v.oem_id, created_at: v.created_at, reason: isTestVehicle(v) ? 'VIN/Model indicates test' : 'Linked to test customer'
    })),
    chargers: testChargers.map(c => ({
      id: c.id, serial_number: c.serial_number, model: c.model, vehicle_id: c.vehicle_id, customer_id: c.customer_id, created_at: c.created_at, reason: isTestCharger(c) ? 'Serial/Model indicates test' : 'Linked to test vehicle/customer'
    })),
    installations: testInstallations.map(i => ({
      id: i.id, customer_id: i.customer_id, charger_id: i.charger_id, vehicle_id: i.vehicle_id, partner_id: i.partner_id, technician_id: i.technician_id, status: i.status, created_at: i.created_at, reason: 'Linked to test customer/vehicle/charger'
    }))
  }, null, 2));
}

run();
