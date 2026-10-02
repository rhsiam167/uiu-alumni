/**
 * Formats data array into CSV string with formula injection protection.
 */
export function generateCsv(headers, rows) {
  const sanitizeCell = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    if (/^[=+\-@]/.test(str)) {
      str = "'" + str;
    }
    // Escape quotes
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(h => sanitizeCell(h.label)).join(',');
  const rowLines = rows.map(row => {
    return headers.map(h => sanitizeCell(row[h.key])).join(',');
  });

  return [headerLine, ...rowLines].join('\r\n');
}
