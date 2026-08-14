"use client";

import React, { useState } from 'react';
import { useData } from '@/lib/data-context';
import { Download, TrendingUp, Users, Zap, CheckCircle } from 'lucide-react';

export default function ReportsPage() {
  const { installations, customers, partners } = useData();
  const [isExporting, setIsExporting] = useState(false);

  const completedInstalls = installations.filter(i => ['VERIFIED', 'COMPLETED'].includes(i.status)).length;
  const inProgressInstalls = installations.filter(i => ['IN PROGRESS', 'UNDER VERIFICATION', 'REVISIT REQUIRED'].includes(i.status)).length;
  const newInstalls = installations.filter(i => ['NEW', 'PARTNER ASSIGNED', 'TECHNICIAN ASSIGNED'].includes(i.status)).length;
  
  const successRate = installations.length ? Math.round((completedInstalls / installations.length) * 100) : 0;

  const handleExportCSV = () => {
    setIsExporting(true);
    setTimeout(() => {
      // Mock CSV generation
      const headers = ['Installation ID', 'Customer ID', 'Dealer ID', 'Partner ID', 'Status', 'Date Created', 'Completed At'];
      const rows = installations.map(i => [
        i.id, 
        i.customerId, 
        i.dealerId, 
        i.partnerId || 'Unassigned', 
        i.status, 
        i.dateCreated, 
        i.completedAt || 'N/A'
      ].join(','));
      
      const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `acs_installations_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsExporting(false);
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="mt-1 text-sm text-gray-500">Monitor installation performance and export data.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={handleExportCSV}
            disabled={isExporting}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${isExporting ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            <Download className="mr-2 -ml-1 h-4 w-4" aria-hidden="true" />
            {isExporting ? 'Generating CSV...' : 'Export Full Report'}
          </button>
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
                    <div className="text-2xl font-semibold text-gray-900">{customers.length}</div>
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
