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
      { data: vehicles },
      { data: chargers },
      { data: installations }
    ] = await Promise.all([
      supabase.from('vehicles').select('*').eq('customer_id', customerId),
      supabase.from('chargers').select('*').eq('customer_id', customerId),
      supabase.from('installations').select('*').eq('customer_id', customerId).order('created_at', { ascending: false })
    ]);

    // 4. Resolve Partner and Technician names (Requires admin client due to cross-org RLS limitations for dealers/oems)
    let enrichedInstallations = [];
    
    if (installations && installations.length > 0) {
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      enrichedInstallations = await Promise.all(installations.map(async (inst) => {
        let partnerName = null;
        let technicianName = null;
        
        if (inst.partner_id) {
          const { data: partner } = await adminClient.from('organizations').select('name').eq('id', inst.partner_id).maybeSingle();
          if (partner) partnerName = partner.name;
        }

        if (inst.technician_id) {
          const { data: tech } = await adminClient.from('profiles').select('name, address').eq('id', inst.technician_id).maybeSingle();
          if (tech) technicianName = tech.name;
        }

        // Fetch photos and generate signed URLs
        let photos = [];
        const { data: photoData } = await adminClient
          .from('installation_photos')
          .select('*')
          .eq('installation_id', inst.id);
        
        if (photoData && photoData.length > 0) {
          photos = await Promise.all(photoData.map(async (photo) => {
            const { data } = await adminClient.storage
              .from('installation-evidence')
              .createSignedUrl(photo.storage_path, 3600); // 1 hour
            return { ...photo, url: data?.signedUrl };
          }));
        }

        return {
          ...inst,
          partner_name: partnerName,
          technician_name: technicianName,
          photos
        };
      }));
    }

    // 5. Fetch profile for role-based UI
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    return {
      success: true,
      data: {
        profile,
        customer,
        vehicles: vehicles || [],
        chargers: chargers || [],
        installations: enrichedInstallations
      }
    };

  } catch (error: any) {
    console.error("Error fetching customer details:", error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
