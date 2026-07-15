import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Plus, RefreshCw, CheckCircle, AlertCircle, Wallet, FileText, ShieldCheck, Building2, User, PhoneCall } from 'lucide-react';
import bookingService from '../../services/bookingService';
import bookingDocumentService from '../../services/bookingDocumentService';
import { useAuth } from '../../context/AuthContext';

import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import StatusBadge from '../../components/shared/StatusBadge';
import LoadingState from '../../components/shared/LoadingState';
import ErrorState from '../../components/shared/ErrorState';
import Modal from '../../components/shared/Modal';
import FormError from '../../components/shared/FormError';
import PaymentList from '../../components/shared/PaymentList';
import PaymentForm from '../../components/shared/PaymentForm';
import DocumentUploader from '../../components/shared/DocumentUploader';
import Card from '../../components/shared/Card';
import Textarea from '../../components/shared/Textarea';
import { RecordList, RecordRow } from '../../components/shared/RecordList';
import CopyIdChip from '../../components/shared/CopyIdChip';

import { showSuccess, showError, getErrorMessage } from '../../lib/toast';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import { getBookingFinancials, getPaymentHistory } from '../../utils/booking';

const SectionIcon = ({ icon: Icon }) => (
  <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary flex items-center justify-center flex-shrink-0">
    <Icon size={17} />
  </div>
);

const BookingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isManager = ['ADMIN', 'MANAGER'].includes(user?.role);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadError, setDownloadError] = useState('');

  // Payments
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Documents
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // ERP retry
  const [erpSyncing, setErpSyncing] = useState(false);
  const [erpMessage, setErpMessage] = useState('');

  // Cancellation
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Download
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const fetchBooking = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await bookingService.getBooking(id);
      setBooking(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDownloadReceipt = async () => {
    setDownloadingPdf(true);
    setDownloadError('');
    try {
      const blob = await bookingService.getReceiptBlob(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `booking-receipt-${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Failed to download receipt');
      showError('Failed to download receipt');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadPaymentReceipt = async (payment) => {
    try {
      const blob = await bookingService.getPaymentReceiptBlob(id, payment.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-receipt-${payment.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to download payment receipt'));
    }
  };

  const handleAddPayment = async (data) => {
    setPaymentSubmitting(true);
    setPaymentError('');
    try {
      await bookingService.addPayment(id, data);
      showSuccess('Payment recorded');
      setPaymentOpen(false);
      fetchBooking(); // Refresh to show new payment
    } catch (err) {
      setPaymentError(getErrorMessage(err, 'Failed to record payment'));
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleUploadDocument = async (file, type) => {
    setUploading(true);
    setUploadError('');
    try {
      await bookingDocumentService.uploadDocument(id, file, type);
      showSuccess('Document uploaded');
      fetchBooking();
    } catch (err) {
      setUploadError(getErrorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    try {
      await bookingDocumentService.deleteDocument(id, documentId);
      showSuccess('Document deleted');
      fetchBooking();
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to delete document'));
    }
  };

  const handleDownloadDocument = async (doc) => {
    try {
      const blob = await bookingDocumentService.downloadDocument(id, doc.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      // Revoke shortly after to allow the new tab to load the resource.
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to download document'));
    }
  };

  const handleRetryErpSync = async () => {
    setErpSyncing(true);
    setErpMessage('');
    try {
      await bookingService.retryErpSync(id);
      setErpMessage('ERP sync successful.');
      showSuccess('ERP sync successful');
      fetchBooking();
    } catch (err) {
      const message = getErrorMessage(err, 'ERP sync failed');
      setErpMessage(message);
      showError(message);
    } finally {
      setErpSyncing(false);
    }
  };

  const handleCancelBooking = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      await bookingService.cancelBooking(id, cancelReason);
      showSuccess('Booking cancelled');
      setCancelOpen(false);
      setCancelReason('');
      fetchBooking();
    } catch (err) {
      setCancelError(getErrorMessage(err, 'Failed to cancel booking'));
    } finally {
      setCancelling(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return <PageLayout><LoadingState label="Loading booking..." /></PageLayout>;
  if (error) return <PageLayout><ErrorState message={error} onRetry={fetchBooking} /></PageLayout>;
  if (!booking) return null;

  const { inquiry, quotation, unit, documents = [], bookedBy } = booking;
  const contact = inquiry?.contact;
  const paymentHistory = getPaymentHistory(booking);
  const { totalAmount, tokenAmount, totalPaid, remainingAmount } = getBookingFinancials(booking);

  return (
    <PageLayout>
      <PageHeader
        title={`Booking — ${contact?.fullName || '—'}`}
        subtitle={`Unit ${unit?.unitNumber || '—'} · ${unit?.project?.name || '—'} · ${formatDate(booking.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/bookings')}>
              Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              loading={downloadingPdf}
              onClick={handleDownloadReceipt}
            >
              Download Receipt
            </Button>
            {isManager && booking.status === 'CONFIRMED' && (
              <Button
                variant="dangerOutline"
                size="sm"
                icon={AlertCircle}
                onClick={() => { setCancelError(''); setCancelReason(''); setCancelOpen(true); }}
              >
                Cancel Booking
              </Button>
            )}
          </div>
        }
      />

      <FormError message={downloadError} className="mb-4" />

      {/* At-a-glance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Total Amount</p>
          <p className="text-lg font-bold text-primary mt-1.5 tabular-nums">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Paid Amount</p>
          <p className="text-lg font-bold text-success mt-1.5 tabular-nums">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Remaining</p>
          <p className={`text-lg font-bold mt-1.5 tabular-nums ${remainingAmount > 0 ? 'text-danger' : 'text-success'}`}>
            {remainingAmount > 0 ? formatCurrency(remainingAmount) : 'Fully Paid'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Status</p>
          <div className="mt-1.5"><StatusBadge value={booking.status} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Left column (2/3) ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Payments section */}
          <Card
            title={
              <div className="flex items-center gap-3">
                <SectionIcon icon={Wallet} />
                <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Payment History</h2>
              </div>
            }
            actions={isManager && (
              <Button size="sm" icon={Plus} onClick={() => setPaymentOpen(true)}>
                Add Payment
              </Button>
            )}
          >
            <PaymentList payments={paymentHistory} onDownload={handleDownloadPaymentReceipt} />
          </Card>

          {/* Documents section */}
          <Card
            title={
              <div className="flex items-center gap-3">
                <SectionIcon icon={FileText} />
                <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Booking Documents</h2>
              </div>
            }
          >
            <DocumentUploader
              documents={documents}
              onUpload={handleUploadDocument}
              onDelete={handleDeleteDocument}
              onDownload={handleDownloadDocument}
              uploading={uploading}
              uploadError={uploadError}
              canDelete={isManager}
            />
          </Card>
        </div>

        {/* ── Right column (1/3) — sticky rail so it stays visible while the left column scrolls ── */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">

          {/* Booking status card */}
          <Card
            title={
              <div className="flex items-center gap-3">
                <SectionIcon icon={ShieldCheck} />
                <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Booking Status</h2>
              </div>
            }
          >
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Booked On</dt>
                <dd className="font-medium text-gray-900">{formatDate(booking.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Booked By</dt>
                <dd className="font-medium text-gray-900">{bookedBy?.fullName || '—'}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-500">ERP Sync</dt>
                <dd>
                  {booking.erpSyncedAt ? (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle size={13} />
                      <span className="text-xs font-medium">Synced</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-amber-600">
                      <AlertCircle size={13} />
                      <span className="text-xs font-medium">Pending</span>
                    </div>
                  )}
                </dd>
              </div>
              {booking.erpSalesOrderRef && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Sales Order</dt>
                  <dd className="font-mono text-xs text-gray-700">{booking.erpSalesOrderRef}</dd>
                </div>
              )}
            </dl>

            {/* ERP retry — admin/manager only, only when not synced */}
            {isManager && !booking.erpSyncedAt && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  icon={RefreshCw}
                  loading={erpSyncing}
                  onClick={handleRetryErpSync}
                  className="w-full justify-center"
                >
                  Retry ERP Sync
                </Button>
                {erpMessage && (
                  <p className={`text-xs mt-2 text-center ${erpMessage.includes('success') ? 'text-emerald-600' : 'text-red-600'}`}>
                    {erpMessage}
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Financial summary — fields not already covered by the stat strip above */}
          <Card
            title={
              <div className="flex items-center gap-3">
                <SectionIcon icon={Wallet} />
                <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Financial Summary</h2>
              </div>
            }
          >
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Quoted Amount</dt>
                <dd className="font-medium text-gray-900">
                  {formatCurrency(quotation?.totalAmount)}
                </dd>
              </div>
              {Number(booking.discountAmount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Discount</dt>
                  <dd className="font-medium text-emerald-600">
                    − {formatCurrency(booking.discountAmount)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-100 pt-3">
                <dt className="text-gray-500">Token / Booking Amount</dt>
                <dd className="font-medium text-gray-900">
                  {formatCurrency(tokenAmount)}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Customer & Property */}
          <RecordList title="Customer & Property" icon={Building2}>
            <RecordRow
              to={contact ? `/contacts/${contact.id}` : undefined}
              icon={User}
              primary={contact?.fullName || '—'}
              secondary={contact?.phone}
            />
            <RecordRow
              icon={Building2}
              primary={`Unit ${unit?.unitNumber || '—'}`}
              secondary={[unit?.project?.name, unit?.project?.location].filter(Boolean).join(' · ') || undefined}
            />
            {inquiry && <RecordRow to={`/inquiries/${inquiry.id}`} icon={PhoneCall} primary="View Inquiry" />}
            {quotation && <RecordRow to={`/quotations/${quotation.id}`} icon={FileText} primary="View Quotation" />}
          </RecordList>

          {/* Booking ID */}
          <CopyIdChip label="Booking ID" value={booking.id} />
        </div>
      </div>

      {/* Add Payment Modal */}
      <Modal
        isOpen={paymentOpen}
        onClose={() => { setPaymentOpen(false); setPaymentError(''); }}
        title="Record Payment"
        size="md"
      >
        <PaymentForm
          onSubmit={handleAddPayment}
          onCancel={() => { setPaymentOpen(false); setPaymentError(''); }}
          submitting={paymentSubmitting}
          apiError={paymentError}
        />
      </Modal>

      {/* Cancel Booking Modal */}
      <Modal
        isOpen={cancelOpen}
        onClose={() => { setCancelOpen(false); setCancelError(''); }}
        title="Cancel Booking"
        size="md"
      >
        <div className="flex flex-col gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700">
            Cancelling this booking will release the unit back to <strong>Available</strong> and
            revert the inquiry to the <strong>Negotiation</strong> stage. This cannot be undone.
          </div>
          <Textarea
            label="Reason (optional)"
            name="cancelReason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            placeholder="e.g. Customer withdrew"
          />
          <FormError message={cancelError} />
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <Button variant="outline" onClick={() => { setCancelOpen(false); setCancelError(''); }}>
              Keep Booking
            </Button>
            <Button variant="danger" loading={cancelling} onClick={handleCancelBooking}>
              Cancel Booking
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
};

export default BookingDetailPage;
