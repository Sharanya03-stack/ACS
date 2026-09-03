"use client";

/**
 * Safely escapes a string for CSV export.
 */
export function escapeCsv(str: any): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Triggers a browser download of a CSV file.
 * 
 * @param filename The name of the file to download (e.g. 'export.csv')
 * @param headers Array of column headers
 * @param rows Array of arrays representing rows of data
 */
export function downloadCSV(filename: string, headers: string[], rows: any[][]) {
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.map(escapeCsv).join(','));
  
  // Add data rows
  for (const row of rows) {
    csvRows.push(row.map(escapeCsv).join(','));
  }
  
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
