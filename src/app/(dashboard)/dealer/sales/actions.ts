"use server";

import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { isValidPhone } from '@/utils/validation';

export async function createSaleAction(formData: FormData) {
  const supabase = await createServerClient();
  
  // 1. Authenticate & Resolve Dealer Identity
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'DEALER' || !profile.org_id) {
    return { error: 'Unauthorized: Not a dealer' };
  }

  const dealerId = profile.org_id;

  // Resolve OEM ID (parent_org_id)
  const { data: dealerOrg } = await supabase
    .from('organizations')
    .select('parent_org_id')
    .eq('id', dealerId)
    .single();

  if (!dealerOrg || !dealerOrg.parent_org_id) {
    return { error: 'Integrity Error: Dealer has no associated OEM' };
  }

  const oemId = dealerOrg.parent_org_id;

  // 2. Parse Form Data
  const customerName = formData.get('customerName') as string;
  const customerPhone = formData.get('customerPhone') as string;
  const customerEmail = formData.get('customerEmail') as string;
  const customerAddress = formData.get('customerAddress') as string;
  const customerCity = formData.get('customerCity') as string;
  const customerState = formData.get('customerState') as string;
  const customerPincode = formData.get('customerPincode') as string;
  const vehicleModel = formData.get('vehicleModel') as string;
  let vin = formData.get('vin') as string;
  const chargerModel = formData.get('chargerModel') as string;
  const chargerPower = formData.get('chargerPower') as string;


  if (!isValidPhone(customerPhone)) {
    return { error: 'Invalid phone number format.' };
  }

  if (!vin || vin.trim() === '') {
    vin = `VIN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  } else {
    vin = vin.trim().toUpperCase();
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Before inserting, perform a server-side duplicate VIN check globally.
  const { data: existingVehicle, error: existingErr } = await adminClient
    .from('vehicles')
    .select('id')
    .eq('vin', vin)
    .maybeSingle();

  if (existingErr) {
    return { error: 'An error occurred while verifying the VIN.' };
  }

  if (existingVehicle) {
    return { error: 'A vehicle with this VIN already exists. Please check the VIN or use the existing vehicle.' };
  }

  // State array to track successful creations for potential rollback
  const rollbackQueue: { table: string, id: string }[] = [];
  let success = false;
  let createdInstallationId = null;

  try {
    // 3. Create Customer
    const { data: custData, error: custErr } = await supabase
      .from('customers')
      .insert({
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        address: customerAddress,
        city: customerCity,
        state: customerState,
        pincode: customerPincode,
        dealer_id: dealerId
      })
      .select('id')
      .single();

    if (custErr || !custData) throw new Error(`Customer creation failed: ${custErr?.message}`);
    const customerId = custData.id;
    rollbackQueue.push({ table: 'customers', id: customerId });

    // 4. Create Vehicle
    const { data: vehData, error: vehErr } = await supabase
      .from('vehicles')
      .insert({
        vin: vin,
        model: vehicleModel,
        customer_id: customerId,
        dealer_id: dealerId,
        oem_id: oemId,
        sale_date: new Date().toISOString().split('T')[0],
        delivery_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
      .select('id')
      .single();
      
    if (vehErr || !vehData) throw new Error(`Vehicle creation failed: ${vehErr?.message}`);
    const vehicleId = vehData.id;
    rollbackQueue.push({ table: 'vehicles', id: vehicleId });

    // 5. Create Charger
    const serialNumber = `CHG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const { data: chrData, error: chrErr } = await supabase
      .from('chargers')
      .insert({
        serial_number: serialNumber,
        model: chargerModel,
        power_rating: chargerPower,
        vehicle_id: vehicleId,
        customer_id: customerId,
        supplied_date: new Date().toISOString().split('T')[0]
      })
      .select('id')
      .single();

    if (chrErr || !chrData) throw new Error(`Charger creation failed: ${chrErr?.message}`);
    const chargerId = chrData.id;
    rollbackQueue.push({ table: 'chargers', id: chargerId });

    success = true;
    
    return { success: true };

  } catch (err: any) {
    // 7. COMPENSATING TRANSACTION: ROLLBACK ALL
    // Since Dealer RLS blocks DELETEs, we must use the Admin Service Client to clean up the partial state
    let rollbackFailed = false;

    if (rollbackQueue.length > 0) {
      // Roll back in reverse order of insertion to respect foreign keys
      for (let i = rollbackQueue.length - 1; i >= 0; i--) {
        const item = rollbackQueue[i];
        try {
          const { error } = await adminClient.from(item.table).delete().eq('id', item.id);
          if (error) throw error;
        } catch (rollbackErr) {
          console.error(`[CRITICAL] Rollback failed for ${item.table} (ID: ${item.id}):`, rollbackErr);
          rollbackFailed = true;
        }
      }
    }

    // Log the original error server-side securely
    console.error(`[Sale Error] Sale creation failed for Dealer ${dealerId}:`, err);

    if (rollbackFailed) {
      console.error(`[CRITICAL ALERT] Partial sale records exist. Manual database cleanup required for Dealer ${dealerId}.`);
    }

    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes('vehicles_vin_key')) {
      return { error: 'A vehicle with this VIN already exists. Please check the VIN or use the existing vehicle.' };
    }

    // Return a generic, safe error to the client
    return { error: 'Failed to create sale: ' + errorMessage };
  }
}
