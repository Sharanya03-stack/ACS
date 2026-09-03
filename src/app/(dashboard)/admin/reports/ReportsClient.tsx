"use client";

import React, { useMemo } from 'react';
import { TrendingUp, Users, Zap, CheckCircle } from 'lucide-react';
import { ExportCSVButton } from './ExportCSVButton';
import { InstallationFilters } from '@/components/ui/InstallationFilters';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

interface Props {
  installations: any[];
  totalCustomers: number;
  oems: any[];
  dealers: any[];
  partners: any[];
  technicians: any[];
}

const COLORS = ['#243B36', '#D6A84F', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function ReportsClient({ installations, totalCustomers, oems, dealers, partners, technicians }: Props) {
  
  // 1. Summary Metrics
  const completedInstalls = installations.filter(i => ['VERIFIED', 'COMPLETED'].includes(i.status)).length;
  const inProgressInstalls = installations.filter(i => ['IN_PROGRESS', 'UNDER_VERIFICATION', 'REVISIT_REQUIRED'].includes(i.status)).length;
  const newInstalls = installations.filter(i => ['NEW', 'PARTNER_ASSIGNED', 'TECHNICIAN_ASSIGNED'].includes(i.status)).length;
  const successRate = installations.length ? Math.round((completedInstalls / installations.length) * 100) : 0;

  // 2. Orders by Status
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    installations.forEach(inst => {
      const status = inst.status || 'UNKNOWN';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.keys(counts).map(status => ({
      name: status.replace(/_/g, ' '),
      count: counts[status]
    })).sort((a, b) => b.count - a.count);
  }, [installations]);

  // 3. Orders Over Time (Group by Month or Date)
  const timeData = useMemo(() => {
    const counts: Record<string, number> = {};
    installations.forEach(inst => {
      if (inst.created_at) {
        const date = new Date(inst.created_at).toISOString().split('T')[0];
        counts[date] = (counts[date] || 0) + 1;
      }
    });
    return Object.keys(counts).sort().map(date => ({
      date,
      count: counts[date]
    })).slice(-30); // Show last 30 days of data max if ungrouped
  }, [installations]);

  // 4. Partner Performance
  const partnerData = useMemo(() => {
    const counts: Record<string, { total: number, completed: number }> = {};
    installations.forEach(inst => {
      if (inst.partner_name) {
        if (!counts[inst.partner_name]) counts[inst.partner_name] = { total: 0, completed: 0 };
        counts[inst.partner_name].total += 1;
        if (['VERIFIED', 'COMPLETED'].includes(inst.status)) {
          counts[inst.partner_name].completed += 1;
        }
      }
    });
    return Object.keys(counts).map(partner => ({
      name: partner.length > 15 ? partner.substring(0, 15) + '...' : partner,
      Total: counts[partner].total,
      Completed: counts[partner].completed
    })).sort((a, b) => b.Total - a.Total).slice(0, 10);
  }, [installations]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="mt-1 text-sm text-gray-500">Monitor operational performance and export data.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <ExportCSVButton />
        </div>
      </div>

      <div className="mb-8">
        <InstallationFilters 
          oems={oems}
          dealers={dealers}
          partners={partners}
          technicians={technicians}
        />
      </div>

      {installations.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No data available</h3>
          <p className="text-gray-500">No installation data available for the selected filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
              <div className="p-5 flex items-center">
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

            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
              <div className="p-5 flex items-center">
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

            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
              <div className="p-5 flex items-center">
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

            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
              <div className="p-5 flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-purple-500" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Orders (Filtered)</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{installations.length}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-6">Installation Orders by Status</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent = 0 }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-6">Orders Over Time (Last 30 Days)</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#243B36" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm lg:col-span-2">
              <h3 className="text-base font-bold text-gray-900 mb-6">Top Partners by Volume</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={partnerData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Total" fill="#243B36" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Completed" fill="#D6A84F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
