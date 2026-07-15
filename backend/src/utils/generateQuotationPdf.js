const PDFDocument = require('pdfkit');
const resolveUploadPath = require('./resolveUploadPath');
const formatPdfCurrency = require('./formatPdfCurrency');

/**
 * generateQuotationPdf — builds a PDF quotation document using pdfkit,
 * styled as a formal printed ledger (centered letterhead, ruled pricing
 * table, dual signature lines) to match the on-screen preview in
 * frontend/src/components/shared/QuotationPreview.jsx.
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

    const BLACK = '#111827';
    const GRAY_TEXT = '#6B7280';
    const GRAY_FAINT = '#9CA3AF';
    const RULE = '#111827';
    const RULE_LIGHT = '#E5E7EB';
    const WARNING = '#B45309';

    const DECISION_BADGE = {
      PENDING: { bg: '#F3F4F6', text: '#4B5563' },
      NEGOTIATING: { bg: '#FEF3C7', text: '#B45309' },
      ACCEPTED: { bg: '#D1FAE5', text: '#047857' },
      REJECTED: { bg: '#FEE2E2', text: '#DC2626' },
    };

    const formatCurrency = (amount) => formatPdfCurrency(amount, company?.currency);

    const formatDate = (d) =>
      new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });

    const pageLeft = 50;
    const pageRight = 545;
    const contentWidth = pageRight - pageLeft;
    const companyName = company?.name || 'Real Estate CRM';

    // ── Centered letterhead ──────────────────────────────────────────────────
    let y = 50;

    // Optional logo, centered above the company name.
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

    // "Property Quotation" pill badge, centered.
    y += 6;
    const badgeText = 'PROPERTY QUOTATION';
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

    // ── Meta row: Quotation No. / Date Issued / Valid Until ──────────────────
    const colW = contentWidth / 3;
    doc.fillColor(GRAY_FAINT).fontSize(8).font('Helvetica-Bold').text('QUOTATION NO.', pageLeft, y, { width: colW, align: 'left' });
    doc.text('DATE ISSUED', pageLeft, y, { width: contentWidth, align: 'center' });
    doc.text('VALID UNTIL', pageLeft + colW * 2, y, { width: colW, align: 'right' });
    y += 12;

    doc.fillColor(BLACK).fontSize(10).font('Helvetica-Bold').text(quotation.id.slice(0, 8).toUpperCase(), pageLeft, y, { width: colW, align: 'left' });
    doc.text(formatDate(quotation.createdAt), pageLeft, y, { width: contentWidth, align: 'center' });
    doc
      .fillColor(quotation.validUntil ? WARNING : BLACK)
      .text(quotation.validUntil ? formatDate(quotation.validUntil) : '—', pageLeft + colW * 2, y, { width: colW, align: 'right' });
    y += 26;

    // ── Prepared For / Property (ruled block) ─────────────────────────────────
    doc.moveTo(pageLeft, y).lineTo(pageRight, y).lineWidth(0.75).strokeColor(RULE_LIGHT).stroke();
    y += 14;

    const colLeft = pageLeft;
    const colRight = pageLeft + contentWidth / 2 + 10;
    const colHalfWidth = contentWidth / 2 - 10;
    const sectionTop = y;

    doc.fillColor(GRAY_FAINT).fontSize(8).font('Helvetica-Bold').text('PREPARED FOR', colLeft, y, { width: colHalfWidth });
    y += 13;
    doc.fillColor(BLACK).fontSize(11).font('Helvetica-Bold').text(contact?.fullName || '—', colLeft, y, { width: colHalfWidth });
    y += 15;
    doc
      .fillColor(GRAY_TEXT)
      .fontSize(9)
      .font('Helvetica')
      .text([contact?.phone, contact?.email].filter(Boolean).join('   ·   ') || '—', colLeft, y, { width: colHalfWidth });
    const leftColEnd = y + 12;

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
        [unit?.project?.location, `Prepared by ${createdBy?.fullName || '—'}`].filter(Boolean).join('   ·   '),
        colRight,
        ry,
        { width: colHalfWidth }
      );
    const rightColEnd = ry + 12;

    y = Math.max(leftColEnd, rightColEnd) + 12;
    doc.moveTo(pageLeft, y).lineTo(pageRight, y).lineWidth(0.75).strokeColor(RULE_LIGHT).stroke();
    y += 20;

    // ── Ruled pricing table ────────────────────────────────────────────────────
    const amountColX = 460;
    const amountColWidth = pageRight - amountColX;

    doc.fillColor(GRAY_FAINT).fontSize(8).font('Helvetica-Bold').text('DESCRIPTION', pageLeft, y);
    doc.text(`AMOUNT (${company?.currency || 'INR'})`, amountColX, y, { width: amountColWidth, align: 'right' });
    y += 10;
    doc.moveTo(pageLeft, y).lineTo(pageRight, y).lineWidth(1.5).strokeColor(RULE).stroke();
    y += 10;

    const drawRow = (label, amount, { bold = false, faint = false } = {}) => {
      doc
        .fillColor(bold ? BLACK : faint ? GRAY_TEXT : BLACK)
        .fontSize(bold ? 10 : 9.5)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, pageLeft, y, { width: amountColX - pageLeft - 10 });
      doc.text(formatCurrency(amount), amountColX, y, { width: amountColWidth, align: 'right' });
      y += 12;
      doc.moveTo(pageLeft, y).lineTo(pageRight, y).lineWidth(0.5).strokeColor(RULE_LIGHT).stroke();
      y += 10;
    };

    drawRow('Base Unit Price', quotation.basePrice, { bold: true });
    (charges || []).forEach((charge) => drawRow(charge.label || '—', charge.amount, { faint: true }));

    doc.moveTo(pageLeft, y - 10).lineTo(pageRight, y - 10).lineWidth(1.5).strokeColor(RULE).stroke();
    doc
      .fillColor(BLACK)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Total Amount', pageLeft, y, { width: amountColX - pageLeft - 10 });
    doc.text(formatCurrency(quotation.totalAmount), amountColX, y, { width: amountColWidth, align: 'right' });
    y += 26;

    // ── Decision badge ────────────────────────────────────────────────────────
    doc.fillColor(GRAY_TEXT).fontSize(9).font('Helvetica').text('Decision:', pageLeft, y + 5);
    const decisionBadge = DECISION_BADGE[quotation.decision] || DECISION_BADGE.PENDING;
    doc.fontSize(8).font('Helvetica-Bold');
    const decisionText = quotation.decision || 'PENDING';
    const decisionTextWidth = doc.widthOfString(decisionText);
    const decisionBadgeWidth = decisionTextWidth + 18;
    doc.roundedRect(pageLeft + 52, y, decisionBadgeWidth, 18, 9).fill(decisionBadge.bg);
    doc.fillColor(decisionBadge.text).text(decisionText, pageLeft + 52, y + 5, { width: decisionBadgeWidth, align: 'center' });
    y += 44;

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
        'This quotation is a snapshot generated at creation time and reflects unit pricing as of the issue date above.',
        pageLeft,
        footerY - 10,
        { width: contentWidth, align: 'center' }
      );

    doc.end();
  });
};

module.exports = generateQuotationPdf;
