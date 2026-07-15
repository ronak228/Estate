import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Plus, BookOpen, CheckCircle2, User, PhoneCall } from 'lucide-react';
import quotationService from '../../services/quotationService';
import bookingService from '../../services/bookingService';
import companyService from '../../services/companyService';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import StatusBadge, { StatusDot } from '../../components/shared/StatusBadge';
import LoadingState from '../../components/shared/LoadingState';
import ErrorState from '../../components/shared/ErrorState';
import Modal from '../../components/shared/Modal';
import QuotationPreview from '../../components/shared/QuotationPreview';
import Card from '../../components/shared/Card';
import FormError from '../../components/shared/FormError';
import { RecordList, RecordRow, RecordEmpty } from '../../components/shared/RecordList';
import CopyIdChip from '../../components/shared/CopyIdChip';
import QuotationForm from './QuotationForm';
import BookingForm from '../Booking/BookingForm';
import { useAuth } from '../../context/AuthContext';
import { showSuccess, showError, getErrorMessage } from '../../lib/toast';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';

const DECISION_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'NEGOTIATING', label: 'Negotiating' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
];

const QuotationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const isManager = ['ADMIN', 'MANAGER'].includes(currentUser?.role);

  const [quotation, setQuotation] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [decisionChanging, setDecisionChanging] = useState(false);
  const [decisionChangeError, setDecisionChangeError] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadPdfError, setDownloadPdfError] = useState('');
  const [requoteOpen, setRequoteOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  // Booking.inquiryId is unique — an inquiry has at most one booking, and its
  // stage flips to BOOKED the moment one is created (reverts on cancel).
  const [existingBookingId, setExistingBookingId] = useState(null);

  const fetchQuotation = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await quotationService.getQuotation(id);
      setQuotation(data);
      setExistingBookingId(null);

      if (data.inquiry?.stage === 'BOOKED' && data.inquiryId) {
        try {
          const bookings = await bookingService.listBookings({ inquiryId: data.inquiryId, page: 1, pageSize: 1 });
          setExistingBookingId(bookings.items?.[0]?.id || null);
        } catch { /* non-blocking */ }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load quotation');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuotation();
  }, [fetchQuotation]);

  // Letterhead branding for the quotation document — falls back to the
  // generic placeholder inside QuotationPreview if this fails to load.
  useEffect(() => {
    companyService.getMyCompany().then(setCompany).catch(() => {});
  }, []);

  const handleDecisionChange = async (e) => {
    const decision = e.target.value;
    if (!decision || decision === quotation.decision) return;
    setDecisionChanging(true);
    setDecisionChangeError('');
    try {
      const updated = await quotationService.updateDecision(id, decision);
      setQuotation((prev) => ({ ...prev, decision: updated.decision }));
      showSuccess('Decision updated');
    } catch (err) {
      setDecisionChangeError(getErrorMessage(err, 'Failed to update decision'));
    } finally {
      setDecisionChanging(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    setDownloadPdfError('');
    try {
      const blob = await quotationService.getQuotationPdfBlob(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quotation-${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadPdfError('Failed to download PDF');
      showError('Failed to download PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) return <PageLayout><LoadingState label="Loading quotation..." /></PageLayout>;
  if (error) return <PageLayout><ErrorState message={error} onRetry={fetchQuotation} /></PageLayout>;
  if (!quotation) return null;

  const { charges = [], unit, inquiry, createdBy } = quotation;
  const contact = inquiry?.contact;
  const isBooked = inquiry?.stage === 'BOOKED';
  const chargesTotal = charges.reduce((sum, c) => sum + Number(c.amount), 0);
  const daysUntilValid = quotation.validUntil
    ? Math.ceil((new Date(quotation.validUntil) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <PageLayout>
      <PageHeader
        title={`Quotation — ${contact?.fullName || '—'}`}
        subtitle={`Unit ${unit?.unitNumber || '—'} · ${unit?.project?.name || '—'} · Created ${formatDateTime(quotation.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/quotations')}>
              Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              loading={downloadingPdf}
              onClick={handleDownloadPdf}
            >
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => setRequoteOpen(true)}
            >
              Re-quote
            </Button>
            {isBooked ? (
              <Button
                variant="successOutline"
                size="sm"
                icon={CheckCircle2}
                onClick={() => existingBookingId && navigate(`/bookings/${existingBookingId}`)}
              >
                Booked
              </Button>
            ) : (
              isManager && quotation.decision === 'ACCEPTED' && (
                <Button
                  size="sm"
                  icon={BookOpen}
                  onClick={() => setBookingOpen(true)}
                >
                  Create Booking
                </Button>
              )
            )}
          </div>
        }
      />

      <FormError message={downloadPdfError} className="mb-4" />

      {/* At-a-glance stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Total Amount</p>
          <p className="text-lg font-bold text-primary mt-1.5 tabular-nums">{formatCurrency(quotation.totalAmount)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Base + {charges.length} charge{charges.length === 1 ? '' : 's'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Base Unit Price</p>
          <p className="text-lg font-bold text-gray-900 mt-1.5 tabular-nums">{formatCurrency(quotation.basePrice)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Locked at issue date</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Decision</p>
          <div className="mt-1.5"><StatusBadge value={quotation.decision} /></div>
          <p className="text-[11px] text-gray-400 mt-1.5">Updated {formatDate(quotation.updatedAt || quotation.createdAt)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Valid Until</p>
          <p className="text-lg font-bold text-gray-900 mt-1.5">{quotation.validUntil ? formatDate(quotation.validUntil) : '—'}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {daysUntilValid == null ? 'No expiry set' : daysUntilValid >= 0 ? `${daysUntilValid} day${daysUntilValid === 1 ? '' : 's'} remaining` : 'Expired'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left — Quotation Preview */}
        <div className="lg:col-span-2">
          <QuotationPreview quotation={quotation} company={company} />
        </div>

        {/* Right — Controls + Summary — sticky rail so it stays visible while the preview scrolls */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">

          {/* Decision control */}
          <Card title="Customer Decision">
            <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5 mb-3">
              <StatusDot value={quotation.decision} />
              <div>
                <p className="text-[10.5px] text-gray-400 leading-none">Current stage</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">
                  {DECISION_OPTIONS.find((o) => o.value === quotation.decision)?.label || quotation.decision}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Update:</span>
              <select
                value={quotation.decision}
                onChange={handleDecisionChange}
                disabled={decisionChanging}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white transition-colors duration-150 ease-snappy hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              >
                {DECISION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {decisionChanging && (
                <span className="text-xs text-gray-400 animate-pulse">Saving...</span>
              )}
              {decisionChangeError && (
                <span className="text-xs text-red-600">{decisionChangeError}</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3 leading-relaxed">
              {isBooked
                ? 'This quotation has already been converted into a booking.'
                : quotation.decision === 'ACCEPTED'
                ? "The customer has accepted this quotation — you can now convert it into a booking below."
                : 'Mark this Accepted once the customer confirms, to unlock converting it into a booking. Need different pricing? Use Re-quote instead — it creates a fresh quotation and keeps this one\'s history intact.'}
            </p>
            {isBooked ? (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Button
                  variant="successOutline"
                  size="sm"
                  icon={CheckCircle2}
                  onClick={() => existingBookingId && navigate(`/bookings/${existingBookingId}`)}
                  className="w-full justify-center"
                >
                  Booked — View Booking
                </Button>
              </div>
            ) : (
              isManager && quotation.decision === 'ACCEPTED' && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={BookOpen}
                    onClick={() => setBookingOpen(true)}
                    className="w-full justify-center"
                  >
                    Convert to Booking
                  </Button>
                </div>
              )
            )}
          </Card>

          {/* Linked records */}
          <RecordList title="Linked Records">
            {contact && (
              <RecordRow to={`/contacts/${contact.id}`} icon={User} primary={`View contact — ${contact.fullName}`} />
            )}
            {inquiry && (
              <RecordRow to={`/inquiries/${inquiry.id}`} icon={PhoneCall} primary="View inquiry" />
            )}
            {isBooked && existingBookingId && (
              <RecordRow to={`/bookings/${existingBookingId}`} icon={BookOpen} primary="View booking" />
            )}
            {!contact && !inquiry && <RecordEmpty />}
          </RecordList>

          {/* Quick summary — fields not already covered by the stat strip above */}
          <Card title="Summary">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Unit</dt>
                <dd className="font-medium text-gray-900">Unit {unit?.unitNumber || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Project</dt>
                <dd className="font-medium text-gray-900">{unit?.project?.name || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Charges ({charges.length})</dt>
                <dd className="font-medium text-gray-900">
                  {formatCurrency(chargesTotal)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3">
                <dt className="text-gray-500">Created By</dt>
                <dd className="font-medium text-gray-900">{createdBy?.fullName || '—'}</dd>
              </div>
            </dl>
          </Card>

          {/* Quotation ID */}
          <CopyIdChip label="Quotation ID" value={quotation.id} />
        </div>
      </div>

      {/* Re-quote Modal — creates a NEW quotation row, never edits this one */}
      <Modal
        isOpen={requoteOpen}
        onClose={() => setRequoteOpen(false)}
        title="Create New Quotation (Re-quote)"
        size="xl"
      >
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 text-sm text-amber-700">
          This will create a new quotation. The existing quotation history is preserved and
          will not be changed.
        </div>
        <QuotationForm
          defaultInquiryId={quotation.inquiryId}
          onSuccess={() => {
            setRequoteOpen(false);
            navigate('/quotations');
          }}
          onCancel={() => setRequoteOpen(false)}
        />
      </Modal>

      {/* Create Booking Modal */}
      {bookingOpen && (
        <Modal
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
          title="Create Booking"
          size="lg"
        >
          <BookingForm
            inquiry={quotation.inquiry}
            quotation={quotation}
            onSuccess={(booking) => {
              setBookingOpen(false);
              navigate('/bookings');
            }}
            onCancel={() => setBookingOpen(false)}
          />
        </Modal>
      )}
    </PageLayout>
  );
};

export default QuotationDetailPage;
