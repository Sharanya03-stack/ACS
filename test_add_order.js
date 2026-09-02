require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAddOrder() {
  console.log("Testing insert into installations with new columns...");
  
  // Create a dummy customer, vehicle, charger just to satisfy FKs for a quick test
  // Or just rely on the RLS bypassing service role and insert nulls if they allow it. 
  // Wait, vehicle_id, customer_id, charger_id might be required.
  // Let's fetch one existing charger to use as reference.
  const { data: charger, error: chgErr } = await supabase.from('chargers').select('*').limit(1).single();
  if (chgErr) {
    console.error("Failed to fetch charger:", chgErr);
    return;
  }
  
  const { data, error } = await supabase.from('installations').insert({
    charger_id: charger.id,
    vehicle_id: charger.vehicle_id,
    customer_id: charger.customer_id,
    dealer_id: charger.dealer_id || null,
    oem_id: charger.oem_id || null,
    status: 'NEW',
    category: 'INSTALLATION_AND_EARTHING',
    remarks: 'Test remark for verification'
  }).select('id, remarks, tracking_token').single();
  
  if (error) {
    console.error("Insert failed:", error);
  } else {
    console.log("Insert successful! Returned data:", data);
    
    // Clean up
    await supabase.from('installations').delete().eq('id', data.id);
    console.log("Cleaned up test record.");
  }
}
testAddOrder();
