const PDFDocument = require('pdfkit');

/**
 * generateBookingReceiptPdf — builds a booking receipt PDF using pdfkit.
 * Follows the same pattern as generateQuotationPdf.js.
 *
 * @param {object} params
 * @param {object} params.booking   - Full booking row (id, finalAmount, discountAmount, bookingAmount, status, erpSalesOrderRef, createdAt)
 * @param {object} params.unit      - { unitNumber, price, project: { name, location } }
 * @param {object} params.contact   - { fullName, phone, email, address }
 * @param {object} params.inquiry   - { id }
 * @param {object} params.quotation - { id, totalAmount, basePrice }
 * @param {object[]} params.payments - Array of { amount, mode, paidAt, referenceNumber }
 * @param {object} params.company   - { name, email, phone, address }
 * @param {object} params.bookedBy  - { fullName }
 * @returns {Promise<Buffer>}
 */
const generateBookingReceiptPdf = ({
  booking,
  unit,
  contact,
  inquiry,
  quotation,
  payments = [],
  company,
  bookedBy,
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

    const formatCurrency = (amount) =>
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
        Number(amount) || 0
      );

    const formatDate = (d) =>
      new Date(d).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });

    // ── Header bar ────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 70).fill(PRIMARY);

    doc
      .fillColor('#FFFFFF')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(company?.name || 'Real Estate CRM', 50, 22);

    doc.fontSize(9).font('Helvetica').text('BOOKING CONFIRMATION RECEIPT', 50, 48);

    doc.fontSize(9).text(`Receipt #${booking.id.slice(0, 8).toUpperCase()}`, 350, 35, {
      align: 'right',
      width: 200,
    });

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
    doc.text('Booking Date:', 370, dateY, { width: 85 });
    doc
      .fillColor(BLACK)
      .font('Helvetica-Bold')
      .text(formatDate(booking.createdAt), 460, dateY, { width: 85, align: 'right' });

    if (booking.erpSalesOrderRef) {
      doc.fillColor(GRAY_TEXT).font('Helvetica').fontSize(9);
      doc.text('Sales Order:', 370, dateY + 14, { width: 85 });
      doc
        .fillColor(BLACK)
        .font('Helvetica-Bold')
        .text(booking.erpSalesOrderRef, 460, dateY + 14, { width: 85, align: 'right' });
    }

    doc.fillColor(BLACK).font('Helvetica');

    // ── Divider ───────────────────────────────────────────────────────────────
    y = Math.max(y + 20, 140);
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#E5E7EB').lineWidth(1).stroke();
    y += 16;

    // ── CONFIRMED badge ───────────────────────────────────────────────────────
    const badgeColor = booking.status === 'CONFIRMED' ? GREEN : '#DC2626';
    doc.rect(50, y, 90, 22).fill(badgeColor);
    doc
      .fillColor('#FFFFFF')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(booking.status, 50, y + 6, { width: 90, align: 'center' });
    y += 32;

    // ── Two-column: Customer + Unit ───────────────────────────────────────────
    const colLeft = 50;
    const colRight = 300;

    doc.fillColor(PRIMARY).fontSize(10).font('Helvetica-Bold').text('CUSTOMER DETAILS', colLeft, y);
    y += 14;
    doc.fillColor(BLACK).fontSize(11).font('Helvetica-Bold').text(contact?.fullName || '—', colLeft, y);
    y += 14;
    doc.fillColor(GRAY_TEXT).fontSize(9).font('Helvetica');
    if (contact?.phone) doc.text(`Phone: ${contact.phone}`, colLeft, y);
    if (contact?.email) doc.text(`Email: ${contact.email}`, colLeft, (y += 12));
    if (contact?.address) doc.text(`Address: ${contact.address}`, colLeft, (y += 12));

    const unitY = y - 40;
    doc.fillColor(PRIMARY).fontSize(10).font('Helvetica-Bold').text('PROPERTY DETAILS', colRight, unitY);
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
    doc.text(`Status: RESERVED`, colRight, unitSubY);
    unitSubY += 12;
    doc.text(`Booked by: ${bookedBy?.fullName || '—'}`, colRight, unitSubY);

    // ── Divider ───────────────────────────────────────────────────────────────
    y = Math.max(y + 28, unitSubY + 24);
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#E5E7EB').lineWidth(1).stroke();
    y += 16;

    // ── Booking Financials ────────────────────────────────────────────────────
    doc.fillColor(PRIMARY).fontSize(10).font('Helvetica-Bold').text('BOOKING SUMMARY', 50, y);
    y += 16;

    // Table header
    doc.rect(50, y, 495, 24).fill('#F3F4F6');
    doc.fillColor(GRAY_TEXT).fontSize(9).font('Helvetica-Bold');
    doc.text('DESCRIPTION', 60, y + 7);
    doc.text('AMOUNT', 490, y + 7, { width: 50, align: 'right' });
    y += 24;

    const rows = [
      { label: 'Quoted Amount', amount: quotation?.totalAmount },
      { label: 'Discount Applied', amount: `-${formatCurrency(booking.discountAmount)}`, raw: true },
      { label: 'Final Agreed Amount', amount: booking.finalAmount, bold: true },
      { label: 'Booking Amount (Token)', amount: booking.bookingAmount, bold: true },
    ];

    rows.forEach((row, idx) => {
      const bg = idx % 2 === 0 ? GRAY_LIGHT : '#FFFFFF';
      doc.rect(50, y, 495, 28).fill(bg);
      doc
        .fillColor(BLACK)
        .fontSize(row.bold ? 10 : 9)
        .font(row.bold ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(row.label, 60, y + 8);
      const amtStr = row.raw ? row.amount : formatCurrency(row.amount);
      doc.text(amtStr, 490, y + 8, { width: 50, align: 'right' });
      y += 28;
    });

    // Total paid row
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    doc.rect(50, y, 495, 32).fill(PRIMARY);
    doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold');
    doc.text('TOTAL PAYMENTS RECORDED', 60, y + 9);
    doc.text(formatCurrency(totalPaid), 490, y + 9, { width: 50, align: 'right' });
    y += 32;

    // ── Payments list ─────────────────────────────────────────────────────────
    if (payments.length > 0) {
      y += 20;
      doc.fillColor(PRIMARY).fontSize(10).font('Helvetica-Bold').text('PAYMENT HISTORY', 50, y);
      y += 14;

      doc.rect(50, y, 495, 22).fill('#F3F4F6');
      doc.fillColor(GRAY_TEXT).fontSize(8).font('Helvetica-Bold');
      doc.text('DATE', 60, y + 6);
      doc.text('MODE', 170, y + 6);
      doc.text('REF #', 280, y + 6);
      doc.text('AMOUNT', 490, y + 6, { width: 50, align: 'right' });
      y += 22;

      payments.forEach((p, idx) => {
        const bg = idx % 2 === 0 ? GRAY_LIGHT : '#FFFFFF';
        doc.rect(50, y, 495, 24).fill(bg);
        doc.fillColor(BLACK).fontSize(9).font('Helvetica');
        doc.text(formatDate(p.paidAt), 60, y + 6);
        doc.text(p.mode.replace('_', ' '), 170, y + 6);
        doc.text(p.referenceNumber || '—', 280, y + 6);
        doc.text(formatCurrency(p.amount), 490, y + 6, { width: 50, align: 'right' });
        y += 24;
      });
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 50;
    doc.moveTo(50, footerY - 10).lineTo(545, footerY - 10).strokeColor('#E5E7EB').stroke();
    doc
      .fillColor(GRAY_TEXT)
      .fontSize(8)
      .font('Helvetica')
      .text(
        'This is an official booking confirmation receipt. Please retain for your records. ' +
          'This document is system-generated and valid without a physical signature.',
        50,
        footerY - 6,
        { width: 495, align: 'center' }
      );

    doc.end();
  });
};

module.exports = generateBookingReceiptPdf;
