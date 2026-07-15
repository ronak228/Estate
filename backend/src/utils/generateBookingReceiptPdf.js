const PDFDocument = require('pdfkit');
const resolveUploadPath = require('./resolveUploadPath');

/**
 * generateBookingReceiptPdf — builds a booking receipt PDF using pdfkit,
 * styled as a formal printed ledger (centered letterhead, ruled tables, dual
 * signature lines) to match generateQuotationPdf.js and the quotation
 * on-screen preview.
 *
 * @param {object} params
 * @param {object} params.booking   - Full booking row (id, finalAmount, discountAmount, bookingAmount, status, erpSalesOrderRef, createdAt)
 * @param {object} params.unit      - { unitNumber, price, project: { name, location } }
 * @param {object} params.contact   - { fullName, phone, email, address }
 * @param {object} params.inquiry   - { id }
 * @param {object} params.quotation - { id, totalAmount, basePrice }
 * @param {object[]} params.payments - Array of { amount, mode, paidAt, referenceNumber }
 * @param {object} params.company   - { name, email, phone, address, logoUrl }
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

    const BLACK = '#111827';
    const GRAY_TEXT = '#6B7280';
    const GRAY_FAINT = '#9CA3AF';
    const RULE = '#111827';
    const RULE_LIGHT = '#E5E7EB';

    const STATUS_BADGE = {
      CONFIRMED: { bg: '#D1FAE5', text: '#047857' },
      CANCELLED: { bg: '#FEE2E2', text: '#DC2626' },
    };

    // pdfkit's standard 14 fonts (Helvetica) use WinAnsiEncoding, which has no
    // glyph for ₹ (U+20B9) — Intl's "currency" style silently maps it to the
    // wrong single-byte character (¹) instead. Format the grouping ourselves
    // and prefix "Rs." so it renders correctly without embedding a custom font.
    const formatCurrency = (amount) =>
      `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(amount) || 0)}`;

    const formatDate = (d) =>
      new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });

    const pageLeft = 50;
    const pageRight = 545;
    const contentWidth = pageRight - pageLeft;
    const companyName = company?.name || 'Real Estate CRM';

    // ── Centered letterhead ──────────────────────────────────────────────────
    let y = 50;

    const logoPath = resolveUploadPath(company?.logoUrl);
    if (logoPath) {
      try {
        doc.image(logoPath, doc.page.width / 2 - 20, y, { fit: [40, 40] });
        y += 48;
      } catch {
        // Unsupported image format — keep the text-only letterhead.
      }
    }

    doc
      .fillColor(BLACK)
      .fontSize(19)
      .font('Helvetica-Bold')
      .text(companyName.toUpperCase(), pageLeft, y, { width: contentWidth, align: 'center' });
    y += 24;

    const contactLine = [company?.address, company?.phone].filter(Boolean).join('   ·   ');
    if (contactLine) {
      doc
        .fillColor(GRAY_TEXT)
        .fontSize(9)
        .font('Helvetica')
        .text(contactLine, pageLeft, y, { width: contentWidth, align: 'center' });
      y += 16;
    }

    // "Booking Confirmation Receipt" pill badge, centered.
    y += 6;
    const badgeText = 'BOOKING CONFIRMATION RECEIPT';
    doc.fontSize(9).font('Helvetica-Bold');
    const badgeTextWidth = doc.widthOfString(badgeText);
    const badgeWidth = badgeTextWidth + 32;
    const badgeX = (doc.page.width - badgeWidth) / 2;
    doc.roundedRect(badgeX, y, badgeWidth, 22, 11).lineWidth(1).strokeColor(BLACK).stroke();
    doc.fillColor(BLACK).text(badgeText, badgeX, y + 6.5, { width: badgeWidth, align: 'center', characterSpacing: 0.6 });
    y += 34;

    // Double rule under the letterhead.
    doc.moveTo(pageLeft, y).lineTo(pageRight, y).lineWidth(1.5).strokeColor(RULE).stroke();
    doc.moveTo(pageLeft, y + 3).lineTo(pageRight, y + 3).lineWidth(0.75).strokeColor(RULE).stroke();
    y += 22;

    // ── Meta row: Receipt No. / Booking Date / Sales Order ────────────────────
    const colW = contentWidth / 3;
    doc.fillColor(GRAY_FAINT).fontSize(8).font('Helvetica-Bold').text('RECEIPT NO.', pageLeft, y, { width: colW, align: 'left' });
    doc.text('BOOKING DATE', pageLeft, y, { width: contentWidth, align: 'center' });
    doc.text('SALES ORDER', pageLeft + colW * 2, y, { width: colW, align: 'right' });
    y += 12;

    doc.fillColor(BLACK).fontSize(10).font('Helvetica-Bold').text(booking.id.slice(0, 8).toUpperCase(), pageLeft, y, { width: colW, align: 'left' });
    doc.text(formatDate(booking.createdAt), pageLeft, y, { width: contentWidth, align: 'center' });
    doc.text(booking.erpSalesOrderRef || '—', pageLeft + colW * 2, y, { width: colW, align: 'right' });
    y += 24;

    // ── Status badge ───────────────────────────────────────────────────────────
    doc.fillColor(GRAY_TEXT).fontSize(9).font('Helvetica').text('Status:', pageLeft, y + 5);
    const statusBadge = STATUS_BADGE[booking.status] || STATUS_BADGE.CONFIRMED;
    doc.fontSize(8).font('Helvetica-Bold');
    const statusText = booking.status || 'CONFIRMED';
    const statusTextWidth = doc.widthOfString(statusText);
    const statusBadgeWidth = statusTextWidth + 18;
    doc.roundedRect(pageLeft + 42, y, statusBadgeWidth, 18, 9).fill(statusBadge.bg);
    doc.fillColor(statusBadge.text).text(statusText, pageLeft + 42, y + 5, { width: statusBadgeWidth, align: 'center' });
    y += 32;

    // ── Customer / Property (ruled block) ─────────────────────────────────────
    doc.moveTo(pageLeft, y).lineTo(pageRight, y).lineWidth(0.75).strokeColor(RULE_LIGHT).stroke();
    y += 14;

    const colLeft = pageLeft;
    const colRight = pageLeft + contentWidth / 2 + 10;
    const colHalfWidth = contentWidth / 2 - 10;
    const sectionTop = y;

    doc.fillColor(GRAY_FAINT).fontSize(8).font('Helvetica-Bold').text('CUSTOMER', colLeft, y, { width: colHalfWidth });
    y += 13;
    doc.fillColor(BLACK).fontSize(11).font('Helvetica-Bold').text(contact?.fullName || '—', colLeft, y, { width: colHalfWidth });
    y += 15;
    doc
      .fillColor(GRAY_TEXT)
      .fontSize(9)
      .font('Helvetica')
      .text([contact?.phone, contact?.email].filter(Boolean).join('   ·   ') || '—', colLeft, y, { width: colHalfWidth });
    let leftColEnd = y + 12;
    if (contact?.address) {
      doc.text(contact.address, colLeft, leftColEnd, { width: colHalfWidth });
      leftColEnd += 12;
    }

    let ry = sectionTop;
    doc.fillColor(GRAY_FAINT).fontSize(8).font('Helvetica-Bold').text('PROPERTY', colRight, ry, { width: colHalfWidth });
    ry += 13;
    const propertyTitle = `Unit ${unit?.unitNumber || '—'}${unit?.project?.name ? `, ${unit.project.name}` : ''}`;
    doc.fillColor(BLACK).fontSize(11).font('Helvetica-Bold').text(propertyTitle, colRight, ry, { width: colHalfWidth });
    ry += 15;
    doc
      .fillColor(GRAY_TEXT)
      .fontSize(9)
      .font('Helvetica')
      .text(
        [unit?.project?.location, `Booked by ${bookedBy?.fullName || '—'}`].filter(Boolean).join('   ·   '),
        colRight,
        ry,
        { width: colHalfWidth }
      );
    const rightColEnd = ry + 12;

    y = Math.max(leftColEnd, rightColEnd) + 12;
    doc.moveTo(pageLeft, y).lineTo(pageRight, y).lineWidth(0.75).strokeColor(RULE_LIGHT).stroke();
    y += 20;

    // ── Booking summary (ruled table) ──────────────────────────────────────────
    const amountColX = 460;
    const amountColWidth = pageRight - amountColX;

    doc.fillColor(GRAY_FAINT).fontSize(8).font('Helvetica-Bold').text('BOOKING SUMMARY', pageLeft, y);
    doc.text('AMOUNT (RS.)', amountColX, y, { width: amountColWidth, align: 'right' });
    y += 10;
    doc.moveTo(pageLeft, y).lineTo(pageRight, y).lineWidth(1.5).strokeColor(RULE).stroke();
    y += 10;

    const drawRow = (label, amountStr, { bold = false, faint = false } = {}) => {
      doc
        .fillColor(bold ? BLACK : faint ? GRAY_TEXT : BLACK)
        .fontSize(bold ? 10 : 9.5)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, pageLeft, y, { width: amountColX - pageLeft - 10 });
      doc.text(amountStr, amountColX, y, { width: amountColWidth, align: 'right' });
      y += 12;
      doc.moveTo(pageLeft, y).lineTo(pageRight, y).lineWidth(0.5).strokeColor(RULE_LIGHT).stroke();
      y += 10;
    };

    drawRow('Quoted Amount', formatCurrency(quotation?.totalAmount), { faint: true });
    if (Number(booking.discountAmount) > 0) {
      drawRow('Discount Applied', `- ${formatCurrency(booking.discountAmount)}`, { faint: true });
    }
    drawRow('Final Agreed Amount', formatCurrency(booking.finalAmount), { bold: true });
    drawRow('Booking Amount (Token)', formatCurrency(booking.bookingAmount), { bold: true });

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    doc.moveTo(pageLeft, y - 10).lineTo(pageRight, y - 10).lineWidth(1.5).strokeColor(RULE).stroke();
    doc
      .fillColor(BLACK)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Total Payments Recorded', pageLeft, y, { width: amountColX - pageLeft - 10 });
    doc.text(formatCurrency(totalPaid), amountColX, y, { width: amountColWidth, align: 'right' });
    y += 30;

    // ── Payment history (ruled table) ──────────────────────────────────────────
    if (payments.length > 0) {
      const dateColX = pageLeft;
      const modeColX = pageLeft + 100;
      const refColX = pageLeft + 210;
      const payAmountColX = 460;

      doc.fillColor(GRAY_FAINT).fontSize(8).font('Helvetica-Bold');
      doc.text('DATE', dateColX, y);
      doc.text('MODE', modeColX, y);
      doc.text('REFERENCE', refColX, y);
      doc.text('AMOUNT (RS.)', payAmountColX, y, { width: pageRight - payAmountColX, align: 'right' });
      y += 10;
      doc.moveTo(pageLeft, y).lineTo(pageRight, y).lineWidth(1.5).strokeColor(RULE).stroke();
      y += 10;

      payments.forEach((p) => {
        doc.fillColor(BLACK).fontSize(9).font('Helvetica');
        doc.text(formatDate(p.paidAt), dateColX, y, { width: 95 });
        doc.text((p.mode || '—').replace('_', ' '), modeColX, y, { width: 105 });
        doc.text(p.referenceNumber || '—', refColX, y, { width: 195 });
        doc.text(formatCurrency(p.amount), payAmountColX, y, { width: pageRight - payAmountColX, align: 'right' });
        y += 12;
        doc.moveTo(pageLeft, y).lineTo(pageRight, y).lineWidth(0.5).strokeColor(RULE_LIGHT).stroke();
        y += 10;
      });
      y += 8;
    }

    // ── Signatures ─────────────────────────────────────────────────────────────
    const sigWidth = contentWidth * 0.4;
    const sigLeftX = pageLeft;
    const sigRightX = pageRight - sigWidth;
    const signaturePath = resolveUploadPath(company?.signatureUrl);

    // Reserve extra headroom above the line when there's an uploaded
    // signature to draw — otherwise it can collide with the content above.
    y += signaturePath ? 34 : 10;

    if (signaturePath) {
      try {
        const sigImgW = 90;
        const sigImgH = 28;
        doc.image(signaturePath, sigRightX + (sigWidth - sigImgW) / 2, y - sigImgH - 4, { fit: [sigImgW, sigImgH] });
      } catch {
        // Unsupported image format — line stays blank, same as no signature uploaded.
      }
    }

    doc.moveTo(sigLeftX, y).lineTo(sigLeftX + sigWidth, y).lineWidth(0.75).strokeColor(GRAY_FAINT).stroke();
    doc.moveTo(sigRightX, y).lineTo(sigRightX + sigWidth, y).lineWidth(0.75).strokeColor(GRAY_FAINT).stroke();
    y += 6;
    doc
      .fillColor(GRAY_TEXT)
      .fontSize(8)
      .font('Helvetica')
      .text('Customer Signature', sigLeftX, y, { width: sigWidth, align: 'center' });
    doc.text(`Authorized Signatory, ${companyName}`, sigRightX, y, { width: sigWidth, align: 'center' });

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 50;
    doc
      .fillColor(GRAY_FAINT)
      .fontSize(8)
      .font('Helvetica')
      .text(
        'This is an official booking confirmation receipt. Please retain for your records. ' +
          'This document is system-generated and valid without a physical signature.',
        pageLeft,
        footerY - 10,
        { width: contentWidth, align: 'center' }
      );

    doc.end();
  });
};

module.exports = generateBookingReceiptPdf;
