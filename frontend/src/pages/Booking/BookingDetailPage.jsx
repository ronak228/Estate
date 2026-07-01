import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, Plus, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import bookingService from '../../services/bookingService';
import bookingDocumentService from '../../services/bookingDocumentService';
import negotiationService from '../../services/negotiationService';
import { useAuth } from '../../context/AuthContext';

import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import StatusBadge from '../../components/shared/StatusBadge';
import LoadingState from '../../components/shared/LoadingState';
import ErrorState from '../../components/shared/ErrorState';
import Modal from '../../components/shared/Modal';
import NegotiationHistory from '../../components/shared/NegotiationHistory';
import PaymentList from '../../components/shared/PaymentList';
import PaymentForm from '../../components/shared/PaymentForm';
import DocumentUploader from '../../components/shared/DocumentUploader';

import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';

const BookingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isManager = ['ADMIN', 'MANAGER'].includes(user?.role);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Negotiation history (fetched by inquiryId)
  const [negotiations, setNegotiations] = useState([]);

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

  // Download
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const fetchBooking = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await bookingService.getBooking(id);
      setBooking(data);

      // Fetch negotiation history for this inquiry
      if (data.inquiry?.id) {
        try {
          const negs = await negotiationService.listNegotiations(data.inquiry.id);
          setNegotiations(negs);
        } catch {
          // Non-blocking — negotiation history is supplementary
        }
      }
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
    try {
      const blob = await bookingService.getReceiptBlob(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `booking-receipt-${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download receipt');
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

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return <PageLayout><LoadingState label="Loading booking..." /></PageLayout>;
  if (error) return <PageLayout><ErrorState message={error} onRetry={fetchBooking} /></PageLayout>;
  if (!booking) return null;

  const { inquiry, quotation, unit, payments = [], documents = [], bookedBy } = booking;
  const contact = inquiry?.contact;

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
          </div>
        }
      />

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
            <PaymentList payments={payments} />
          </div>

          {/* Documents section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Booking Documents</h2>
            <DocumentUploader
              documents={documents}
              onUpload={handleUploadDocument}
              onDelete={handleDeleteDocument}
              uploading={uploading}
              uploadError={uploadError}
              canDelete={isManager}
            />
          </div>

          {/* Negotiation history */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Negotiation History</h2>
            <NegotiationHistory negotiations={negotiations} />
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
                <dt className="font-semibold text-gray-900">Final Amount</dt>
                <dd className="font-bold text-primary text-base">
                  {formatCurrency(booking.finalAmount)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Token / Booking Amount</dt>
                <dd className="font-medium text-gray-900">
                  {formatCurrency(booking.bookingAmount)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3">
                <dt className="text-gray-500">Total Paid</dt>
                <dd className="font-semibold text-gray-900">
                  {formatCurrency(payments.reduce((sum, p) => sum + Number(p.amount), 0))}
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
    </PageLayout>
  );
};

export default BookingDetailPage;
