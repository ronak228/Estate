import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, Plus, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
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
import PaymentList from '../../components/shared/PaymentList';
import PaymentForm from '../../components/shared/PaymentForm';
import DocumentUploader from '../../components/shared/DocumentUploader';

import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import { getBookingFinancials, getPaymentHistory } from '../../utils/booking';

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
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleAddPayment = async (data) => {
    setPaymentSubmitting(true);
    setPaymentError('');
    try {
      await bookingService.addPayment(id, data);
      setPaymentOpen(false);
      fetchBooking(); // Refresh to show new payment
    } catch (err) {
      setPaymentError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleUploadDocument = async (file, type) => {
    setUploading(true);
    setUploadError('');
    try {
      await bookingDocumentService.uploadDocument(id, file, type);
      fetchBooking();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    await bookingDocumentService.deleteDocument(id, documentId);
    fetchBooking();
  };

  const handleDownloadDocument = async (doc) => {
    const blob = await bookingDocumentService.downloadDocument(id, doc.id);
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    // Revoke shortly after to allow the new tab to load the resource.
    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  };

  const handleRetryErpSync = async () => {
    setErpSyncing(true);
    setErpMessage('');
    try {
      const result = await bookingService.retryErpSync(id);
      setErpMessage('ERP sync successful.');
      fetchBooking();
    } catch (err) {
      setErpMessage(err.response?.data?.message || 'ERP sync failed');
    } finally {
      setErpSyncing(false);
    }
  };

  const handleCancelBooking = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      await bookingService.cancelBooking(id, cancelReason);
      setCancelOpen(false);
      setCancelReason('');
      fetchBooking();
    } catch (err) {
      setCancelError(err.response?.data?.message || 'Failed to cancel booking');
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
                variant="outline"
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

      {downloadError && (
        <p className="text-sm text-red-600 mb-4">{downloadError}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column (2/3) ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Payments section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Payment History</h2>
              {isManager && (
                <Button size="sm" icon={Plus} onClick={() => setPaymentOpen(true)}>
                  Add Payment
                </Button>
              )}
            </div>
            <PaymentList payments={paymentHistory} />
          </div>

          {/* Documents section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Booking Documents</h2>
            <DocumentUploader
              documents={documents}
              onUpload={handleUploadDocument}
              onDelete={handleDeleteDocument}
              onDownload={handleDownloadDocument}
              uploading={uploading}
              uploadError={uploadError}
              canDelete={isManager}
            />
          </div>
        </div>

        {/* ── Right column (1/3) ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Booking status card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Booking Status</h2>
              <StatusBadge value={booking.status} />
            </div>

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
          </div>

          {/* Financial summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Financial Summary</h2>
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
                <dt className="font-semibold text-gray-900">Total Amount</dt>
                <dd className="font-bold text-primary text-base">
                  {formatCurrency(totalAmount)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Token / Booking Amount</dt>
                <dd className="font-medium text-gray-900">
                  {formatCurrency(tokenAmount)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3">
                <dt className="text-gray-500">Paid Amount</dt>
                <dd className="font-semibold text-emerald-600">
                  {formatCurrency(totalPaid)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3">
                <dt className="font-semibold text-gray-900">Remaining Amount</dt>
                <dd className={`font-bold text-base ${remainingAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {remainingAmount > 0 ? formatCurrency(remainingAmount) : 'Fully Paid'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Customer & Property */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Customer & Property</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Customer</dt>
                <dd className="font-medium text-gray-900">
                  {contact ? (
                    <Link to={`/contacts/${contact.id}`} className="text-primary hover:underline">
                      {contact.fullName}
                    </Link>
                  ) : '—'}
                </dd>
                {contact?.phone && (
                  <dd className="text-xs text-gray-500 mt-0.5">{contact.phone}</dd>
                )}
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Property</dt>
                <dd className="font-medium text-gray-900">
                  Unit {unit?.unitNumber || '—'}
                </dd>
                <dd className="text-xs text-gray-500 mt-0.5">
                  {unit?.project?.name}
                  {unit?.project?.location ? ` · ${unit.project.location}` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Inquiry</dt>
                <dd>
                  {inquiry ? (
                    <Link to={`/inquiries/${inquiry.id}`} className="text-sm text-primary hover:underline">
                      View Inquiry
                    </Link>
                  ) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 mb-0.5">Quotation</dt>
                <dd>
                  {quotation ? (
                    <Link to={`/quotations/${quotation.id}`} className="text-sm text-primary hover:underline">
                      View Quotation
                    </Link>
                  ) : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Booking ID */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-400">Booking ID</p>
            <p className="text-xs font-mono text-gray-600 mt-0.5 break-all">{booking.id}</p>
          </div>
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
          <div className="flex flex-col gap-1">
            <label htmlFor="cancelReason" className="text-sm font-medium text-gray-700">
              Reason (optional)
            </label>
            <textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g. Customer withdrew"
            />
          </div>
          {cancelError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {cancelError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <Button variant="ghost" onClick={() => { setCancelOpen(false); setCancelError(''); }}>
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
