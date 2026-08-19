import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { TrendingUp, Users, Zap, CheckCircle } from 'lucide-react';
import { ExportCSVButton } from './ExportCSVButton';

export default async function ReportsPage() {
  const supabase = await createClient();

  const [
    { data: installations },
    { count: totalCustomers }
  ] = await Promise.all([
    supabase.from('installations').select('*'),
    supabase.from('customers').select('*', { count: 'exact', head: true })
  ]);

  const installs = installations || [];
  
  const completedInstalls = installs.filter(i => ['VERIFIED', 'COMPLETED'].includes(i.status)).length;
  const inProgressInstalls = installs.filter(i => ['IN_PROGRESS', 'UNDER_VERIFICATION', 'REVISIT_REQUIRED'].includes(i.status)).length;
  const newInstalls = installs.filter(i => ['NEW', 'PARTNER_ASSIGNED', 'TECHNICIAN_ASSIGNED'].includes(i.status)).length;
  
  const successRate = installs.length ? Math.round((completedInstalls / installs.length) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="mt-1 text-sm text-gray-500">Monitor installation performance and export data.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          {/* We must cast to any or map the DB type to match the frontend type closely enough for the CSV export, or modify ExportCSVButton to take any array */}
          <ExportCSVButton installations={installs as any} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed Installations</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{completedInstalls}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Zap className="h-6 w-6 text-yellow-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active In-Progress</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{inProgressInstalls}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-blue-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{successRate}%</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-purple-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{totalCustomers || 0}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200 p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Detailed charts and graphs will appear here.</p>
          <p className="text-xs text-gray-400">Data visualization library integration pending Phase 5.</p>
        </div>
      </div>
    </div>
  );
}
