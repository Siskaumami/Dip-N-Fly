import PDFDocument from 'pdfkit';

export function streamPdf(res, title, buildFn) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFileName(title)}.pdf"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(18).text(title, { align: 'center' });
  doc.moveDown(1);

  buildFn(doc);

  doc.end();
}

function sanitizeFileName(s) {
  return String(s || 'report')
    .replace(/[^a-z0-9-_]+/gi, '_')
    .replace(/_+/g, '_')
    .slice(0, 60);
}
