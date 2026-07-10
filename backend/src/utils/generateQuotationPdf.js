const PDFDocument = require('pdfkit');
const resolveUploadPath = require('./resolveUploadPath');

/**
 * generateQuotationPdf — builds a PDF quotation document using pdfkit.
 *
 * @param {object} params
 * @param {object} params.quotation   - Full quotation row (id, basePrice, totalAmount, decision, validUntil, createdAt)
 * @param {object[]} params.charges   - Array of { label, amount }
 * @param {object} params.unit        - { unitNumber, price, project: { name, location } }
 * @param {object} params.contact     - { fullName, phone, email }
 * @param {object} params.company     - { name, email, phone, address, logoUrl }
 * @param {object} params.createdBy   - { fullName }
 * @returns {Promise<Buffer>}         - Resolves with the PDF as a Buffer
 */
const generateQuotationPdf = ({ quotation, charges, unit, contact, company, createdBy }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const PRIMARY = '#4F46E5';
    const GRAY_LIGHT = '#F8FAFC';
    const GRAY_TEXT = '#6B7280';
    const BLACK = '#111827';

    // ── Header bar ────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 70).fill(PRIMARY);

    // Logo is optional — pdfkit only embeds JPEG/PNG, so a WEBP/SVG upload (or
    // any other decode failure) just falls back to the text-only header rather
    // than breaking quotation generation for the whole company.
    let headerTextX = 50;
    const logoPath = resolveUploadPath(company?.logoUrl);
    if (logoPath) {
      try {
        doc.image(logoPath, 50, 15, { fit: [40, 40] });
        headerTextX = 100;
      } catch {
        // Unsupported image format — keep the default text-only header.
      }
    }

    doc
      .fillColor('#FFFFFF')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(company?.name || 'Real Estate CRM', headerTextX, 22);

    doc
      .fontSize(9)
      .font('Helvetica')
      .text('PROPERTY QUOTATION', headerTextX, 48);

    // Quotation ID top-right
    doc
      .fontSize(9)
      .text(`Quotation #${quotation.id.slice(0, 8).toUpperCase()}`, 350, 35, {
        align: 'right',
        width: 200,
      });

    // ── Reset color ───────────────────────────────────────────────────────────
    doc.fillColor(BLACK);

    // ── Company info ──────────────────────────────────────────────────────────
    let y = 90;
    doc.fontSize(9).font('Helvetica').fillColor(GRAY_TEXT);
    if (company?.address) doc.text(company.address, 50, y);
    if (company?.phone) doc.text(`Tel: ${company.phone}`, 50, (y += 12));
    if (company?.email) doc.text(`Email: ${company.email}`, 50, (y += 12));

    // ── Dates block (right-aligned) ───────────────────────────────────────────
    const dateY = 90;
    doc.fillColor(GRAY_TEXT).fontSize(9);
    doc.text('Date Issued:', 370, dateY, { width: 80 });
    doc
      .fillColor(BLACK)
      .font('Helvetica-Bold')
      .text(
        new Date(quotation.createdAt).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
        }),
        455,
        dateY,
        { width: 90, align: 'right' }
      );

    if (quotation.validUntil) {
      doc.fillColor(GRAY_TEXT).font('Helvetica').fontSize(9);
      doc.text('Valid Until:', 370, dateY + 14, { width: 80 });
      doc
        .fillColor(BLACK)
        .font('Helvetica-Bold')
        .text(
          new Date(quotation.validUntil).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
          }),
          455,
          dateY + 14,
          { width: 90, align: 'right' }
        );
    }

    doc.fillColor(BLACK).font('Helvetica');

    // ── Divider ───────────────────────────────────────────────────────────────
    y = Math.max(y + 20, 140);
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#E5E7EB').lineWidth(1).stroke();
    y += 16;

    // ── Two-column: Customer + Unit ───────────────────────────────────────────
    const colLeft = 50;
    const colRight = 300;

    // Customer section
    doc.fillColor(PRIMARY).fontSize(10).font('Helvetica-Bold').text('PREPARED FOR', colLeft, y);
    y += 14;
    doc.fillColor(BLACK).fontSize(11).font('Helvetica-Bold').text(contact?.fullName || '—', colLeft, y);
    y += 14;
    doc.fillColor(GRAY_TEXT).fontSize(9).font('Helvetica');
    if (contact?.phone) doc.text(`Phone: ${contact.phone}`, colLeft, y);
    if (contact?.email) doc.text(`Email: ${contact.email}`, colLeft, (y += 12));

    // Unit section (right column, same y anchor)
    const unitY = y - 40;
    doc
      .fillColor(PRIMARY)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('PROPERTY DETAILS', colRight, unitY);
    let unitSubY = unitY + 14;
    doc
      .fillColor(BLACK)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`Unit ${unit?.unitNumber || '—'}`, colRight, unitSubY);
    unitSubY += 14;
    doc.fillColor(GRAY_TEXT).fontSize(9).font('Helvetica');
    doc.text(`Project: ${unit?.project?.name || '—'}`, colRight, unitSubY);
    unitSubY += 12;
    if (unit?.project?.location) {
      doc.text(`Location: ${unit.project.location}`, colRight, unitSubY);
      unitSubY += 12;
    }
    doc.text(`Prepared by: ${createdBy?.fullName || '—'}`, colRight, unitSubY);

    // ── Divider ───────────────────────────────────────────────────────────────
    y = Math.max(y + 30, unitSubY + 24);
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#E5E7EB').lineWidth(1).stroke();
    y += 16;

    // ── Pricing table ─────────────────────────────────────────────────────────
    doc.fillColor(PRIMARY).fontSize(10).font('Helvetica-Bold').text('PRICING BREAKDOWN', 50, y);
    y += 16;

    // Table header row
    doc.rect(50, y, 495, 24).fill('#F3F4F6');
    doc.fillColor(GRAY_TEXT).fontSize(9).font('Helvetica-Bold');
    doc.text('DESCRIPTION', 60, y + 7);
    doc.text('AMOUNT', 490, y + 7, { width: 50, align: 'right' });
    y += 24;

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(amount);
    };

    // Base price row
    doc.rect(50, y, 495, 28).fill(GRAY_LIGHT);
    doc.fillColor(BLACK).fontSize(10).font('Helvetica-Bold');
    doc.text('Base Unit Price', 60, y + 8);
    doc.text(formatCurrency(quotation.basePrice), 490, y + 8, { width: 50, align: 'right' });
    y += 28;

    // Additional charges rows
    if (charges && charges.length > 0) {
      charges.forEach((charge, idx) => {
        const rowBg = idx % 2 === 0 ? '#FFFFFF' : GRAY_LIGHT;
        doc.rect(50, y, 495, 26).fill(rowBg);
        doc.fillColor(BLACK).fontSize(9).font('Helvetica');
        doc.text(charge.label || '—', 60, y + 8);
        doc.text(formatCurrency(charge.amount), 490, y + 8, { width: 50, align: 'right' });
        y += 26;
      });
    }

    // Total row
    doc.rect(50, y, 495, 32).fill(PRIMARY);
    doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold');
    doc.text('TOTAL AMOUNT', 60, y + 9);
    doc.text(formatCurrency(quotation.totalAmount), 490, y + 9, { width: 50, align: 'right' });
    y += 32;

    // ── Decision badge ────────────────────────────────────────────────────────
    y += 20;
    const DECISION_COLORS = {
      PENDING: '#9CA3AF',
      NEGOTIATING: '#D97706',
      ACCEPTED: '#059669',
      REJECTED: '#DC2626',
    };
    const decisionColor = DECISION_COLORS[quotation.decision] || DECISION_COLORS.PENDING;
    doc.rect(50, y, 100, 22).fill(decisionColor);
    doc
      .fillColor('#FFFFFF')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(quotation.decision, 50, y + 6, { width: 100, align: 'center' });

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 50;
    doc.moveTo(50, footerY - 10).lineTo(545, footerY - 10).strokeColor('#E5E7EB').stroke();
    doc
      .fillColor(GRAY_TEXT)
      .fontSize(8)
      .font('Helvetica')
      .text(
        `This quotation is generated by ${company?.name || 'Real Estate CRM'}. Prices are subject to change. ` +
          (quotation.validUntil
            ? `This quotation is valid until ${new Date(quotation.validUntil).toLocaleDateString('en-IN')}.`
            : ''),
        50,
        footerY - 6,
        { width: 495, align: 'center' }
      );

    doc.end();
  });
};

module.exports = generateQuotationPdf;
