"use client";

import React from "react";
import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";

export function ExportCSVButton() {
  const searchParams = useSearchParams();

  const handleExportCSV = () => {
    window.location.href = `/api/export?${searchParams.toString()}`;
  };

  return (
    <button 
      onClick={handleExportCSV}
      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#243B36] hover:bg-[#1a2b27] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#243B36]"
    >
      <Download className="mr-2 -ml-1 h-4 w-4" aria-hidden="true" />
      Export CSV
    </button>
  );
}
