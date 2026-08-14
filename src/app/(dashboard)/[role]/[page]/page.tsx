"use client";

import React, { use } from 'react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth';

export default function GenericListPage({ params }: { params: Promise<{ role: string, page: string }> }) {
  const { role, page } = use(params);
  const { user } = useAuth();
  
  // Get all data arrays
  const dataStore = useData() as unknown as Record<string, any[]>;
  
  // We map the URL path to the key in the data store
  let dataKey = '';
  let columns: {key: string, label: string}[] = [];
  let title = 'Records';

  switch (page) {
    case 'oems':
      dataKey = 'oems';
      title = 'OEM Manufacturers';
      columns = [{key: 'id', label: 'OEM ID'}, {key: 'name', label: 'Name'}, {key: 'contactPerson', label: 'Contact'}, {key: 'email', label: 'Email'}, {key: 'status', label: 'Status'}];
      break;
    case 'dealerships':
      dataKey = 'dealers';
      title = 'Dealerships';
      columns = [{key: 'id', label: 'Dealer ID'}, {key: 'name', label: 'Dealership Name'}, {key: 'city', label: 'City'}, {key: 'phone', label: 'Phone'}, {key: 'status', label: 'Status'}];
      break;
    case 'customers':
      dataKey = 'customers';
      title = 'Customers';
      columns = [{key: 'id', label: 'Customer ID'}, {key: 'name', label: 'Name'}, {key: 'phone', label: 'Phone'}, {key: 'city', label: 'City'}, {key: 'dealerId', label: 'Dealer ID'}];
      break;
    case 'vehicles':
      dataKey = 'vehicles';
      title = 'Vehicles';
      columns = [{key: 'id', label: 'VIN'}, {key: 'model', label: 'Model'}, {key: 'registrationNumber', label: 'Registration'}, {key: 'saleDate', label: 'Sale Date'}];
      break;
    case 'chargers':
      dataKey = 'chargers';
      title = 'Chargers';
      columns = [{key: 'id', label: 'Serial Number'}, {key: 'model', label: 'Model'}, {key: 'power', label: 'Power'}, {key: 'vehicleId', label: 'Vehicle VIN'}];
      break;
    case 'partners':
      dataKey = 'partners';
      title = 'Installation Partners';
      columns = [{key: 'id', label: 'Partner ID'}, {key: 'name', label: 'Name'}, {key: 'contactPerson', label: 'Contact'}, {key: 'phone', label: 'Phone'}, {key: 'status', label: 'Status'}];
      break;
    case 'technicians':
      dataKey = 'technicians';
      title = 'Technicians';
      columns = [{key: 'id', label: 'Tech ID'}, {key: 'name', label: 'Name'}, {key: 'location', label: 'Location'}, {key: 'phone', label: 'Phone'}, {key: 'status', label: 'Status'}];
      break;
    case 'installations':
    case 'requests':
    case 'new':
    case 'active':
    case 'scheduled':
    case 'completed':
    case 'revisits':
    case 'upcoming':
      dataKey = 'installations';
      title = page.charAt(0).toUpperCase() + page.slice(1).replace('-', ' ');
      columns = [
        {key: 'id', label: 'Inst. ID'}, 
        {key: 'customerId', label: 'Customer ID'}, 
        {key: 'status', label: 'Status'},
        {key: 'dateCreated', label: 'Date'}
      ];
      break;
    default:
      dataKey = '';
  }

  let data = dataKey ? (dataStore[dataKey] || []) : [];

  // Filter installations based on specific route conditions if needed
  if (dataKey === 'installations') {
    if (page === 'new') data = data.filter((item: any) => item.status === 'PENDING_PARTNER' || item.status === 'NEW');
    else if (page === 'active') data = data.filter((item: any) => ['PENDING_PARTNER', 'SCHEDULED', 'IN PROGRESS', 'IN_PROGRESS'].includes(item.status));
    else if (page === 'scheduled' || page === 'upcoming') data = data.filter((item: any) => item.status === 'SCHEDULED');
    else if (page === 'completed') data = data.filter((item: any) => item.status === 'COMPLETED' || item.status === 'VERIFIED' || item.status === 'UNDER VERIFICATION');
    else if (page === 'requests') data = data.filter((item: any) => ['PENDING_DEALER', 'PENDING_PARTNER', 'NEW'].includes(item.status));
    else if (page === 'revisits') data = data.filter((item: any) => item.status === 'REVISIT REQUIRED' || item.status === 'REVISIT_REQUIRED');
  }

  if (!dataKey || !dataStore[dataKey]) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 capitalize">{page.replace('-', ' ')}</h2>
        <p className="text-gray-500">This module is not applicable or empty.</p>
      </div>
    );
  }

  // Basic mock filtering based on role to ensure role isolation
  if (user?.role === 'OEM') {
    if (dataKey === 'dealers' || dataKey === 'vehicles') {
      data = data.filter(item => item.oemId === user.roleId);
    } else if (dataKey === 'customers') {
      const myDealerIds = dataStore['dealers'].filter(d => d.oemId === user.roleId).map(d => d.id);
      data = data.filter(item => myDealerIds.includes(item.dealerId));
    } else if (dataKey === 'chargers') {
      const myVehicles = dataStore['vehicles'].filter(v => v.oemId === user.roleId).map(v => v.id);
      data = data.filter(item => myVehicles.includes(item.vehicleId));
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage {title.toLowerCase()} in the system.</p>
        </div>
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
                            item[col.key] === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item[col.key]}
                          </span>
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
