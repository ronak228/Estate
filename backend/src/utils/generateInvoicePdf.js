const PDFDocument = require('pdfkit');

/**
 * generateInvoicePdf — builds a CRM invoice PDF using pdfkit.
 * Follows the same pattern as generateQuotationPdf.js and generateBookingReceiptPdf.js.
 *
 * INTENTIONAL EXCEPTION: The endpoint that serves this PDF returns binary content —
 * not the standard { success, message, data } envelope. Do not "fix" this.
 *
 * @param {object} params
 * @param {object} params.invoice   - { id, invoiceNumber, amount, status, issuedAt, dueDate, notes, createdAt }
 * @param {object} params.booking   - { id, finalAmount, discountAmount }
 * @param {object} params.contact   - { fullName, phone, email, address }
 * @param {object} params.unit      - { unitNumber, project: { name, location } }
 * @param {object} params.company   - { name, email, phone, address }
 * @param {object} params.payments  - Array of reconciled TransactionPayment records
 * @returns {Promise<Buffer>}
 */
const generateInvoicePdf = ({
  invoice,
  booking,
  contact,
  unit,
  company,
  payments = [],
}) => {
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
    const GREEN = '#059669';
    const AMBER = '#D97706';

    const formatCurrency = (amount) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
        Number(amount) || 0
      );

    const formatDate = (d) => {
      if (!d) return '—';
      return new Date(d).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
    };

    // ── Header bar ──────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 70).fill(PRIMARY);

    doc
      .fillColor('#FFFFFF')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(company?.name || 'Real Estate CRM', 50, 22);

    doc.fontSize(9).font('Helvetica').text('TAX INVOICE', 50, 48);

    doc.fontSize(9).text(`Invoice #${invoice.invoiceNumber}`, 350, 35, {
      align: 'right',
      width: 200,
    });

    doc.fillColor(BLACK);

    // ── Company info ─────────────────────────────────────────────────────────
    let y = 90;
    doc.fontSize(9).font('Helvetica').fillColor(GRAY_TEXT);
    if (company?.address) doc.text(company.address, 50, y);
    if (company?.phone) doc.text(`Tel: ${company.phone}`, 50, (y += 12));
    if (company?.email) doc.text(`Email: ${company.email}`, 50, (y += 12));

    // ── Dates block (right-aligned) ──────────────────────────────────────────
    const dateY = 90;
    doc.fillColor(GRAY_TEXT).fontSize(9);
    doc.text('Date Issued:', 370, dateY, { width: 85 });
    doc
      .fillColor(BLACK)
      .font('Helvetica-Bold')
      .text(formatDate(invoice.issuedAt || invoice.createdAt), 460, dateY, { width: 85, align: 'right' });

    if (invoice.dueDate) {
      doc.fillColor(GRAY_TEXT).font('Helvetica').fontSize(9);
      doc.text('Due Date:', 370, dateY + 14, { width: 85 });
      doc
        .fillColor(BLACK)
        .font('Helvetica-Bold')
        .text(formatDate(invoice.dueDate), 460, dateY + 14, { width: 85, align: 'right' });
    }

    doc.fillColor(BLACK).font('Helvetica');

    // ── Divider ──────────────────────────────────────────────────────────────
    y = Math.max(y + 20, 140);
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#E5E7EB').lineWidth(1).stroke();
    y += 16;

    // ── Status badge ─────────────────────────────────────────────────────────
    const STATUS_COLORS_MAP = {
      DRAFT: '#9CA3AF',
      ISSUED: PRIMARY,
      PARTIALLY_PAID: AMBER,
      PAID: GREEN,
      OVERDUE: '#DC2626',
    };
    const badgeColor = STATUS_COLORS_MAP[invoice.status] || '#9CA3AF';
    doc.rect(50, y, 100, 22).fill(badgeColor);
    doc
      .fillColor('#FFFFFF')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(invoice.status.replace('_', ' '), 50, y + 6, { width: 100, align: 'center' });
    y += 36;

    // ── Two-column: Customer + Property ──────────────────────────────────────
    const colLeft = 50;
    const colRight = 300;

    doc.fillColor(PRIMARY).fontSize(10).font('Helvetica-Bold').text('BILL TO', colLeft, y);
    y += 14;
    doc.fillColor(BLACK).fontSize(11).font('Helvetica-Bold').text(contact?.fullName || '—', colLeft, y);
    y += 14;
    doc.fillColor(GRAY_TEXT).fontSize(9).font('Helvetica');
    if (contact?.phone) doc.text(`Phone: ${contact.phone}`, colLeft, y);
    if (contact?.email) doc.text(`Email: ${contact.email}`, colLeft, (y += 12));
    if (contact?.address) doc.text(`Address: ${contact.address}`, colLeft, (y += 12));

    const propY = y - 40;
    doc.fillColor(PRIMARY).fontSize(10).font('Helvetica-Bold').text('PROPERTY', colRight, propY);
    let propSubY = propY + 14;
    doc
      .fillColor(BLACK)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`Unit ${unit?.unitNumber || '—'}`, colRight, propSubY);
    propSubY += 14;
    doc.fillColor(GRAY_TEXT).fontSize(9).font('Helvetica');
    doc.text(`Project: ${unit?.project?.name || '—'}`, colRight, propSubY);
    propSubY += 12;
    if (unit?.project?.location) {
      doc.text(`Location: ${unit.project.location}`, colRight, propSubY);
      propSubY += 12;
    }
    doc.text(`Booking ID: ${booking?.id?.slice(0, 8).toUpperCase() || '—'}`, colRight, propSubY);

    // ── Divider ──────────────────────────────────────────────────────────────
    y = Math.max(y + 28, propSubY + 24);
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#E5E7EB').lineWidth(1).stroke();
    y += 16;

    // ── Invoice amount table ──────────────────────────────────────────────────
    doc.fillColor(PRIMARY).fontSize(10).font('Helvetica-Bold').text('INVOICE DETAILS', 50, y);
    y += 16;

    // Table header
    doc.rect(50, y, 495, 24).fill('#F3F4F6');
    doc.fillColor(GRAY_TEXT).fontSize(9).font('Helvetica-Bold');
    doc.text('DESCRIPTION', 60, y + 7);
    doc.text('AMOUNT', 490, y + 7, { width: 50, align: 'right' });
    y += 24;

    // Invoice amount row
    doc.rect(50, y, 495, 28).fill(GRAY_LIGHT);
    doc.fillColor(BLACK).fontSize(10).font('Helvetica-Bold');
    doc.text('Property Sale — Installment / Milestone', 60, y + 8);
    doc.text(formatCurrency(invoice.amount), 490, y + 8, { width: 50, align: 'right' });
    y += 28;

    // Total row
    doc.rect(50, y, 495, 32).fill(PRIMARY);
    doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold');
    doc.text('INVOICE TOTAL', 60, y + 9);
    doc.text(formatCurrency(invoice.amount), 490, y + 9, { width: 50, align: 'right' });
    y += 32;

    // ── Notes ────────────────────────────────────────────────────────────────
    if (invoice.notes) {
      y += 20;
      doc.fillColor(GRAY_TEXT).fontSize(9).font('Helvetica').text('Notes:', 50, y);
      y += 12;
      doc.fillColor(BLACK).fontSize(9).text(invoice.notes, 50, y, { width: 495 });
      y += 20;
    }

    // ── Reconciled payments (if any) ─────────────────────────────────────────
    if (payments.length > 0) {
      y += 16;
      doc.fillColor(PRIMARY).fontSize(10).font('Helvetica-Bold').text('PAYMENTS RECONCILED TO THIS INVOICE', 50, y);
      y += 16;

      doc.rect(50, y, 495, 22).fill('#F3F4F6');
      doc.fillColor(GRAY_TEXT).fontSize(8).font('Helvetica-Bold');
      doc.text('DATE', 60, y + 6);
      doc.text('MODE', 170, y + 6);
      doc.text('REF #', 280, y + 6);
      doc.text('AMOUNT', 490, y + 6, { width: 50, align: 'right' });
      y += 22;

      let totalPaid = 0;
      payments.forEach((p, idx) => {
        const bg = idx % 2 === 0 ? GRAY_LIGHT : '#FFFFFF';
        doc.rect(50, y, 495, 24).fill(bg);
        doc.fillColor(BLACK).fontSize(9).font('Helvetica');
        doc.text(formatDate(p.paidAt), 60, y + 6);
        doc.text(p.mode.replace('_', ' '), 170, y + 6);
        doc.text(p.referenceNumber || '—', 280, y + 6);
        doc.text(formatCurrency(p.amount), 490, y + 6, { width: 50, align: 'right' });
        totalPaid += Number(p.amount);
        y += 24;
      });

      // Total paid summary
      doc.rect(50, y, 495, 28).fill(badgeColor);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
      doc.text('TOTAL PAID AGAINST THIS INVOICE', 60, y + 8);
      doc.text(formatCurrency(totalPaid), 490, y + 8, { width: 50, align: 'right' });
      y += 28;
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 50;
    doc.moveTo(50, footerY - 10).lineTo(545, footerY - 10).strokeColor('#E5E7EB').stroke();
    doc
      .fillColor(GRAY_TEXT)
      .fontSize(8)
      .font('Helvetica')
      .text(
        'This is a system-generated invoice from the Real Estate CRM. For queries, contact your property advisor.',
        50,
        footerY - 6,
        { width: 495, align: 'center' }
      );

    doc.end();
  });
};

module.exports = generateInvoicePdf;
