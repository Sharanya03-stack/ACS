import { SupabaseClient } from '@supabase/supabase-js';

export interface GetInstallationsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  category?: string;
  oem_id?: string;
  dealer_id?: string;
  partner_id?: string;
  technician_id?: string;
}

export async function getInstallations(supabase: SupabaseClient, params: GetInstallationsParams) {
  const page = params.page || 1;
  const limit = params.limit || 10;
  const offset = (page - 1) * limit;

  let query = supabase.from('installations').select(`
    *,
    customers:customer_id (*),
    vehicles:vehicle_id (*),
    chargers:charger_id (*),
    dealers:dealer_id (id, name, type),
    oems:oem_id (id, name, type),
    partners:partner_id (id, name, type, address),
    technicians:technician_id (id, name, role)
  `, { count: 'exact' });

  if (params.status) {
    const validStatuses = [
      'NEW', 'PARTNER_ASSIGNED', 'TECHNICIAN_ASSIGNED', 'SCHEDULED', 
      'IN_PROGRESS', 'COMPLETED', 'UNDER_VERIFICATION', 'VERIFIED', 
      'ON_HOLD', 'RESCHEDULED', 'REVISIT_REQUIRED', 'CANCELLED', 'FAILED'
    ];
    if (validStatuses.includes(params.status)) {
      query = query.eq('status', params.status);
    }
  }
  if (params.category) {
    // Prevent invalid enum values from crashing the query
    const validCategories = ['INSTALLATION_ONLY', 'INSTALLATION_AND_EARTHING'];
    if (validCategories.includes(params.category)) {
      query = query.eq('category', params.category);
    }
  }
  if (params.start_date) {
    query = query.gte('created_at', params.start_date);
  }
  if (params.end_date) {
    query = query.lte('created_at', params.end_date);
  }
  if (params.oem_id) {
    query = query.eq('oem_id', params.oem_id);
  }
  if (params.dealer_id) {
    query = query.eq('dealer_id', params.dealer_id);
  }
  if (params.partner_id) {
    query = query.eq('partner_id', params.partner_id);
  }
  if (params.technician_id) {
    query = query.eq('technician_id', params.technician_id);
  }
  
  if (params.search) {
    const term = `%${params.search}%`;
    
    // Concurrently search related tables for matching foreign keys
    const [custRes, vehRes, charRes] = await Promise.all([
      supabase.from('customers').select('id').ilike('name', term),
      supabase.from('vehicles').select('id').ilike('vin', term),
      supabase.from('chargers').select('id').ilike('serial_number', term)
    ]);
    
    const custIds = (custRes.data || []).map(d => d.id);
    const vehIds = (vehRes.data || []).map(d => d.id);
    const charIds = (charRes.data || []).map(d => d.id);
    
    // Supabase allows OR across root table columns. We can construct an OR filter string.
    let orClauses = [];
    
    if (custIds.length > 0) orClauses.push(`customer_id.in.(${custIds.join(',')})`);
    if (vehIds.length > 0) orClauses.push(`vehicle_id.in.(${vehIds.join(',')})`);
    if (charIds.length > 0) orClauses.push(`charger_id.in.(${charIds.join(',')})`);
    
    // We can also search installation ID if it matches the UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(params.search)) {
      orClauses.push(`id.eq.${params.search}`);
    }
    
    if (orClauses.length > 0) {
      query = query.or(orClauses.join(','));
    } else {
      // If search yielded no IDs, return empty result by forcing a false condition
      query = query.eq('id', '00000000-0000-0000-0000-000000000000');
    }
  }

  query = query.order('created_at', { ascending: false });
  
  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching installations:", JSON.stringify(error, null, 2));
    return { data: [], count: 0, error };
  }

  return { data, count, error: null };
}

export async function getInstallationMetrics(supabase: SupabaseClient) {
  // To avoid multiple queries for large datasets, we can fetch just the status column
  const { data, error } = await supabase.from('installations').select('status');
  
  if (error) {
    console.error("Error fetching metrics:", error);
    return { Total: 0, Pending: 0, InProgress: 0, UnderVerification: 0, RevisitRequired: 0, Verified: 0 };
  }

  const metrics = {
    Total: data.length,
    Pending: 0,
    InProgress: 0,
    UnderVerification: 0,
    RevisitRequired: 0,
    Verified: 0
  };

  data.forEach(inst => {
    switch (inst.status) {
      case 'NEW':
      case 'PENDING_ASSIGNMENT':
      case 'ASSIGNED':
        metrics.Pending++;
        break;
      case 'IN_PROGRESS':
        metrics.InProgress++;
        break;
      case 'UNDER_VERIFICATION':
        metrics.UnderVerification++;
        break;
      case 'REVISIT_REQUIRED':
        metrics.RevisitRequired++;
        break;
      case 'VERIFIED':
        metrics.Verified++;
        break;
    }
  });

  return metrics;
}
