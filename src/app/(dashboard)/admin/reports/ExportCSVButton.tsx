"use client";

import React, { useState } from 'react';
import { Download } from 'lucide-react';


export function ExportCSVButton({ installations }: { installations: any[] }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = () => {
    setIsExporting(true);
    setTimeout(() => {
      const headers = ['Installation ID', 'Customer ID', 'Dealer ID', 'Partner ID', 'Status', 'Date Created', 'Completed At'];
      const rows = installations.map(i => [
        i.id, 
        i.customer_id, 
        i.dealer_id, 
        i.partner_id || 'Unassigned', 
        i.status, 
        i.created_at, 
        i.completed_at || 'N/A'
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
    <button 
      onClick={handleExportCSV}
      disabled={isExporting}
      className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${isExporting ? 'opacity-75 cursor-not-allowed' : ''}`}
    >
      <Download className="mr-2 -ml-1 h-4 w-4" aria-hidden="true" />
      {isExporting ? 'Generating CSV...' : 'Export Full Report'}
    </button>
  );
}
