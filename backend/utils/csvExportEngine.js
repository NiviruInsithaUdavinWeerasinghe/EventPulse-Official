// Shared CSV compilation engine used by every financial export endpoint.
// A "sheet" is one titled table; a "workbook" is several sheets compiled
// into a single downloadable CSV, since plain CSV has no native concept of
// multiple tabs the way a spreadsheet file does.

const escapeCsvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const buildCsvSheet = (title, headers, rows) => {
  const lines = [`## ${title}`, headers.map(escapeCsvValue).join(',')];

  if (rows.length === 0) {
    lines.push(escapeCsvValue('(no entries)'));
  } else {
    for (const row of rows) {
      lines.push(row.map(escapeCsvValue).join(','));
    }
  }

  return lines.join('\r\n');
};

export const compileCsvWorkbook = (sheets) => sheets.join('\r\n\r\n');

export const sendCsvDownload = (res, filename, content) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(content);
};
