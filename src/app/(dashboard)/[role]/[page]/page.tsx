import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { AddEntityButton, RowActions } from '@/components/crud/CrudModals';

export default async function GenericListPage(props: { params: Promise<{ role: string, page: string }> }) {
  const params = await props.params;
  const { role, page } = params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  const roleRouteMap: Record<string, string> = {
    'ACS_ADMIN': 'admin',
    'OEM': 'oem',
    'DEALER': 'dealer',
    'PARTNER': 'partner',
    'TECHNICIAN': 'technician'
  };

  if (roleRouteMap[profile.role] !== role) {
    redirect('/login');
  }

  let columns: {key: string, label: string}[] = [];
  let title = 'Records';
  let data: any[] = [];
  let parentOrgs: any[] = [];

  switch (page) {
    case 'oems':
      title = 'OEM Manufacturers';
      columns = [{key: 'id', label: 'OEM ID'}, {key: 'name', label: 'Name'}, {key: 'contactPerson', label: 'Contact'}, {key: 'email', label: 'Email'}, {key: 'status', label: 'Status'}];
      const { data: oems } = await supabase.from('organizations').select('id, name, contact_phone, contact_email, address, status').eq('type', 'OEM').eq('status', 'ACTIVE');
      data = (oems || []).map(o => ({ ...o, contactPerson: o.contact_phone, email: o.contact_email }));
      break;
    case 'dealerships':
      title = 'Dealerships';
      columns = [{key: 'id', label: 'Dealer ID'}, {key: 'name', label: 'Dealership Name'}, {key: 'city', label: 'City'}, {key: 'phone', label: 'Phone'}, {key: 'status', label: 'Status'}];
      const { data: dealers } = await supabase.from('organizations').select('id, name, parent_org_id, address, contact_phone, contact_email, status').eq('type', 'DEALER').eq('status', 'ACTIVE');
      data = (dealers || []).map(d => ({ ...d, city: '-', phone: d.contact_phone, email: d.contact_email }));
      const { data: allOems } = await supabase.from('organizations').select('id, name, status').eq('type', 'OEM').eq('status', 'ACTIVE');
      parentOrgs = allOems || [];
      break;
    case 'customers':
      title = 'Customers';
      columns = [{key: 'id', label: 'Customer ID'}, {key: 'name', label: 'Name'}, {key: 'phone', label: 'Phone'}, {key: 'city', label: 'City'}, {key: 'dealerId', label: 'Dealer ID'}];
      const { data: customers } = await supabase.from('customers').select('id, name, phone, city, dealer_id');
      data = (customers || []).map(c => ({ ...c, dealerId: c.dealer_id }));
      break;
    case 'vehicles':
      title = 'Vehicles';
      columns = [{key: 'id', label: 'VIN'}, {key: 'model', label: 'Model'}, {key: 'registrationNumber', label: 'Registration'}, {key: 'saleDate', label: 'Sale Date'}];
      const { data: vehicles } = await supabase.from('vehicles').select('id, vin, model, registration_number, sale_date');
      data = (vehicles || []).map(v => ({ ...v, registrationNumber: v.registration_number, saleDate: v.sale_date, id: v.vin }));
      break;
    case 'chargers':
      title = 'Chargers';
      columns = [{key: 'id', label: 'Serial Number'}, {key: 'model', label: 'Model'}, {key: 'power', label: 'Power'}, {key: 'vehicleId', label: 'Vehicle VIN'}];
      const { data: chargers } = await supabase.from('chargers').select('id, serial_number, model, power_rating, vehicle_id');
      data = (chargers || []).map(c => ({ ...c, id: c.serial_number, power: c.power_rating, vehicleId: c.vehicle_id }));
      break;
    case 'partners':
      title = 'Installation Partners';
      columns = [{key: 'id', label: 'Partner ID'}, {key: 'name', label: 'Name'}, {key: 'contactPerson', label: 'Contact'}, {key: 'phone', label: 'Phone'}, {key: 'status', label: 'Status'}];
      const { data: partners } = await supabase.from('organizations').select('id, name, address, contact_phone, contact_email, status').eq('type', 'PARTNER').eq('status', 'ACTIVE');
      data = (partners || []).map(p => ({ ...p, contactPerson: '-', phone: p.contact_phone, email: p.contact_email }));
      break;
    case 'technicians':
      title = 'Technicians';
      columns = [{key: 'id', label: 'Tech ID'}, {key: 'name', label: 'Name'}, {key: 'location', label: 'Location'}, {key: 'phone', label: 'Phone'}, {key: 'status', label: 'Status'}];
      const { data: technicians } = await supabase.from('profiles').select('id, name, phone, status').eq('role', 'TECHNICIAN').eq('status', 'ACTIVE');
      data = (technicians || []).map(t => ({ ...t, location: '-' }));
      break;
    case 'installations':
    case 'requests':
    case 'new':
    case 'active':
    case 'scheduled':
    case 'completed':
    case 'revisits':
    case 'upcoming':
      title = page.charAt(0).toUpperCase() + page.slice(1).replace('-', ' ');
      columns = [
        {key: 'id', label: 'Inst. ID'}, 
        {key: 'customerId', label: 'Customer ID'}, 
        {key: 'status', label: 'Status'},
        {key: 'dateCreated', label: 'Date'}
      ];
      
      let query = supabase.from('installations').select(`
        id, status, created_at, customer_id,
        customers(name, city),
        vehicles(model, registration_number)
      `);
      
      if (page === 'new') query = query.in('status', ['NEW', 'PENDING_PARTNER']);
      else if (page === 'active') query = query.in('status', ['PENDING_PARTNER', 'SCHEDULED', 'IN_PROGRESS']);
      else if (page === 'scheduled' || page === 'upcoming') query = query.eq('status', 'SCHEDULED');
      else if (page === 'completed') query = query.in('status', ['COMPLETED', 'VERIFIED', 'UNDER_VERIFICATION']);
      else if (page === 'requests') query = query.in('status', ['NEW', 'PENDING_DEALER', 'PENDING_PARTNER']);
      else if (page === 'revisits') query = query.eq('status', 'REVISIT_REQUIRED');
      
      const { data: installations } = await query;
      data = (installations || []).map(i => ({ 
        id: i.id,
        customerId: i.customer_id,
        status: i.status === 'IN_PROGRESS' ? 'IN PROGRESS' : (i.status === 'REVISIT_REQUIRED' ? 'REVISIT REQUIRED' : i.status),
        dateCreated: new Date(i.created_at).toLocaleDateString()
      }));
      break;
    default:
      notFound();
  }

  const supportsActions = ['oems', 'dealerships', 'partners', 'technicians'].includes(page);
  if (supportsActions) {
    columns.push({ key: 'actions', label: 'Actions' });
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage {title.toLowerCase()} in the system.</p>
        </div>
        <AddEntityButton page={page} oems={parentOrgs} />
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map(col => (
                  <th key={col.key} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-gray-500">
                    No records found.
                  </td>
                </tr>
              ) : (
                data.map((item, i) => (
                  <tr key={item.id || i} className="hover:bg-gray-50">
                    {columns.map(col => (
                      <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {col.key === 'status' ? (
                          <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            item[col.key] === 'ACTIVE' || item[col.key] === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                            item[col.key] === 'NEW' ? 'bg-blue-100 text-blue-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item[col.key]}
                          </span>
                        ) : col.key === 'actions' ? (
                          <RowActions page={page} item={item} oems={parentOrgs} />
                        ) : (
                          item[col.key] || '-'
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
