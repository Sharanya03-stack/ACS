import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getInstallations } from '@/utils/queries';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Parse search params
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search') || undefined;
  const status = searchParams.get('status') || undefined;
  const category = searchParams.get('category') || undefined;
  const dealer_id = searchParams.get('dealer_id') || undefined;
  const oem_id = searchParams.get('oem_id') || undefined;
  const partner_id = searchParams.get('partner_id') || undefined;
  const technician_id = searchParams.get('technician_id') || undefined;

  // We set page = 1 but pass a large limit to query for export
  const limit = 5000;
  
  // Use our unified query layer to respect RLS and filtering safely
  // The backend already restricts what this user can query
  const { data: installations } = await getInstallations(supabase, {
    page: 1,
    limit,
    search,
    status,
    category,
    dealer_id,
    oem_id,
    partner_id,
    technician_id
  });

  if (!installations) {
    return new NextResponse('No data found', { status: 404 });
  }

  // Convert to CSV string
  const headers = [
    'Installation ID',
    'Status',
    'Category',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Customer Address',
    'Customer City',
    'Customer State',
    'Customer Zip',
    'Vehicle Make',
    'Vehicle Model',
    'Vehicle Year',
    'Charger Serial',
    'Charger Model',
    'Dealer Name',
    'OEM Name',
    'Partner Name',
    'Technician Name',
    'Scheduled Date',
    'Created At'
  ];

  const csvRows = [];
  csvRows.push(headers.join(','));

  const escapeCsv = (str: any) => {
    if (str === null || str === undefined) return '';
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  for (const inst of installations) {
    const row = [
      inst.id,
      inst.status,
      inst.category,
      inst.customers?.name,
      inst.customers?.email,
      inst.customers?.phone,
      inst.customers?.address,
      inst.customers?.city,
      inst.customers?.state,
      inst.customers?.zip_code,
      inst.vehicles?.make,
      inst.vehicles?.model,
      inst.vehicles?.year,
      inst.chargers?.serial_number,
      inst.chargers?.model,
      inst.dealers?.name,
      inst.oems?.name,
      inst.partners?.name,
      inst.technicians?.name || '',
      inst.scheduled_date,
      inst.created_at
    ];
    csvRows.push(row.map(escapeCsv).join(','));
  }

  const csvContent = csvRows.join('\n');

  const now = new Date().toISOString().split('T')[0];
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="acs_installations_export_${now}.csv"`,
    },
  });
}
