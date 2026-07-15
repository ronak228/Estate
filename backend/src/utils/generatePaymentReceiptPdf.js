const PDFDocument = require('pdfkit');
const resolveUploadPath = require('./resolveUploadPath');

/**
 * generatePaymentReceiptPdf — receipt for a single payment against a booking
 * (one row of the Payment History table), styled as the same formal printed
 * ledger as the Quotation and Booking receipts.
 *
 * @param {object} params
 * @param {object} params.payment  - { id, amount, mode, paidAt, referenceNumber, createdBy, isToken? }
 * @param {object} params.booking  - Full booking row (id, finalAmount, createdAt)
 * @param {object} params.financials - { totalAmount, totalPaid, remainingAmount } from getBookingFinancials
 * @param {object} params.unit     - { unitNumber, project: { name, location } }
 * @param {object} params.contact  - { fullName, phone, email }
 * @param {object} params.company  - { name, email, phone, address, logoUrl, signatureUrl }
 * @returns {Promise<Buffer>}
 */
const generatePaymentReceiptPdf = ({ payment, booking, financials, unit, contact, company }) => {
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
    const DANGER = '#DC2626';

    const formatCurrency = (amount) =>
      `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(amount) || 0)}`;

    const formatDate = (d) =>
      new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });

    const MODE_LABELS = {
      CASH: 'Cash', CHEQUE: 'Cheque', BANK_TRANSFER: 'Bank Transfer', UPI: 'UPI', CARD: 'Card', OTHER: 'Other',
    };

    const pageLeft = 50;
    const pageRight = 545;
    const contentWidth = pageRight - pageLeft;
    const companyName = company?.name || 'Real Estate CRM';

    let y = 50;

    // ── Centered letterhead ──────────────────────────────────────────────────
    const logoPath = resolveUploadPath(company?.logoUrl);
    if (logoPath) {
      try {
        doc.image(logoPath, doc.page.width / 2 - 20, y, { fit: [40, 40] });
        y += 48;
      } catch { /* unsupported format — text-only letterhead */ }
    }

    doc
      .fillColor(BLACK)
      .fontSize(19)
      .font('Helvetica-Bold')
      .text(companyName.toUpperCase(), pageLeft, y, { width: contentWidth, align: 'center' });
    y += 24;

    const contactLine = [company?.address, company?.phone].filter(Boolean).join('   ·   ');
    if (contactLine) {
      doc.fillColor(GRAY_TEXT).fontSize(9).font('Helvetica').text(contactLine, pageLeft, y, { width: contentWidth, align: 'center' });
      y += 16;
    }

    y += 6;
    const badgeText = 'PAYMENT RECEIPT';
    doc.fontSize(9).font('Helvetica-Bold');
    const badgeWidth = doc.widthOfString(badgeText) + 32;
    const badgeX = (doc.page.width - badgeWidth) / 2;
    doc.roundedRect(badgeX, y, badgeWidth, 22, 11).lineWidth(1).strokeColor(BLACK).stroke();
    doc.fillColor(BLACK).text(badgeText, badgeX, y + 6.5, { width: badgeWidth, align: 'center', characterSpacing: 0.6 });
    y += 34;

    doc.moveTo(pageLeft, y).lineTo(pageRight, y).lineWidth(1.5).strokeColor(RULE).stroke();
    doc.moveTo(pageLeft, y + 3).lineTo(pageRight, y + 3).lineWidth(0.75).strokeColor(RULE).stroke();
    y += 22;

    // ── Meta row: Receipt No. / Payment Date / Mode ───────────────────────────
    const colW = contentWidth / 3;
    const modeLabel = payment.isToken ? 'Token / Booking' : (MODE_LABELS[payment.mode] || payment.mode || '—');
    doc.fillColor(GRAY_FAINT).fontSize(8).font('Helvetica-Bold').text('RECEIPT NO.', pageLeft, y, { width: colW, align: 'left' });
    doc.text('PAYMENT DATE', pageLeft, y, { width: contentWidth, align: 'center' });
    doc.text('MODE', pageLeft + colW * 2, y, { width: colW, align: 'right' });
    y += 12;
    doc.fillColor(BLACK).fontSize(10).font('Helvetica-Bold').text(`PMT-${payment.id.slice(0, 8).toUpperCase()}`, pageLeft, y, { width: colW, align: 'left' });
    doc.text(formatDate(payment.paidAt), pageLeft, y, { width: contentWidth, align: 'center' });
    doc.text(modeLabel, pageLeft + colW * 2, y, { width: colW, align: 'right' });
    y += 26;

    // ── Received From / Against Booking ────────────────────────────────────────
    doc.moveTo(pageLeft, y).lineTo(pageRight, y).lineWidth(0.75).strokeColor(RULE_LIGHT).stroke();
    y += 14;

    const colLeft = pageLeft;
    const colRight = pageLeft + contentWidth / 2 + 10;
    const colHalfWidth = contentWidth / 2 - 10;
    const sectionTop = y;

    doc.fillColor(GRAY_FAINT).fontSize(8).font('Helvetica-Bold').text('RECEIVED FROM', colLeft, y, { width: colHalfWidth });
    y += 13;
    doc.fillColor(BLACK).fontSize(11).font('Helvetica-Bold').text(contact?.fullName || '—', colLeft, y, { width: colHalfWidth });
    y += 15;
    doc
      .fillColor(GRAY_TEXT)
      .fontSize(9)
      .font('Helvetica')
      .text(`Unit ${unit?.unitNumber || '—'}${unit?.project?.name ? `, ${unit.project.name}` : ''}`, colLeft, y, { width: colHalfWidth });
    const leftColEnd = y + 12;

    let ry = sectionTop;
    doc.fillColor(GRAY_FAINT).fontSize(8).font('Helvetica-Bold').text('AGAINST BOOKING', colRight, ry, { width: colHalfWidth });
    ry += 13;
    doc.fillColor(BLACK).fontSize(11).font('Helvetica-Bold').text(`BK-${booking.id.slice(0, 8).toUpperCase()}`, colRight, ry, { width: colHalfWidth });
    ry += 15;
    doc
      .fillColor(GRAY_TEXT)
      .fontSize(9)
      .font('Helvetica')
      .text(`Reference: ${payment.referenceNumber || '—'}`, colRight, ry, { width: colHalfWidth });
    const rightColEnd = ry + 12;

    y = Math.max(leftColEnd, rightColEnd) + 12;
    doc.moveTo(pageLeft, y).lineTo(pageRight, y).lineWidth(0.75).strokeColor(RULE_LIGHT).stroke();
    y += 20;

    // ── Amount received box ──────────────────────────────────────────────────
    doc.roundedRect(pageLeft, y, contentWidth, 58, 8).lineWidth(1.5).strokeColor(RULE).stroke();
    doc
      .fillColor(GRAY_FAINT)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('AMOUNT RECEIVED', pageLeft, y + 14, { width: contentWidth, align: 'center', characterSpacing: 0.6 });
    doc
      .fillColor(BLACK)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(formatCurrency(payment.amount), pageLeft, y + 28, { width: contentWidth, align: 'center' });
    y += 74;

    // ── Balance table ─────────────────────────────────────────────────────────
    const rowLabel = (label, amountStr, { bold = false, color = BLACK } = {}) => {
      doc
        .fillColor(bold ? BLACK : GRAY_TEXT)
        .fontSize(bold ? 10 : 9.5)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, pageLeft, y, { width: contentWidth - 150 });
      doc.fillColor(color).text(amountStr, pageLeft + contentWidth - 150, y, { width: 150, align: 'right' });
      y += 12;
      doc.moveTo(pageLeft, y).lineTo(pageRight, y).lineWidth(0.5).strokeColor(RULE_LIGHT).stroke();
      y += 10;
    };

    rowLabel('Total Booking Value', formatCurrency(financials.totalAmount));
    rowLabel('Total Paid to Date', formatCurrency(financials.totalPaid), { color: '#047857' });

    doc.moveTo(pageLeft, y - 10).lineTo(pageRight, y - 10).lineWidth(1.5).strokeColor(RULE).stroke();
    doc
      .fillColor(BLACK)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Balance Remaining', pageLeft, y, { width: contentWidth - 150 });
    doc
      .fillColor(financials.remainingAmount > 0 ? DANGER : '#047857')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(financials.remainingAmount > 0 ? formatCurrency(financials.remainingAmount) : 'Fully Paid', pageLeft + contentWidth - 150, y, { width: 150, align: 'right' });
    y += 26;

    // ── Signatures ─────────────────────────────────────────────────────────────
    const sigWidth = contentWidth * 0.4;
    const sigLeftX = pageLeft;
    const sigRightX = pageRight - sigWidth;
    const signaturePath = resolveUploadPath(company?.signatureUrl);

    y += signaturePath ? 34 : 10;

    if (signaturePath) {
      try {
        const sigImgW = 90;
        const sigImgH = 28;
        doc.image(signaturePath, sigRightX + (sigWidth - sigImgW) / 2, y - sigImgH - 4, { fit: [sigImgW, sigImgH] });
      } catch { /* unsupported format — line stays blank */ }
    }

    doc.moveTo(sigLeftX, y).lineTo(sigLeftX + sigWidth, y).lineWidth(0.75).strokeColor(GRAY_FAINT).stroke();
    doc.moveTo(sigRightX, y).lineTo(sigRightX + sigWidth, y).lineWidth(0.75).strokeColor(GRAY_FAINT).stroke();
    y += 6;
    doc.fillColor(GRAY_TEXT).fontSize(8).font('Helvetica').text('Customer Signature', sigLeftX, y, { width: sigWidth, align: 'center' });
    doc.text(`Received By — ${payment.createdBy?.fullName || '—'}`, sigRightX, y, { width: sigWidth, align: 'center' });

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 50;
    doc
      .fillColor(GRAY_FAINT)
      .fontSize(8)
      .font('Helvetica')
      .text(
        'This is a system-generated receipt for the payment recorded above and is valid without a physical signature.',
        pageLeft,
        footerY - 10,
        { width: contentWidth, align: 'center' }
      );

    doc.end();
  });
};

module.exports = generatePaymentReceiptPdf;
