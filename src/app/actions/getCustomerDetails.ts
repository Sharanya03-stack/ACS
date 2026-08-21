"use server";

import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function getCustomerDetails(customerId: string) {
  try {
    const supabase = await createServerClient();
    
    // 1. Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 2. Fetch Customer (RLS enforces tenant isolation server-side!)
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (custError || !customer) {
      return { success: false, error: 'Customer not found or access denied.' };
    }

    // 3. Fetch Vehicle, Charger, Installation via normal authenticated client
    // RLS naturally allows access to these if they have access to the customer
    const [
      { data: vehicle },
      { data: charger },
      { data: installation }
    ] = await Promise.all([
      supabase.from('vehicles').select('*').eq('customer_id', customerId).single(),
      supabase.from('chargers').select('*').eq('customer_id', customerId).single(),
      supabase.from('installations').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(1).single()
    ]);

    // 4. Resolve Partner and Technician names (Requires admin client due to cross-org RLS limitations for dealers/oems)
    let partnerName = null;
    let technicianName = null;
    
    if (installation) {
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      if (installation.partner_id) {
        const { data: partner } = await adminClient.from('organizations').select('name').eq('id', installation.partner_id).single();
        if (partner) partnerName = partner.name;
      }

      if (installation.technician_id) {
        const { data: tech } = await adminClient.from('profiles').select('name').eq('id', installation.technician_id).single();
        if (tech) technicianName = tech.name;
      }
    }

    return {
      success: true,
      data: {
        customer,
        vehicle,
        charger,
        installation: installation ? {
          ...installation,
          partner_name: partnerName,
          technician_name: technicianName
        } : null
      }
    };

  } catch (error: any) {
    console.error("Error fetching customer details:", error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
