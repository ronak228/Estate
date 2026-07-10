import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, Plus, BookOpen } from 'lucide-react';
import quotationService from '../../services/quotationService';
import bookingService from '../../services/bookingService';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import StatusBadge from '../../components/shared/StatusBadge';
import LoadingState from '../../components/shared/LoadingState';
import ErrorState from '../../components/shared/ErrorState';
import Modal from '../../components/shared/Modal';
import Select from '../../components/shared/Select';
import QuotationPreview from '../../components/shared/QuotationPreview';
import Card from '../../components/shared/Card';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [decisionChanging, setDecisionChanging] = useState(false);
  const [decisionChangeError, setDecisionChangeError] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadPdfError, setDownloadPdfError] = useState('');
  const [requoteOpen, setRequoteOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  // Check if a booking already exists for this inquiry
  const [existingBookingId, setExistingBookingId] = useState(null);

  const fetchQuotation = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await quotationService.getQuotation(id);
      setQuotation(data);

      // Check if a booking already exists for this inquiry
      if (data.inquiryId) {
        try {
          const bookings = await bookingService.listBookings({ page: 1, pageSize: 1 });
          // We just need to know if *this inquiry* has a booking — we check via listBookings
          // The backend doesn't expose a direct "by inquiryId" filter yet, so we fetch the
          // detail page for the booking if we navigate there. Instead, we check via the
          // inquiry's booking relation when the booking exists (shown by navigating to it).
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
            {isManager && quotation.decision === 'ACCEPTED' && (
              <Button
                size="sm"
                icon={BookOpen}
                onClick={() => setBookingOpen(true)}
              >
                Create Booking
              </Button>
            )}
          </div>
        }
      />

      {downloadPdfError && (
        <p className="text-sm text-red-600 mb-4">{downloadPdfError}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — Quotation Preview */}
        <div className="lg:col-span-2">
          <QuotationPreview quotation={quotation} />
        </div>

        {/* Right — Controls + Summary */}
        <div className="flex flex-col gap-4">

          {/* Decision control */}
          <Card title="Customer Decision">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Decision:</span>
              <select
                value={quotation.decision}
                onChange={handleDecisionChange}
                disabled={decisionChanging}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
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
            <div className="mt-3">
              <StatusBadge value={quotation.decision} />
            </div>
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              ACCEPTED signals Module 4 to start the booking. Re-quoting (new price/charges) always
              creates a new quotation row — the history above is immutable.
            </p>
            {isManager && quotation.decision === 'ACCEPTED' && (
              <button
                onClick={() => setBookingOpen(true)}
                className="mt-3 w-full text-center text-xs text-primary font-medium hover:underline"
              >
                → Convert to Booking
              </button>
            )}
          </Card>

          {/* Quick summary */}
          <Card title="Summary">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Contact</dt>
                <dd className="font-medium text-gray-900">
                  {contact ? (
                    <Link
                      to={`/contacts/${contact.id}`}
                      className="text-primary hover:underline"
                    >
                      {contact.fullName}
                    </Link>
                  ) : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Inquiry</dt>
                <dd className="font-medium">
                  {inquiry ? (
                    <Link
                      to={`/inquiries/${inquiry.id}`}
                      className="text-primary hover:underline"
                    >
                      View Inquiry
                    </Link>
                  ) : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Unit</dt>
                <dd className="font-medium text-gray-900">Unit {unit?.unitNumber || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Project</dt>
                <dd className="font-medium text-gray-900">{unit?.project?.name || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Base Price</dt>
                <dd className="font-medium text-gray-900">{formatCurrency(quotation.basePrice)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Charges ({charges.length})</dt>
                <dd className="font-medium text-gray-900">
                  {formatCurrency(
                    charges.reduce((sum, c) => sum + Number(c.amount), 0)
                  )}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3">
                <dt className="font-semibold text-gray-900">Total</dt>
                <dd className="font-bold text-primary text-base">
                  {formatCurrency(quotation.totalAmount)}
                </dd>
              </div>
              {quotation.validUntil && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Valid Until</dt>
                  <dd className="font-medium text-amber-600">
                    {formatDate(quotation.validUntil)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Created By</dt>
                <dd className="font-medium text-gray-900">{createdBy?.fullName || '—'}</dd>
              </div>
            </dl>
          </Card>

          {/* Quotation ID */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-400">Quotation ID</p>
            <p className="text-xs font-mono text-gray-600 mt-0.5 break-all">{quotation.id}</p>
          </div>
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
