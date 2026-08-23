"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddEntityButton } from '@/components/crud/CrudModals';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Search } from 'lucide-react';
import { deactivateOrganization } from '../organizations/actions';
import toast from 'react-hot-toast';

interface Props {
  partners: any[];
  totalCount: number;
  initialSearch: string;
}

export function AdminPartnersClient({ partners, totalCount, initialSearch }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [isDeactivating, setIsDeactivating] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/admin/partners?search=${encodeURIComponent(search)}`);
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this Partner?')) return;
    setIsDeactivating(id);
    const res = await deactivateOrganization(id);
    setIsDeactivating(null);
    if (res.error) toast.error(res.error);
    else toast.success('Deactivated successfully');
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partner Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all Installation Partners in the ACS network.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-4">
          <form onSubmit={handleSearch} className="flex relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Partners..."
              className="pl-10 rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm border py-2 pr-3"
            />
          </form>
          <AddEntityButton page="partners" />
        </div>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-300 sm:rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Contact</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {partners.length === 0 ? (
              <tr>
                <td colSpan={4} className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 text-center sm:pl-6">
                  No Partners found.
                </td>
              </tr>
            ) : (
              partners.map((partner) => (
                <tr key={partner.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {partner.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {partner.contact_email || 'N/A'}<br />
                    {partner.contact_phone || ''}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <StatusBadge status={partner.status} />
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    {partner.status === 'ACTIVE' && (
                      <button 
                        onClick={() => handleDeactivate(partner.id)}
                        disabled={isDeactivating === partner.id}
                        className="text-red-600 hover:text-red-900 ml-4 disabled:opacity-50"
                      >
                        {isDeactivating === partner.id ? '...' : 'Deactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
